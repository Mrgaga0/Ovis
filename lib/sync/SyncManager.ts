import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { localDataStore, LocalDataStore } from '../storage/LocalDataStore';
import { MergeUtils, MergeStrategy, IMergeConflict } from '../storage/MergeUtils';

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

// 동기화 작업 인터페이스
export interface ISyncOperation {
  id: string;
  type: SyncOperationType;
  collection: string;
  itemId: string;
  data: any;
  timestamp: number;
  deviceId: string;
  retryCount: number;
  baseRevision?: string;
}

// 동기화 응답 인터페이스
export interface ISyncResponse {
  success: boolean;
  itemId?: string;
  revision?: string;
  conflicts?: Array<IMergeConflict<any>>;
  error?: string;
}

// 동기화 관리자 옵션 인터페이스
export interface ISyncManagerOptions {
  apiEndpoint?: string;
  autoSync?: boolean;
  syncInterval?: number;
  maxRetries?: number;
  deviceId?: string;
  batchSize?: number;
  defaultMergeStrategy?: MergeStrategy;
  offlineSupport?: boolean;
  userInteractionForConflicts?: boolean;
}

/**
 * 동기화 관리자
 * 
 * 오프라인 상태 처리, 데이터 동기화 큐 및 충돌 해결을 구현합니다.
 */
export class SyncManager extends EventEmitter {
  private static instance: SyncManager;
  
  private dataStore: LocalDataStore;
  private syncQueue: ISyncOperation[] = [];
  private state: SyncState = SyncState.IDLE;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private pendingConflicts: Map<string, IMergeConflict<any>> = new Map();
  
  // 설정
  private apiEndpoint: string;
  private autoSync: boolean;
  private syncInterval: number;
  private maxRetries: number;
  private deviceId: string;
  private batchSize: number;
  private defaultMergeStrategy: MergeStrategy;
  private offlineSupport: boolean;
  private userInteractionForConflicts: boolean;
  
  /**
   * 생성자
   */
  private constructor(options: ISyncManagerOptions = {}) {
    super();
    
    // 기본 설정
    this.apiEndpoint = options.apiEndpoint || '/api/sync';
    this.autoSync = options.autoSync !== undefined ? options.autoSync : true;
    this.syncInterval = options.syncInterval || 30000; // 30초
    this.maxRetries = options.maxRetries || 3;
    this.deviceId = options.deviceId || this.generateDeviceId();
    this.batchSize = options.batchSize || 10;
    this.defaultMergeStrategy = options.defaultMergeStrategy || 'last-write-wins';
    this.offlineSupport = options.offlineSupport !== undefined ? options.offlineSupport : true;
    this.userInteractionForConflicts = options.userInteractionForConflicts || false;
    
    this.dataStore = localDataStore;
    
    this.initialize();
  }
  
  /**
   * 싱글톤 인스턴스를 반환합니다.
   */
  public static getInstance(options?: ISyncManagerOptions): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager(options);
    }
    return SyncManager.instance;
  }
  
  /**
   * 초기화
   */
  private async initialize(): Promise<void> {
    // 브라우저 환경인 경우
    if (typeof window !== 'undefined') {
      // 온라인 상태 모니터링
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // 현재 온라인 상태 확인
      this.isOnline = navigator.onLine;
    }
    
    // 로컬 저장소 초기화
    await this.dataStore.initialize();
    
    // 저장된 동기화 큐 로드
    await this.loadSyncQueue();
    
    // 자동 동기화 시작
    if (this.autoSync) {
      this.startAutoSync();
    }
    
    // 초기 상태 설정
    this.updateState(this.isOnline ? SyncState.IDLE : SyncState.OFFLINE);
    
    // 최초 동기화 시도
    if (this.isOnline && this.syncQueue.length > 0) {
      this.sync();
    }
  }
  
  /**
   * 자동 동기화 시작
   */
  public startAutoSync(): void {
    if (this.syncIntervalId) {
      return;
    }
    
    this.syncIntervalId = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.syncQueue.length > 0) {
        this.sync();
      }
    }, this.syncInterval);
  }
  
  /**
   * 자동 동기화 중지
   */
  public stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }
  
  /**
   * 온라인 상태 처리
   */
  private handleOnline(): void {
    if (!this.isOnline) {
      this.isOnline = true;
      this.updateState(SyncState.IDLE);
      this.emit(SyncEventType.ONLINE_STATUS_CHANGED, { online: true });
      
      // 오프라인 상태에서 쌓인 작업 동기화
      if (this.syncQueue.length > 0) {
        this.sync();
      }
    }
  }
  
  /**
   * 오프라인 상태 처리
   */
  private handleOffline(): void {
    if (this.isOnline) {
      this.isOnline = false;
      this.updateState(SyncState.OFFLINE);
      this.emit(SyncEventType.ONLINE_STATUS_CHANGED, { online: false });
    }
  }
  
  /**
   * 상태 업데이트
   */
  private updateState(newState: SyncState): void {
    const oldState = this.state;
    this.state = newState;
    
    if (oldState !== newState) {
      this.emit(SyncEventType.STATE_CHANGED, { 
        previous: oldState, 
        current: newState 
      });
    }
  }
  
  /**
   * 동기화 큐 로드
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const storedQueue = await this.dataStore.getCollection<ISyncOperation>('sync-queue');
      this.syncQueue = storedQueue || [];
    } catch (error) {
      console.error('동기화 큐 로드 실패:', error);
      this.syncQueue = [];
    }
  }
  
  /**
   * 동기화 큐 저장
   */
  private async saveSyncQueue(): Promise<void> {
    try {
      // ID를 키로 사용하여 객체를 저장
      const queueMap: Record<string, ISyncOperation> = {};
      this.syncQueue.forEach(operation => {
        queueMap[operation.id] = operation;
      });
      
      await this.dataStore.clearCollection('sync-queue');
      await this.dataStore.bulkSet('sync-queue', queueMap);
    } catch (error) {
      console.error('동기화 큐 저장 실패:', error);
    }
  }
  
  /**
   * 아이템 생성 작업 추가
   */
  public async create(collection: string, data: any): Promise<string> {
    const itemId = uuidv4();
    return this.queueOperation(SyncOperationType.CREATE, collection, itemId, data);
  }
  
  /**
   * 아이템 업데이트 작업 추가
   */
  public async update(collection: string, itemId: string, data: any, baseRevision?: string): Promise<string> {
    return this.queueOperation(SyncOperationType.UPDATE, collection, itemId, data, baseRevision);
  }
  
  /**
   * 아이템 삭제 작업 추가
   */
  public async delete(collection: string, itemId: string): Promise<string> {
    return this.queueOperation(SyncOperationType.DELETE, collection, itemId, null);
  }
  
  /**
   * 동기화 작업 큐에 추가
   */
  private async queueOperation(
    type: SyncOperationType,
    collection: string,
    itemId: string,
    data: any,
    baseRevision?: string
  ): Promise<string> {
    // 작업 ID 생성
    const operationId = uuidv4();
    
    // 새 작업 생성
    const operation: ISyncOperation = {
      id: operationId,
      type,
      collection,
      itemId,
      data,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      retryCount: 0,
      baseRevision
    };
    
    // 큐에 추가
    this.syncQueue.push(operation);
    
    // 로컬 저장
    if (this.offlineSupport) {
      // 로컬 데이터 저장소에 작업 적용
      if (type === SyncOperationType.CREATE || type === SyncOperationType.UPDATE) {
        await this.dataStore.setItem(`${collection}-local`, itemId, data);
      } else if (type === SyncOperationType.DELETE) {
        await this.dataStore.removeItem(`${collection}-local`, itemId);
      }
    }
    
    // 동기화 큐 저장
    await this.saveSyncQueue();
    
    // 오프라인 변경 이벤트 발행
    this.emit(SyncEventType.OFFLINE_CHANGE, { 
      operationId, 
      type, 
      collection, 
      itemId 
    });
    
    // 온라인이고 자동 동기화가 활성화된 경우 동기화 시작
    if (this.isOnline && this.autoSync) {
      this.sync();
    }
    
    return operationId;
  }
  
  /**
   * 동기화 실행
   */
  public async sync(): Promise<void> {
    // 이미 동기화 중이거나 오프라인이거나 큐가 비어있는 경우 종료
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }
    
    this.isSyncing = true;
    this.updateState(SyncState.SYNCING);
    this.emit(SyncEventType.SYNC_STARTED);
    
    try {
      // 배치 단위로 처리
      const batches = this.createBatches(this.syncQueue, this.batchSize);
      let success = true;
      
      for (const batch of batches) {
        if (!this.isOnline) {
          break;
        }
        
        const batchResult = await this.processBatch(batch);
        if (!batchResult) {
          success = false;
          break;
        }
      }
      
      // 동기화 완료 이벤트 발행
      if (success) {
        this.updateState(SyncState.IDLE);
        this.emit(SyncEventType.SYNC_COMPLETED);
      }
    } catch (error) {
      console.error('동기화 실패:', error);
      this.updateState(SyncState.ERROR);
      this.emit(SyncEventType.SYNC_FAILED, { 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      });
    } finally {
      this.isSyncing = false;
      
      // 충돌이 있는 경우 상태 업데이트
      if (this.pendingConflicts.size > 0) {
        this.updateState(SyncState.CONFLICT);
      }
    }
  }
  
  /**
   * 배치 처리
   */
  private async processBatch(batch: ISyncOperation[]): Promise<boolean> {
    try {
      // 서버에 배치 전송
      const responses = await this.sendBatchToServer(batch);
      
      // 성공한 작업 및 충돌이 있는 작업 처리
      const operationsToRemove: string[] = [];
      
      for (let i = 0; i < batch.length; i++) {
        const operation = batch[i];
        const response = responses[i];
        
        if (response.success) {
          // 성공한 작업
          operationsToRemove.push(operation.id);
          
          // 이벤트 발행
          this.emit(SyncEventType.ITEM_SYNCED, {
            operationId: operation.id,
            collection: operation.collection,
            itemId: operation.itemId,
            revision: response.revision
          });
        } else if (response.conflicts && response.conflicts.length > 0) {
          // 충돌이 있는 작업
          // 충돌 해결 전략에 따라 처리
          if (this.userInteractionForConflicts) {
            // 사용자 상호작용 필요: 충돌 저장
            for (const conflict of response.conflicts) {
              const conflictId = `${operation.collection}:${operation.itemId}`;
              this.pendingConflicts.set(conflictId, conflict);
            }
            
            // 충돌 이벤트 발행
            this.emit(SyncEventType.CONFLICT_DETECTED, {
              operationId: operation.id,
              collection: operation.collection,
              itemId: operation.itemId,
              conflicts: response.conflicts
            });
          } else {
            // 자동 해결: 기본 전략 사용
            const mergeResult = await this.resolveConflictsAutomatically(
              operation, 
              response.conflicts
            );
            
            if (mergeResult.success) {
              // 병합 성공: 다시 서버로 전송
              const updatedOperation: ISyncOperation = {
                ...operation,
                data: mergeResult.data,
                timestamp: Date.now()
              };
              
              // 기존 작업 제거
              operationsToRemove.push(operation.id);
              
              // 새 작업 추가
              this.syncQueue.push(updatedOperation);
            } else {
              // 병합 실패: 충돌 저장
              const conflictId = `${operation.collection}:${operation.itemId}`;
              response.conflicts.forEach(conflict => {
                this.pendingConflicts.set(conflictId, conflict);
              });
              
              // 충돌 이벤트 발행
              this.emit(SyncEventType.CONFLICT_DETECTED, {
                operationId: operation.id,
                collection: operation.collection,
                itemId: operation.itemId,
                conflicts: response.conflicts
              });
            }
          }
        } else {
          // 오류 발생
          operation.retryCount++;
          
          if (operation.retryCount > this.maxRetries) {
            // 최대 재시도 횟수 초과
            operationsToRemove.push(operation.id);
            
            // 실패 이벤트 발행
            this.emit(SyncEventType.SYNC_FAILED, {
              operationId: operation.id,
              error: response.error || '최대 재시도 횟수 초과'
            });
          }
        }
      }
      
      // 처리 완료된 작업 제거
      this.syncQueue = this.syncQueue.filter(op => !operationsToRemove.includes(op.id));
      
      // 동기화 큐 저장
      await this.saveSyncQueue();
      
      return true;
    } catch (error) {
      console.error('배치 처리 실패:', error);
      
      // 모든 작업 재시도 횟수 증가
      for (const operation of batch) {
        operation.retryCount++;
      }
      
      return false;
    }
  }
  
  /**
   * 충돌 자동 해결
   */
  private async resolveConflictsAutomatically(
    operation: ISyncOperation,
    conflicts: Array<IMergeConflict<any>>
  ): Promise<{ success: boolean; data?: any }> {
    try {
      // 기본 병합 전략 사용
      const firstConflict = conflicts[0];
      
      if (this.defaultMergeStrategy === 'last-write-wins') {
        // 마지막 쓰기 우선 전략
        const mergeResult = MergeUtils.lastWriteWins(
          firstConflict.base,
          firstConflict.local,
          firstConflict.remote,
          operation.timestamp,
          Date.now() - 1000 // 서버 타임스탬프는 1초 전으로 가정
        );
        
        if (mergeResult.success && mergeResult.merged) {
          return {
            success: true,
            data: mergeResult.merged
          };
        }
      } else if (this.defaultMergeStrategy === 'three-way-merge') {
        // 3-way 병합 전략
        const mergeResult = MergeUtils.threeWayMerge(
          firstConflict.base,
          firstConflict.local,
          firstConflict.remote
        );
        
        if (mergeResult.success && mergeResult.merged) {
          return {
            success: true,
            data: mergeResult.merged
          };
        }
      }
      
      return {
        success: false
      };
    } catch (error) {
      console.error('충돌 자동 해결 실패:', error);
      return {
        success: false
      };
    }
  }
  
  /**
   * 수동으로 충돌 해결
   */
  public async resolveConflict(
    collection: string,
    itemId: string,
    resolution: 'local' | 'remote' | 'custom',
    customData?: any
  ): Promise<boolean> {
    const conflictId = `${collection}:${itemId}`;
    const conflict = this.pendingConflicts.get(conflictId);
    
    if (!conflict) {
      throw new Error('해당하는 충돌을 찾을 수 없습니다.');
    }
    
    try {
      let resolvedData: any;
      
      if (resolution === 'local') {
        resolvedData = conflict.local;
      } else if (resolution === 'remote') {
        resolvedData = conflict.remote;
      } else if (resolution === 'custom' && customData) {
        resolvedData = customData;
      } else {
        throw new Error('유효하지 않은 해결 방식입니다.');
      }
      
      // 해결된 데이터로 업데이트 작업 추가
      await this.update(collection, itemId, resolvedData);
      
      // 충돌 목록에서 제거
      this.pendingConflicts.delete(conflictId);
      
      // 충돌이 더 이상 없으면 상태 업데이트
      if (this.pendingConflicts.size === 0) {
        this.updateState(SyncState.IDLE);
      }
      
      return true;
    } catch (error) {
      console.error('충돌 해결 실패:', error);
      return false;
    }
  }
  
  /**
   * 여러 충돌 한 번에 해결
   */
  public async resolveBulkConflicts(
    resolutions: Array<{
      collection: string;
      itemId: string;
      resolution: 'local' | 'remote' | 'custom';
      customData?: any;
    }>
  ): Promise<boolean> {
    try {
      for (const item of resolutions) {
        await this.resolveConflict(
          item.collection,
          item.itemId,
          item.resolution,
          item.customData
        );
      }
      return true;
    } catch (error) {
      console.error('일괄 충돌 해결 실패:', error);
      return false;
    }
  }
  
  /**
   * 서버에 배치 전송
   */
  private async sendBatchToServer(batch: ISyncOperation[]): Promise<ISyncResponse[]> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': this.deviceId
        },
        body: JSON.stringify({
          operations: batch,
          deviceId: this.deviceId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('서버 전송 실패:', error);
      
      // 모든 작업에 대해 오류 응답 생성
      return batch.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      }));
    }
  }
  
  /**
   * 장치 ID 생성
   */
  private generateDeviceId(): string {
    const storedDeviceId = localStorage?.getItem('device_id');
    if (storedDeviceId) {
      return storedDeviceId;
    }
    
    const newDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (localStorage) {
      localStorage.setItem('device_id', newDeviceId);
    }
    
    return newDeviceId;
  }
  
  /**
   * 배치로 나누기
   */
  private createBatches<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }
  
  /**
   * 현재 상태 가져오기
   */
  public getState(): SyncState {
    return this.state;
  }
  
  /**
   * 온라인 상태 가져오기
   */
  public isNetworkOnline(): boolean {
    return this.isOnline;
  }
  
  /**
   * 동기화 큐의 항목 수 가져오기
   */
  public getQueueSize(): number {
    return this.syncQueue.length;
  }
  
  /**
   * 충돌 목록 가져오기
   */
  public getPendingConflicts(): Map<string, IMergeConflict<any>> {
    return new Map(this.pendingConflicts);
  }
  
  /**
   * 리소스 정리
   */
  public destroy(): void {
    this.stopAutoSync();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    
    this.removeAllListeners();
  }
}

// 기본 인스턴스 생성
export const syncManager = SyncManager.getInstance(); 