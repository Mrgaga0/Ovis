import { openDB, IDBPDatabase } from 'idb'
import { EventEmitter } from 'events'
import { localDataStore } from '../storage/LocalDataStore'
import { MergeUtils, MergeStrategy, IMergeConflict } from '../storage/MergeUtils'
import { NetworkMonitor, NetworkEventType, NetworkQuality } from '../monitoring/network'
import { DataSyncManager } from './DataSyncManager'

// 동기화 상태 열거형
export enum SyncState {
  IDLE = 'idle',
  SYNCING = 'syncing',
  OFFLINE = 'offline',
  ERROR = 'error',
  CONFLICT = 'conflict'
}

// 동기화 작업 유형
export enum SyncOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

// 동기화 이벤트 유형
export enum SyncEventType {
  STATE_CHANGED = 'state_changed',
  SYNC_STARTED = 'sync_started',
  SYNC_COMPLETED = 'sync_completed',
  SYNC_FAILED = 'sync_failed',
  ITEM_SYNCED = 'item_synced',
  CONFLICT_DETECTED = 'conflict_detected',
  OFFLINE_CHANGE = 'offline_change',
  ONLINE_STATUS_CHANGED = 'online_status_changed'
}

// 동기화 항목 인터페이스
export interface ISyncItem {
  id: string
  type: SyncOperationType
  collection: string
  itemId: string
  data: any
  timestamp: number
  deviceId: string
  retryCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict'
  error?: string
  baseRevision?: string
}

// 동기화 옵션 인터페이스
export interface ISyncOptions {
  apiEndpoint?: string
  autoSync?: boolean
  syncInterval?: number
  maxRetries?: number
  deviceId?: string
  batchSize?: number
  defaultMergeStrategy?: MergeStrategy
  offlineSupport?: boolean
  userInteractionForConflicts?: boolean
  retryDelay?: number
}

// 동기화 행동 조정 옵션 인터페이스
export interface ISyncBehaviorOptions {
  syncInterval?: number
  batchSize?: number
  retryDelay?: number
  maxRetries?: number
}

// 동기화 응답 인터페이스
export interface ISyncResponse {
  success: boolean
  itemId?: string
  revision?: string
  conflicts?: Array<IMergeConflict<any>>
  error?: string
}

/**
 * 동기화 매니저 클래스
 * 
 * 온/오프라인 동기화, 충돌 해결, 백그라운드 동기화를 담당합니다.
 */
export class SyncManager extends EventEmitter {
  private static instance: SyncManager
  
  private db: IDBPDatabase | null = null
  private syncItems: Map<string, ISyncItem> = new Map()
  private state: SyncState = SyncState.IDLE
  private isOnline: boolean = true
  private isSyncing: boolean = false
  private syncIntervalId: ReturnType<typeof setInterval> | null = null
  private pendingConflicts: Map<string, IMergeConflict<any>> = new Map()
  private networkConnected: boolean = true
  private lastSyncTime: number = 0
  private connectionWatcher: ReturnType<typeof setInterval> | null = null
  
  // 설정
  private options: Required<ISyncOptions>
  
  /**
   * 생성자
   */
  private constructor(options: ISyncOptions = {}) {
    super()
    
    // 기본 설정
    this.options = {
      apiEndpoint: options.apiEndpoint || '/api/sync',
      autoSync: options.autoSync !== undefined ? options.autoSync : true,
      syncInterval: options.syncInterval || 30000, // 30초
      maxRetries: options.maxRetries || 3,
      deviceId: options.deviceId || this.generateDeviceId(),
      batchSize: options.batchSize || 10,
      defaultMergeStrategy: options.defaultMergeStrategy || 'last-write-wins',
      offlineSupport: options.offlineSupport !== undefined ? options.offlineSupport : true,
      userInteractionForConflicts: options.userInteractionForConflicts || false,
      retryDelay: options.retryDelay || 5000, // 5초
    }
    
    this.init().catch(err => console.error('SyncManager 초기화 오류:', err))
  }
  
  /**
   * 싱글톤 인스턴스를 반환합니다.
   */
  public static getInstance(options?: ISyncOptions): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager(options)
    }
    return SyncManager.instance
  }
  
  /**
   * 초기화
   */
  private async init() {
    // IndexedDB 초기화
    this.db = await openDB('ovis-sync', 2, {
      upgrade(db, oldVersion, newVersion) {
        // 이미 존재하는 경우 무시
        if (!db.objectStoreNames.contains('sync-items')) {
          db.createObjectStore('sync-items', { keyPath: 'id' })
        }
        
        // 메타데이터 저장소 생성
        if (!db.objectStoreNames.contains('sync-metadata')) {
          db.createObjectStore('sync-metadata', { keyPath: 'id' })
        }
      },
    })
    
    // 저장된 동기화 항목 로드
    await this.loadSyncItems()
    
    // 브라우저 환경인 경우
    if (typeof window !== 'undefined') {
      // 온라인 상태 모니터링
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))
      
      // 현재 온라인 상태 확인
      this.isOnline = navigator.onLine
      this.networkConnected = navigator.onLine
      
      // 연결 상태 주기적 확인 (API 서버 연결 상태 확인)
      this.connectionWatcher = setInterval(async () => {
        await this.checkNetworkConnection()
      }, 60000) // 1분마다 확인
    }
    
    // 폐이지 언로드 이벤트 리스너 등록 (동기화 보장)
    if (typeof window !== 'undefined' && this.options.offlineSupport) {
      window.addEventListener('beforeunload', () => {
        if (this.syncItems.size > 0 && this.isOnline) {
          this.forceSyncBeforeUnload()
        }
      })
    }
    
    // 자동 동기화 시작
    if (this.options.autoSync) {
      this.startAutoSync()
    }
    
    // 초기 상태 설정
    this.updateState(this.isOnline ? SyncState.IDLE : SyncState.OFFLINE)
    
    // 최초 동기화 시도
    if (this.isOnline && this.syncItems.size > 0) {
      this.sync()
    }
  }
  
  /**
   * 자동 동기화 시작
   */
  public startAutoSync(): void {
    if (this.syncIntervalId) {
      return
    }
    
    this.syncIntervalId = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.syncItems.size > 0) {
        this.sync()
      }
    }, this.options.syncInterval)
  }
  
  /**
   * 자동 동기화 중지
   */
  public stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
    }
  }
  
  /**
   * 네트워크 연결 상태 확인
   */
  private async checkNetworkConnection(): Promise<void> {
    // 이미 오프라인으로 감지된 경우 건너뛰기
    if (!navigator.onLine) {
      if (this.networkConnected) {
        this.networkConnected = false
        this.handleOffline()
      }
      return
    }
    
    try {
      // API 서버 핑 시도
      const pingUrl = `${this.options.apiEndpoint}/ping`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      
      clearTimeout(timeoutId)
      
      // 상태 코드 확인 (2xx 성공)
      const connected = response.ok
      
      if (connected !== this.networkConnected) {
        this.networkConnected = connected
        if (connected) {
          this.handleOnline()
        } else {
          this.handleOffline()
        }
      }
      } catch (error) {
      // 요청 실패 = 연결 없음
      if (this.networkConnected) {
        this.networkConnected = false
        this.handleOffline()
      }
    }
  }
  
  /**
   * 온라인 상태 처리
   */
  public handleOnline(): void {
    if (!this.isOnline) {
      this.isOnline = true
      this.updateState(SyncState.IDLE)
      this.emit(SyncEventType.ONLINE_STATUS_CHANGED, { online: true })
      
      // 오프라인 상태에서 쌓인 작업 동기화
      if (this.syncItems.size > 0) {
        this.sync()
      }
      
      // 로컬 데이터베이스 상태 변경
      this.updateConnectivityStatus(true)
    }
  }
  
  /**
   * 오프라인 상태 처리
   */
  public handleOffline(): void {
    if (this.isOnline) {
      this.isOnline = false
      this.updateState(SyncState.OFFLINE)
      this.emit(SyncEventType.ONLINE_STATUS_CHANGED, { online: false })
      
      // 진행 중인 동기화 작업 중단
      if (this.isSyncing) {
        this.cancelCurrentSync()
      }
      
      // 로컬 데이터베이스 상태 변경
      this.updateConnectivityStatus(false)
    }
  }
  
  /**
   * 연결 상태를 DB에 저장
   */
  private async updateConnectivityStatus(online: boolean): Promise<void> {
    if (!this.db) return
    
    try {
      const metadata = {
        id: 'connectivity',
        online,
        timestamp: Date.now()
      }
      
      await this.db.put('sync-metadata', metadata)
      } catch (error) {
      console.error('연결 상태 저장 오류:', error)
    }
  }
  
  /**
   * 강제 동기화 (페이지 언로드 전)
   */
  private forceSyncBeforeUnload(): void {
    // 비동기 작업을 동기적으로 처리하기 위한 비콘 API 사용
    const pendingItems = Array.from(this.syncItems.values())
      .filter(item => item.status === 'pending')
    
    if (pendingItems.length === 0) return
    
    const data = JSON.stringify(pendingItems)
    
    // 비콘 API 사용하여 데이터 전송 (차단 없이 진행)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        `${this.options.apiEndpoint}/batch`,
        new Blob([data], { type: 'application/json' })
      )
    }
  }
  
  /**
   * 진행 중인 동기화 작업 취소
   */
  private cancelCurrentSync(): void {
    // 현재 처리 중인 작업의 상태를 pending으로 복원
    const entries = Array.from(this.syncItems.entries())
    
    for (const [id, item] of entries) {
      if (item.status === 'processing') {
        item.status = 'pending'
        this.syncItems.set(id, item)
      }
    }
    
    this.isSyncing = false
    this.saveSyncItems()
  }
  
  /**
   * 상태 업데이트
   */
  private updateState(newState: SyncState): void {
    const oldState = this.state
    this.state = newState
    
    if (oldState !== newState) {
      this.emit(SyncEventType.STATE_CHANGED, { 
        previous: oldState, 
        current: newState 
      })
    }
  }
  
  /**
   * 동기화 항목 로드
   */
  private async loadSyncItems(): Promise<void> {
    if (!this.db) return
    
    try {
      const tx = this.db.transaction('sync-items', 'readonly')
      const store = tx.objectStore('sync-items')
      const items = await store.getAll()
      
      this.syncItems.clear()
      for (const item of items) {
        this.syncItems.set(item.id, item)
      }
      
      await tx.done
    } catch (error) {
      console.error('동기화 항목 로드 실패:', error)
      this.syncItems.clear()
    }
  }
  
  /**
   * 동기화 항목 저장
   */
  private async saveSyncItems(): Promise<void> {
    if (!this.db) return
    
    try {
      const tx = this.db.transaction('sync-items', 'readwrite')
      const store = tx.objectStore('sync-items')
      
      // 모든 기존 항목 삭제 후 새로 저장
      await store.clear()
      
      const items = Array.from(this.syncItems.values())
      for (const item of items) {
        await store.add(item)
      }
      
      await tx.done
    } catch (error) {
      console.error('동기화 항목 저장 실패:', error)
    }
  }
  
  /**
   * 동기화 항목 추가
   */
  public async addSyncItem(
    type: SyncOperationType,
    collection: string,
    itemId: string,
    data: any,
    baseRevision?: string
  ): Promise<string> {
    const id = this.generateSyncItemId()
    const item: ISyncItem = {
      id,
      type,
      collection,
      itemId,
      data,
      timestamp: Date.now(),
      deviceId: this.options.deviceId,
      retryCount: 0,
      status: 'pending',
      baseRevision
    }
    
    this.syncItems.set(id, item)
    await this.saveSyncItems()
    
    // 이벤트 발생
    this.emit(SyncEventType.OFFLINE_CHANGE, {
      type,
      collection,
      itemId,
      timestamp: item.timestamp
    })
    
    // 온라인 상태면 즉시, 아니면 연결 복구 시 동기화
    if (this.isOnline && !this.isSyncing) {
      this.sync()
    }
    
    return id
  }
  
  /**
   * 동기화 항목 ID 생성
   */
  private generateSyncItemId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
  
  /**
   * 장치 ID 생성
   */
  private generateDeviceId(): string {
    // 기존 ID 확인
    if (typeof localStorage !== 'undefined') {
      const existingId = localStorage.getItem('ovis_device_id')
      if (existingId) return existingId
    }
    
    // 새 ID 생성
    const id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
    
    // 로컬 스토리지에 저장
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ovis_device_id', id)
    }
    
    return id
  }
  
  /**
   * 데이터 생성 요청
   */
  public async create(collection: string, data: any): Promise<string> {
    const itemId = data.id || this.generateId()
    await this.addSyncItem(SyncOperationType.CREATE, collection, itemId, data)
    return itemId
  }
  
  /**
   * 데이터 업데이트 요청
   */
  public async update(collection: string, itemId: string, data: any, baseRevision?: string): Promise<string> {
    await this.addSyncItem(SyncOperationType.UPDATE, collection, itemId, data, baseRevision)
    return itemId
  }
  
  /**
   * 데이터 삭제 요청
   */
  public async delete(collection: string, itemId: string): Promise<string> {
    await this.addSyncItem(SyncOperationType.DELETE, collection, itemId, {})
    return itemId
  }
  
  /**
   * 고유 ID 생성
   */
  private generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
  }
  
  /**
   * 동기화 실행
   */
  public async sync(): Promise<boolean> {
    // 동기화 중인 경우 또는 오프라인인 경우 무시
    if (this.isSyncing || !this.isOnline) {
      return false
    }
    
    // 동기화할 항목이 없는 경우 성공으로 처리
    if (this.syncItems.size === 0) {
      return true
    }
    
    this.isSyncing = true
    this.updateState(SyncState.SYNCING)
    this.emit(SyncEventType.SYNC_STARTED, { timestamp: Date.now() })
    
    try {
      // 동기화할 항목들을 가져옴
      const pendingItems = Array.from(this.syncItems.values())
        .filter(item => item.status === 'pending')
      
      if (pendingItems.length === 0) {
        this.isSyncing = false
        this.updateState(SyncState.IDLE)
        this.emit(SyncEventType.SYNC_COMPLETED, { timestamp: Date.now(), itemCount: 0 })
        return true
      }
      
      // 배치 단위로 처리
      const batches = this.createBatches(pendingItems, this.options.batchSize)
      let allSuccess = true
      let processedCount = 0
      
      for (const batch of batches) {
        const batchSuccess = await this.processBatch(batch)
        if (!batchSuccess) {
          allSuccess = false
        }
        processedCount += batch.length
      }
      
      // 동기화 완료 후 상태 업데이트
      this.lastSyncTime = Date.now()
      this.isSyncing = false
      
      if (this.pendingConflicts.size > 0) {
        this.updateState(SyncState.CONFLICT)
      } else {
        this.updateState(SyncState.IDLE)
      }
      
      this.emit(SyncEventType.SYNC_COMPLETED, {
        timestamp: this.lastSyncTime,
        itemCount: processedCount,
        success: allSuccess
      })
      
      return allSuccess
    } catch (error) {
      this.isSyncing = false
      this.updateState(SyncState.ERROR)
      
      this.emit(SyncEventType.SYNC_FAILED, {
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      })
      
      return false
    }
  }
  
  /**
   * 배치 처리
   */
  private async processBatch(batch: ISyncItem[]): Promise<boolean> {
    try {
      // 배치 내 항목들을 처리 중으로 표시
      for (const item of batch) {
        item.status = 'processing'
        this.syncItems.set(item.id, item)
      }
      
      // 상태 저장
      await this.saveSyncItems()
      
      // 서버로 배치 전송
      const responses = await this.sendBatchToServer(batch)
      
      // 배치 내 각 항목의 응답 처리
      let allSuccess = true
      
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i]
        const response = responses[i]
        
        if (response.success) {
          // 성공한 경우 항목 제거
          this.syncItems.delete(item.id)
          
          // 항목 동기화 완료 이벤트 발생
          this.emit(SyncEventType.ITEM_SYNCED, {
            itemId: item.itemId,
            collection: item.collection,
            type: item.type,
            timestamp: Date.now()
          })
        } else if (response.conflicts && response.conflicts.length > 0) {
          // 충돌이 있는 경우
          item.status = 'conflict'
          this.syncItems.set(item.id, item)
          
          // 충돌 정보 저장
          for (const conflict of response.conflicts) {
            const conflictId = `${item.collection}:${item.itemId}`
            this.pendingConflicts.set(conflictId, conflict)
            
            // 충돌 이벤트 발생
            this.emit(SyncEventType.CONFLICT_DETECTED, {
              itemId: item.itemId,
              collection: item.collection,
              conflict
            })
          }
          
          // 자동 충돌 해결 시도
          if (!this.options.userInteractionForConflicts) {
            await this.resolveConflict(
              item.collection,
              item.itemId,
              this.options.defaultMergeStrategy === 'last-write-wins' ? 'local' : 'remote'
            )
          }
          
          allSuccess = false
        } else {
          // 실패한 경우
          item.retryCount++
          
          if (item.retryCount < this.options.maxRetries) {
            // 재시도 횟수가 남아있는 경우
            item.status = 'pending'
            item.error = response.error
            this.syncItems.set(item.id, item)
          } else {
            // 재시도 횟수 초과
            item.status = 'failed'
            item.error = response.error
            this.syncItems.set(item.id, item)
            
            // 실패 이벤트 발생
            this.emit(SyncEventType.SYNC_FAILED, {
              itemId: item.itemId,
              collection: item.collection,
              error: response.error,
              timestamp: Date.now()
            })
          }
          
          allSuccess = false
        }
      }
      
      // 상태 저장
      await this.saveSyncItems()
      
      return allSuccess
    } catch (error) {
      // 전체 배치 실패
      for (const item of batch) {
        item.retryCount++
        
        if (item.retryCount < this.options.maxRetries) {
          item.status = 'pending'
        } else {
          item.status = 'failed'
        }
        
        item.error = error instanceof Error ? error.message : String(error)
        this.syncItems.set(item.id, item)
      }
      
      // 상태 저장
      await this.saveSyncItems()
      
      return false
    }
  }
  
  /**
   * 서버로 배치 전송
   */
  private async sendBatchToServer(batch: ISyncItem[]): Promise<ISyncResponse[]> {
    const response = await fetch(`${this.options.apiEndpoint}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': this.options.deviceId
      },
      body: JSON.stringify(batch)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`서버 응답 오류 (${response.status}): ${errorText}`)
    }
    
    return await response.json()
  }
  
  /**
   * 충돌 해결
   */
  public async resolveConflict(
    collection: string,
    itemId: string,
    resolution: 'local' | 'remote' | 'custom',
    customData?: any
  ): Promise<boolean> {
    const conflictId = `${collection}:${itemId}`
    const conflict = this.pendingConflicts.get(conflictId)
    
    if (!conflict) {
      return false
    }
    
    // 충돌 해결
    let resolvedData
    
    if (resolution === 'local') {
      resolvedData = conflict.local
    } else if (resolution === 'remote') {
      resolvedData = conflict.remote
    } else if (resolution === 'custom' && customData) {
      resolvedData = customData
    } else {
      return false
    }
    
    // 해결된 충돌로 업데이트 동기화 항목 생성
    const syncItemId = await this.addSyncItem(
      SyncOperationType.UPDATE,
      collection,
      itemId,
      resolvedData,
      conflict.base ? JSON.stringify(conflict.base) : undefined
    )
    
    // 충돌 상태의 기존 항목 삭제
    const entries = Array.from(this.syncItems.entries())
    for (const [id, item] of entries) {
      if (item.collection === collection && 
          item.itemId === itemId && 
          item.status === 'conflict') {
        this.syncItems.delete(id)
      }
    }
    
    // 충돌 목록에서 제거
    this.pendingConflicts.delete(conflictId)
    
    // 상태 저장
    await this.saveSyncItems()
    
    // 충돌이 모두 해결되었으면 상태 업데이트
    if (this.pendingConflicts.size === 0) {
      this.updateState(SyncState.IDLE)
    }
    
    // 즉시 동기화 시도
    if (this.isOnline && !this.isSyncing) {
      this.sync()
    }
    
    return true
  }
  
  /**
   * 배치 생성
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }
  
  /**
   * 현재 상태 조회
   */
  public getState(): SyncState {
    return this.state
  }
  
  /**
   * 온라인 상태 조회
   */
  public isNetworkOnline(): boolean {
    return this.isOnline
  }
  
  /**
   * 동기화 대기 항목 수 조회
   */
  public getPendingItemsCount(): number {
    return Array.from(this.syncItems.values()).filter(
      item => item.status === 'pending'
    ).length
  }
  
  /**
   * 실패한 항목 수 조회
   */
  public getFailedItemsCount(): number {
    return Array.from(this.syncItems.values()).filter(
      item => item.status === 'failed'
    ).length
  }
  
  /**
   * 충돌 항목 수 조회
   */
  public getConflictsCount(): number {
    return this.pendingConflicts.size
  }
  
  /**
   * 마지막 동기화 시간 조회
   */
  public getLastSyncTime(): number {
    return this.lastSyncTime
  }
  
  /**
   * 대기 중인 동기화 항목 조회
   */
  public getPendingItems(): ISyncItem[] {
    return Array.from(this.syncItems.values()).filter(
      item => item.status === 'pending'
    )
  }
  
  /**
   * 충돌 항목 조회
   */
  public getConflicts(): Map<string, IMergeConflict<any>> {
    return new Map(this.pendingConflicts)
  }
  
  /**
   * 동기화 행동 조정
   * 네트워크 상태에 따라 동기화 옵션을 동적으로 조정합니다.
   */
  public adjustSyncBehavior(options: ISyncBehaviorOptions): void {
    if (options.syncInterval !== undefined) {
      this.options.syncInterval = options.syncInterval;
      
      // 실행 중인 자동 동기화가 있으면 재시작
      if (this.syncIntervalId) {
        this.stopAutoSync();
        this.startAutoSync();
      }
    }
    
    if (options.batchSize !== undefined) {
      this.options.batchSize = options.batchSize;
    }
    
    if (options.retryDelay !== undefined) {
      this.options.retryDelay = options.retryDelay;
    }
    
    if (options.maxRetries !== undefined) {
      this.options.maxRetries = options.maxRetries;
    }
  }
  
  /**
   * 내부 데이터 초기화
   */
  public async reset(): Promise<void> {
    if (!this.db) return
    
    this.syncItems.clear()
    this.pendingConflicts.clear()
    
    try {
      const tx = this.db.transaction('sync-items', 'readwrite')
      await tx.objectStore('sync-items').clear()
      await tx.done
    } catch (error) {
      console.error('동기화 항목 초기화 오류:', error)
    }
    
    this.lastSyncTime = 0
    this.updateState(SyncState.IDLE)
  }
  
  /**
   * 리소스 정리
   */
  public destroy(): void {
    // 이벤트 리스너 해제
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this))
      window.removeEventListener('offline', this.handleOffline.bind(this))
      window.removeEventListener('beforeunload', this.forceSyncBeforeUnload.bind(this))
    }
    
    // 자동 동기화 중지
    this.stopAutoSync()
    
    // 연결 상태 모니터링 중지
    if (this.connectionWatcher) {
      clearInterval(this.connectionWatcher)
      this.connectionWatcher = null
    }
    
    // 모든 이벤트 리스너 제거
    this.removeAllListeners()
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const syncManager = SyncManager.getInstance();
export const dataSyncManager = DataSyncManager.getInstance();

// SyncManager를 NetworkMonitor와 연결하는 기능
export const connectSyncManagerToNetwork = (): void => {
  const networkMonitorInstance = NetworkMonitor.getInstance();

  // 네트워크 상태 변경 이벤트 구독
  networkMonitorInstance.on(NetworkEventType.ONLINE, () => {
    console.log('🌐 Network connection restored, resuming sync operations');
    syncManager.handleOnline();
  });

  networkMonitorInstance.on(NetworkEventType.OFFLINE, () => {
    console.log('⚠️ Network connection lost, pausing sync operations');
    syncManager.handleOffline();
  });

  // 네트워크 품질 변경 이벤트 구독
  networkMonitorInstance.on(NetworkEventType.CONNECTION_QUALITY_CHANGED, (data: { quality: NetworkQuality, timestamp: number }) => {
    if (data.quality === NetworkQuality.POOR || data.quality === NetworkQuality.UNUSABLE) {
      // 네트워크 품질이 좋지 않을 때 동기화 빈도 줄이기
      syncManager.adjustSyncBehavior({ 
        syncInterval: 60000, // 1분으로 늘림
        batchSize: 5 // 배치 크기 줄임
      });
    } else if (data.quality === NetworkQuality.EXCELLENT || data.quality === NetworkQuality.GOOD) {
      // 네트워크 품질이 좋을 때 동기화 빈도 정상화
      syncManager.adjustSyncBehavior({ 
        syncInterval: 30000, // 30초로 복원
        batchSize: 10 // 기본 배치 크기
      });
    }
  });

  // 초기 네트워크 상태 확인 및 적용
  const networkStatus = networkMonitorInstance.getNetworkStatus();
  if (!networkStatus.online) {
    syncManager.handleOffline();
  }

  // 네트워크 모니터링 시작
  networkMonitorInstance.startMonitoring();
}; 