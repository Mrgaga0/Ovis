import { EventEmitter } from 'events';

/**
 * 동기화 작업 상태 타입
 */
export type SyncOperationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'conflict';

/**
 * 동기화 작업 타입
 */
export type SyncOperationType = 'create' | 'update' | 'delete';

/**
 * 동기화 작업 인터페이스
 */
export interface ISyncOperation {
  id: string;
  type: SyncOperationType;
  model: string;
  data: any;
  timestamp: number;
  deviceId: string;
  status: SyncOperationStatus;
  retryCount?: number;
  error?: string;
  updatedAt?: number;
}

/**
 * 동기화 결과 인터페이스
 */
export interface ISyncResult {
  success: boolean;
  operationId: string;
  error?: string;
  conflictData?: any;
}

/**
 * 동기화 로그 인터페이스
 */
export interface ISyncLog {
  id: string;
  operationId: string;
  result: 'success' | 'failure' | 'conflict';
  timestamp: number;
  details?: any;
}

/**
 * 동기화 매니저 옵션 인터페이스
 */
export interface ISyncManagerOptions {
  apiEndpoint?: string;
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
  syncInterval?: number;
  conflictStrategy?: 'client-wins' | 'server-wins' | 'manual';
  deviceId?: string;
}

/**
 * 데이터 동기화 매니저 클래스
 * 오프라인 지원, 충돌 해결, 데이터 일관성 유지를 담당합니다.
 */
export class DataSyncManager extends EventEmitter {
  private static instance: DataSyncManager;
  
  private apiEndpoint: string;
  private operations: Map<string, ISyncOperation>;
  private maxRetries: number;
  private retryDelay: number;
  private batchSize: number;
  private syncInterval: number;
  private conflictStrategy: 'client-wins' | 'server-wins' | 'manual';
  private deviceId: string;
  private syncIntervalId: NodeJS.Timeout | null;
  private isOnline: boolean;
  private isSyncing: boolean;
  private syncLogs: ISyncLog[];
  private localStorageKey: string;
  
  /**
   * 생성자
   * @param options 동기화 매니저 옵션
   */
  private constructor(options: ISyncManagerOptions = {}) {
    super();
    
    this.apiEndpoint = options.apiEndpoint || '/api/sync';
    this.operations = new Map();
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000; // 5초
    this.batchSize = options.batchSize || 10;
    this.syncInterval = options.syncInterval || 30000; // 30초
    this.conflictStrategy = options.conflictStrategy || 'server-wins';
    this.deviceId = options.deviceId || this.generateDeviceId();
    this.syncIntervalId = null;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    this.syncLogs = [];
    this.localStorageKey = 'ovis_sync_operations';
    
    this.initialize();
  }
  
  /**
   * 싱글톤 인스턴스를 가져옵니다.
   * @param options 동기화 매니저 옵션
   */
  public static getInstance(options?: ISyncManagerOptions): DataSyncManager {
    if (!DataSyncManager.instance) {
      DataSyncManager.instance = new DataSyncManager(options);
    }
    return DataSyncManager.instance;
  }
  
  /**
   * 초기화 메서드
   */
  private initialize(): void {
    // 브라우저 환경에서만 실행
    if (typeof window !== 'undefined') {
      // 온라인/오프라인 이벤트 리스너
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // 로컬 스토리지에서 작업 복원
      this.loadOperationsFromStorage();
      
      // 백그라운드 동기화 시작
      this.startSync();
    }
  }
  
  /**
   * 장치 ID 생성
   */
  private generateDeviceId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `device_${timestamp}_${randomStr}`;
  }
  
  /**
   * 온라인 상태 처리
   */
  private handleOnline(): void {
    this.isOnline = true;
    this.emit('online');
    this.sync(); // 즉시 동기화 시도
  }
  
  /**
   * 오프라인 상태 처리
   */
  private handleOffline(): void {
    this.isOnline = false;
    this.emit('offline');
  }
  
  /**
   * 작업 큐에 추가
   * @param type 작업 타입
   * @param model 모델명
   * @param data 데이터
   */
  public async queueOperation(
    type: SyncOperationType,
    model: string,
    data: any
  ): Promise<string> {
    const id = this.generateOperationId();
    const operation: ISyncOperation = {
      id,
      type,
      model,
      data,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      status: 'pending',
      retryCount: 0
    };
    
    this.operations.set(id, operation);
    this.saveOperationsToStorage();
    this.emit('operation-queued', { operationId: id, type, model });
    
    // 온라인 상태면 즉시 동기화 시도
    if (this.isOnline && !this.isSyncing) {
      this.sync();
    }
    
    return id;
  }
  
  /**
   * 작업 ID 생성
   */
  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
  
  /**
   * 로컬 스토리지에 작업 저장
   */
  private saveOperationsToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const serialized = JSON.stringify(Array.from(this.operations.entries()));
        localStorage.setItem(this.localStorageKey, serialized);
      } catch (error) {
        console.error('작업 저장 중 오류 발생:', error);
      }
    }
  }
  
  /**
   * 로컬 스토리지에서 작업 로드
   */
  private loadOperationsFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const serialized = localStorage.getItem(this.localStorageKey);
        if (serialized) {
          const entries = JSON.parse(serialized);
          this.operations = new Map(entries);
        }
      } catch (error) {
        console.error('작업 로드 중 오류 발생:', error);
      }
    }
  }
  
  /**
   * 백그라운드 동기화 시작
   */
  public startSync(): void {
    if (this.syncIntervalId) {
      return;
    }
    
    this.syncIntervalId = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, this.syncInterval);
    
    // 초기 동기화 즉시 실행
    if (this.isOnline) {
      this.sync();
    }
  }
  
  /**
   * 백그라운드 동기화 중지
   */
  public stopSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }
  
  /**
   * 동기화 실행
   */
  public async sync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }
    
    this.isSyncing = true;
    this.emit('sync-started');
    
    try {
      const pendingOperations = this.getPendingOperations();
      
      if (pendingOperations.length === 0) {
        this.isSyncing = false;
        this.emit('sync-completed', { operationsCount: 0 });
        return;
      }
      
      // 작업을 배치로 처리
      const batches = this.createBatches(pendingOperations, this.batchSize);
      
      for (const batch of batches) {
        if (!this.isOnline) {
          break;
        }
        
        await this.processBatch(batch);
      }
      
      this.emit('sync-completed', { operationsCount: pendingOperations.length });
    } catch (error) {
      console.error('동기화 중 오류 발생:', error);
      this.emit('sync-error', { error });
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * 대기 중인 작업 가져오기
   */
  private getPendingOperations(): ISyncOperation[] {
    return Array.from(this.operations.values())
      .filter(op => op.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  
  /**
   * 작업을 배치로 나누기
   * @param operations 작업 목록
   * @param batchSize 배치 크기
   */
  private createBatches<T>(operations: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * 작업 배치 처리
   * @param batch 작업 배치
   */
  private async processBatch(batch: ISyncOperation[]): Promise<void> {
    try {
      // 대상 작업 상태를 'processing'으로 변경
      batch.forEach(op => {
        this.updateOperationStatus(op.id, 'processing');
      });
      
      // 서버에 전송
      const response = await this.sendToServer(batch);
      
      // 결과 처리
      response.forEach(result => {
        if (result.success) {
          this.handleSuccessResult(result);
        } else if (result.conflictData) {
          this.handleConflictResult(result);
        } else {
          this.handleErrorResult(result);
        }
      });
      
      this.saveOperationsToStorage();
    } catch (error) {
      // 네트워크 오류 등의 이유로 배치 전체 실패
      console.error('배치 처리 중 오류 발생:', error);
      
      // 작업 상태를 다시 'pending'으로 변경
      batch.forEach(op => {
        const operation = this.operations.get(op.id);
        if (operation) {
          const retryCount = (operation.retryCount || 0) + 1;
          
          if (retryCount <= this.maxRetries) {
            this.updateOperationStatus(op.id, 'pending', {
              retryCount,
              error: error instanceof Error ? error.message : String(error)
            });
          } else {
            this.updateOperationStatus(op.id, 'failed', {
              error: `최대 재시도 횟수 초과: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        }
      });
      
      this.saveOperationsToStorage();
    }
  }
  
  /**
   * 서버에 작업 배치 전송
   * @param batch 작업 배치
   */
  private async sendToServer(batch: ISyncOperation[]): Promise<ISyncResult[]> {
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
      console.error('서버 전송 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 작업 상태 업데이트
   * @param id 작업 ID
   * @param status 새 상태
   * @param additionalData 추가 데이터
   */
  private updateOperationStatus(
    id: string,
    status: SyncOperationStatus,
    additionalData: Record<string, any> = {}
  ): void {
    const operation = this.operations.get(id);
    if (operation) {
      this.operations.set(id, {
        ...operation,
        ...additionalData,
        status,
        updatedAt: Date.now()
      });
    }
  }
  
  /**
   * 성공 결과 처리
   * @param result 동기화 결과
   */
  private handleSuccessResult(result: ISyncResult): void {
    this.updateOperationStatus(result.operationId, 'completed');
    
    // 로그 추가
    this.addSyncLog({
      id: this.generateOperationId(),
      operationId: result.operationId,
      result: 'success',
      timestamp: Date.now()
    });
    
    // 완료 이벤트 발생
    this.emit('operation-completed', { operationId: result.operationId });
    
    // 일정 시간 후 완료된 작업 정리
    setTimeout(() => {
      this.operations.delete(result.operationId);
      this.saveOperationsToStorage();
    }, 60000); // 1분 후 정리
  }
  
  /**
   * 충돌 결과 처리
   * @param result 동기화 결과
   */
  private handleConflictResult(result: ISyncResult): void {
    const operation = this.operations.get(result.operationId);
    if (!operation) return;
    
    // 충돌 해결 전략에 따라 처리
    if (this.conflictStrategy === 'server-wins') {
      this.updateOperationStatus(result.operationId, 'completed');
      this.emit('conflict-resolved-server', {
        operationId: result.operationId,
        serverData: result.conflictData
      });
    } else if (this.conflictStrategy === 'client-wins') {
      // 재시도 횟수 증가 후 다시 큐에 추가
      const retryCount = (operation.retryCount || 0) + 1;
      if (retryCount <= this.maxRetries) {
        this.updateOperationStatus(result.operationId, 'pending', { retryCount });
      } else {
        this.updateOperationStatus(result.operationId, 'failed', {
          error: '최대 재시도 횟수 초과 (충돌)'
        });
      }
    } else { // manual
      this.updateOperationStatus(result.operationId, 'conflict');
      this.emit('conflict-detected', {
        operationId: result.operationId,
        clientData: operation.data,
        serverData: result.conflictData
      });
    }
    
    // 로그 추가
    this.addSyncLog({
      id: this.generateOperationId(),
      operationId: result.operationId,
      result: 'conflict',
      timestamp: Date.now(),
      details: {
        clientData: operation.data,
        serverData: result.conflictData,
        resolution: this.conflictStrategy
      }
    });
  }
  
  /**
   * 오류 결과 처리
   * @param result 동기화 결과
   */
  private handleErrorResult(result: ISyncResult): void {
    const operation = this.operations.get(result.operationId);
    if (!operation) return;
    
    const retryCount = (operation.retryCount || 0) + 1;
    if (retryCount <= this.maxRetries) {
      // 지수 백오프 적용 (재시도 간격 점진적 증가)
      const delay = this.retryDelay * Math.pow(2, retryCount - 1);
      
      setTimeout(() => {
        this.updateOperationStatus(result.operationId, 'pending', {
          retryCount,
          error: result.error
        });
        this.saveOperationsToStorage();
      }, delay);
    } else {
      this.updateOperationStatus(result.operationId, 'failed', {
        error: result.error
      });
      
      // 로그 추가
      this.addSyncLog({
        id: this.generateOperationId(),
        operationId: result.operationId,
        result: 'failure',
        timestamp: Date.now(),
        details: {
          error: result.error,
          retryCount
        }
      });
      
      // 실패 이벤트 발생
      this.emit('operation-failed', {
        operationId: result.operationId,
        error: result.error
      });
    }
  }
  
  /**
   * 동기화 로그 추가
   * @param log 로그 항목
   */
  private addSyncLog(log: ISyncLog): void {
    this.syncLogs.push(log);
    
    // 로그 최대 수 제한
    const maxLogs = 100;
    if (this.syncLogs.length > maxLogs) {
      this.syncLogs = this.syncLogs.slice(-maxLogs);
    }
  }
  
  /**
   * 수동으로 충돌 해결
   * @param operationId 작업 ID
   * @param resolution 'client' | 'server' | 'merge'
   * @param mergedData 병합된 데이터 (resolution이 'merge'인 경우)
   */
  public resolveConflict(
    operationId: string,
    resolution: 'client' | 'server' | 'merge',
    mergedData?: any
  ): void {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'conflict') {
      throw new Error(`해결할 충돌 작업을 찾을 수 없습니다: ${operationId}`);
    }
    
    if (resolution === 'client') {
      this.updateOperationStatus(operationId, 'pending', {
        retryCount: 0
      });
    } else if (resolution === 'server') {
      this.updateOperationStatus(operationId, 'completed');
      setTimeout(() => {
        this.operations.delete(operationId);
        this.saveOperationsToStorage();
      }, 60000);
    } else if (resolution === 'merge' && mergedData) {
      this.updateOperationStatus(operationId, 'pending', {
        retryCount: 0,
        data: mergedData
      });
    } else {
      throw new Error('유효하지 않은 충돌 해결 방법');
    }
    
    this.saveOperationsToStorage();
    this.emit('conflict-resolved-manual', {
      operationId,
      resolution
    });
    
    // 온라인 상태면 즉시 동기화 시도
    if (this.isOnline && !this.isSyncing) {
      this.sync();
    }
  }
  
  /**
   * 모든 작업 상태 가져오기
   */
  public getAllOperations(): ISyncOperation[] {
    return Array.from(this.operations.values());
  }
  
  /**
   * 동기화 로그 가져오기
   */
  public getSyncLogs(): ISyncLog[] {
    return [...this.syncLogs];
  }
  
  /**
   * 모든 상태 초기화
   */
  public reset(): void {
    this.operations.clear();
    this.syncLogs = [];
    this.saveOperationsToStorage();
    this.emit('reset');
  }
  
  /**
   * 현재 온라인 상태 확인
   */
  public isNetworkOnline(): boolean {
    return this.isOnline;
  }
  
  /**
   * 현재 동기화 중인지 확인
   */
  public isSyncInProgress(): boolean {
    return this.isSyncing;
  }
  
  /**
   * 동기화 통계 가져오기
   */
  public getStats(): Record<string, any> {
    const operations = Array.from(this.operations.values());
    
    return {
      total: operations.length,
      pending: operations.filter(op => op.status === 'pending').length,
      processing: operations.filter(op => op.status === 'processing').length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length,
      conflict: operations.filter(op => op.status === 'conflict').length,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      deviceId: this.deviceId,
      lastSyncTimestamp: this.syncLogs.length > 0 
        ? Math.max(...this.syncLogs.map(log => log.timestamp))
        : null
    };
  }
  
  /**
   * 자원 정리
   */
  public destroy(): void {
    this.stopSync();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
    
    this.removeAllListeners();
  }
} 