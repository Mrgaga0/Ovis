import { MergeUtils, IMergeConflict, IMergeResult, MergeStrategy } from '../storage/MergeUtils';
import { EventEmitter } from 'events';

/**
 * 동기화 충돌 유형
 */
export enum ConflictType {
  CREATE_CREATE = 'create_create',   // 양쪽에서 동일 ID로 생성
  UPDATE_UPDATE = 'update_update',   // 양쪽에서 동시 업데이트
  DELETE_UPDATE = 'delete_update',   // 한쪽에서 삭제, 다른쪽에서 업데이트
  DELETE_DELETE = 'delete_delete'    // 양쪽에서 동시 삭제 (실제로는 충돌 아님)
}

/**
 * 동기화 충돌 이벤트 유형
 */
export enum ConflictEventType {
  CONFLICT_DETECTED = 'conflict_detected',
  CONFLICT_RESOLVED = 'conflict_resolved',
  RESOLUTION_NEEDED = 'resolution_needed',
  CONFLICT_ERROR = 'conflict_error'
}

/**
 * 충돌 해결 옵션
 */
export interface IConflictResolutionOptions {
  strategy: MergeStrategy;
  defaultWinner?: 'local' | 'remote';
  manualResolutionUI?: boolean;
  autoResolveThreshold?: number; // 자동 해결 가능한 충돌 복잡도 임계값
  resolveDeleteConflicts?: 'keep' | 'delete';
  resolveByCollection?: Record<string, MergeStrategy>;
  customMergeFns?: Record<string, <T>(base: T, local: T, remote: T) => T>;
  onConflictDetected?: (conflict: ISyncConflict<any>) => void;
  maxResolveAttempts?: number;
}

/**
 * 동기화 충돌 인터페이스
 */
export interface ISyncConflict<T> extends IMergeConflict<T> {
  id: string;
  collection: string;
  type: ConflictType;
  localTimestamp: number;
  remoteTimestamp: number;
  resolved: boolean;
  resolution?: T;
  resolvedBy?: string;
  resolvedAt?: number;
  resolutionStrategy?: MergeStrategy;
  complexity?: number; // 충돌 복잡도 (0-100)
  resolutionAttempts: number;
}

/**
 * 충돌 해결 컨텍스트
 */
export interface IConflictContext {
  userId: string;
  deviceId: string;
  isOnline: boolean;
  syncSessionId: string;
  prioritizeLocal?: boolean;
  prioritizeFields?: string[];
  ignoredFields?: string[];
  timestamp: number;
}

/**
 * 충돌 해결 결과
 */
export interface IConflictResolution<T> {
  conflict: ISyncConflict<T>;
  resolved: boolean;
  resolution?: T;
  strategy: MergeStrategy;
  resolvedBy: string;
  error?: string;
}

/**
 * 충돌 해결 관리자 클래스
 */
export class ConflictResolver extends EventEmitter {
  private static instance: ConflictResolver;
  private options: IConflictResolutionOptions;
  private activeConflicts: Map<string, ISyncConflict<any>> = new Map();
  private pendingResolutions: Map<string, Promise<IConflictResolution<any>>> = new Map();
  private conflictHistory: ISyncConflict<any>[] = [];
  private maxHistorySize: number = 100;
  
  /**
   * 생성자
   */
  private constructor(options?: Partial<IConflictResolutionOptions>) {
    super();
    
    this.options = {
      strategy: 'smart-merge',
      defaultWinner: 'local',
      manualResolutionUI: true,
      autoResolveThreshold: 30,
      resolveDeleteConflicts: 'keep',
      resolveByCollection: {},
      customMergeFns: {},
      maxResolveAttempts: 3,
      ...options
    };
  }
  
  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(options?: Partial<IConflictResolutionOptions>): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver(options);
    } else if (options) {
      // 옵션 업데이트
      ConflictResolver.instance.updateOptions(options);
    }
    
    return ConflictResolver.instance;
  }
  
  /**
   * 충돌 감지 및 해결 처리
   */
  public async resolveConflict<T>(
    id: string,
    collection: string,
    base: T | null,
    local: T | null,
    remote: T | null,
    context: IConflictContext
  ): Promise<IConflictResolution<T>> {
    // 충돌 유형 결정
    const conflictType = this.determineConflictType(base, local, remote);
    
    // Delete-Delete는 충돌이 아니므로 즉시 해결
    if (conflictType === ConflictType.DELETE_DELETE) {
      return {
        conflict: this.createConflict(id, collection, conflictType, base, local, remote, context),
        resolved: true,
        resolution: null as any, // 삭제된 상태이므로 null
        strategy: 'last-write-wins',
        resolvedBy: 'system'
      };
    }
    
    // 이미 해결 중인 충돌인지 확인
    const conflictKey = `${collection}:${id}`;
    if (this.pendingResolutions.has(conflictKey)) {
      return this.pendingResolutions.get(conflictKey) as Promise<IConflictResolution<T>>;
    }
    
    // 충돌 객체 생성
    const conflict = this.createConflict(id, collection, conflictType, base, local, remote, context);
    
    // 복잡도 평가
    conflict.complexity = this.calculateConflictComplexity(conflict);
    
    // 충돌 추가
    this.activeConflicts.set(conflictKey, conflict);
    
    // 충돌 감지 이벤트 발생
    this.emit(ConflictEventType.CONFLICT_DETECTED, conflict);
    
    if (this.options.onConflictDetected) {
      this.options.onConflictDetected(conflict);
    }
    
    // 해결 전략 결정
    const strategy = this.determineResolutionStrategy(collection, conflictType, conflict.complexity);
    
    // 해결 프로세스
    const resolutionPromise = this.processConflictResolution(conflict, strategy, context);
    
    // 진행 중인 해결 목록에 추가
    this.pendingResolutions.set(conflictKey, resolutionPromise);
    
    try {
      // 해결 처리 실행
      const resolution = await resolutionPromise;
      
      // 해결된 충돌은 활성 목록에서 제거
      if (resolution.resolved) {
        this.activeConflicts.delete(conflictKey);
      }
      
      // 충돌 해결 이벤트 발생
      this.emit(ConflictEventType.CONFLICT_RESOLVED, resolution);
      
      // 해결된 충돌은 기록에 추가
      if (resolution.resolved) {
        this.addToHistory(conflict);
      }
      
      return resolution;
    } catch (error) {
      // 오류 발생
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.emit(ConflictEventType.CONFLICT_ERROR, { conflict, error: errorMsg });
      
      return {
        conflict,
        resolved: false,
        strategy,
        resolvedBy: 'error',
        error: errorMsg
      };
    } finally {
      // 진행 중인 해결 목록에서 제거
      this.pendingResolutions.delete(conflictKey);
    }
  }
  
  /**
   * 충돌 유형 결정
   */
  private determineConflictType<T>(base: T | null, local: T | null, remote: T | null): ConflictType {
    if (base === null) {
      // 기본이 없는 경우 - 생성 충돌
      return ConflictType.CREATE_CREATE;
    } else if (local === null && remote === null) {
      // 양쪽 모두 삭제된 경우
      return ConflictType.DELETE_DELETE;
    } else if (local === null || remote === null) {
      // 한쪽만 삭제된 경우
      return ConflictType.DELETE_UPDATE;
    } else {
      // 양쪽 모두 업데이트된 경우
      return ConflictType.UPDATE_UPDATE;
    }
  }
  
  /**
   * 충돌 객체 생성
   */
  private createConflict<T>(
    id: string,
    collection: string,
    type: ConflictType,
    base: T | null,
    local: T | null,
    remote: T | null,
    context: IConflictContext
  ): ISyncConflict<T> {
    return {
      id,
      collection,
      type,
      base: base as T,
      local: local as T,
      remote: remote as T,
      path: collection,
      resolved: false,
      localTimestamp: context.timestamp,
      remoteTimestamp: context.timestamp,
      resolutionAttempts: 0,
      complexity: 0 // 계산 전
    };
  }
  
  /**
   * 해결 전략 결정
   */
  private determineResolutionStrategy(
    collection: string,
    conflictType: ConflictType,
    complexity: number
  ): MergeStrategy {
    // 컬렉션별 특정 전략이 있는 경우 우선 적용
    if (this.options.resolveByCollection && this.options.resolveByCollection[collection]) {
      return this.options.resolveByCollection[collection];
    }
    
    // 삭제-업데이트 충돌에 대한 특별 처리
    if (conflictType === ConflictType.DELETE_UPDATE) {
      return this.options.resolveDeleteConflicts === 'delete' ? 'last-write-wins' : 'manual';
    }
    
    // 복잡도가 낮은 충돌은 자동 해결 가능
    if (complexity <= (this.options.autoResolveThreshold || 30)) {
      if (conflictType === ConflictType.UPDATE_UPDATE) {
        return 'smart-merge';
      }
      return 'last-write-wins';
    }
    
    // 기본 전략 사용
    return this.options.strategy;
  }
  
  /**
   * 충돌 복잡도 계산 (0-100)
   */
  private calculateConflictComplexity<T>(conflict: ISyncConflict<T>): number {
    // 삭제 관련 충돌은 복잡도가 낮음
    if (conflict.type === ConflictType.DELETE_DELETE) {
      return 0;
    }
    
    if (conflict.type === ConflictType.DELETE_UPDATE) {
      return 50; // 삭제-업데이트는 중간 복잡도
    }
    
    // 객체가 아닌 경우 단순 비교
    if (typeof conflict.local !== 'object' || typeof conflict.remote !== 'object' || 
        conflict.local === null || conflict.remote === null) {
      return conflict.local === conflict.remote ? 0 : 40;
    }
    
    try {
      // 객체 차이점 분석
      const localString = JSON.stringify(conflict.local);
      const remoteString = JSON.stringify(conflict.remote);
      
      if (localString === remoteString) {
        return 0; // 동일한 객체
      }
      
      // 기본 객체인 경우
      if (conflict.base) {
        const baseString = JSON.stringify(conflict.base);
        const localDiff = this.calculateStringDifference(baseString, localString);
        const remoteDiff = this.calculateStringDifference(baseString, remoteString);
        
        // 차이점 비율에 따른 복잡도
        const overallDiff = (localDiff + remoteDiff) / 2;
        return Math.min(100, Math.round(overallDiff * 100));
      }
      
      // 기본 객체가 없는 경우
      const directDiff = this.calculateStringDifference(localString, remoteString);
      return Math.min(100, Math.round(directDiff * 100));
    } catch (error) {
      // 계산 실패 시 높은 복잡도 반환
      console.error('충돌 복잡도 계산 오류:', error);
      return 80;
    }
  }
  
  /**
   * 문자열 차이 계산 (0-1 범위)
   */
  private calculateStringDifference(str1: string, str2: string): number {
    if (str1 === str2) return 0;
    
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 0;
    
    // 단순 레벤슈타인 거리 구현 (dmp 대신 직접 구현)
    const distance = this.levenshteinDistance(str1, str2);
    
    return distance / maxLength;
  }
  
  /**
   * 레벤슈타인 거리 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // 빈 문자열 처리
    if (m === 0) return n;
    if (n === 0) return m;
    
    // 2차원 배열 생성 및 초기화
    const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // 첫 행과 열 초기화
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    
    // 거리 계산
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,      // 삭제
          d[i][j - 1] + 1,      // 삽입
          d[i - 1][j - 1] + cost // 대체
        );
      }
    }
    
    return d[m][n];
  }
  
  /**
   * 충돌 해결 처리
   */
  private async processConflictResolution<T>(
    conflict: ISyncConflict<T>,
    strategy: MergeStrategy,
    context: IConflictContext
  ): Promise<IConflictResolution<T>> {
    // 해결 시도 횟수 증가
    conflict.resolutionAttempts++;
    conflict.resolutionStrategy = strategy;
    
    // 최대 시도 횟수 초과 시 수동 해결로 전환
    if (conflict.resolutionAttempts > (this.options.maxResolveAttempts || 3)) {
      if (strategy !== 'manual') {
        console.warn(`최대 해결 시도 횟수 초과: ${conflict.id}. 수동 해결로 전환.`);
        strategy = 'manual';
        conflict.resolutionStrategy = strategy;
      }
    }
    
    // 전략별 해결 처리
    let resolution: T | undefined;
    let mergeResult: IMergeResult<T> | null = null;
    
    try {
      switch (strategy) {
        case 'last-write-wins':
          resolution = this.resolveWithLastWriteWins(conflict, context);
          break;
          
        case 'three-way-merge':
          mergeResult = this.resolveWithThreeWayMerge(conflict);
          resolution = mergeResult.merged;
          break;
          
        case 'smart-merge':
          mergeResult = this.resolveWithSmartMerge(conflict, context);
          resolution = mergeResult.merged;
          break;
          
        case 'recursive-merge':
          mergeResult = this.resolveWithRecursiveMerge(conflict);
          resolution = mergeResult.merged;
          break;
          
        case 'manual':
          // 수동 해결 필요
          this.emit(ConflictEventType.RESOLUTION_NEEDED, conflict);
          
          if (!this.options.manualResolutionUI) {
            throw new Error('수동 해결 UI가 비활성화되어 있습니다. 충돌을 해결할 수 없습니다.');
          }
          
          // 여기서는 수동 해결이 완료될 때까지 대기하는 프로미스를 반환
          // 실제 구현에서는 UI를 통한 사용자 입력을 기다리는 로직이 필요
          return {
            conflict,
            resolved: false,
            strategy,
            resolvedBy: 'pending'
          };
          
        default:
          throw new Error(`지원되지 않는 해결 전략: ${strategy}`);
      }
      
      // 해결 성공
      if (resolution !== undefined) {
        conflict.resolution = resolution;
        conflict.resolved = true;
        conflict.resolvedAt = Date.now();
        conflict.resolvedBy = 'system';
        
        return {
          conflict,
          resolved: true,
          resolution,
          strategy,
          resolvedBy: 'system'
        };
      } else if (mergeResult && !mergeResult.success) {
        // 병합 실패
        throw new Error(mergeResult.error || '병합 실패');
      } else {
        // 알 수 없는 오류
        throw new Error('충돌 해결 과정에서 알 수 없는 오류가 발생했습니다.');
      }
    } catch (error) {
      // 자동 해결 실패 시 수동 해결로 전환
      if (strategy !== 'manual') {
        console.warn(`자동 충돌 해결 실패: ${error}. 수동 해결로 전환.`);
        
        conflict.resolutionStrategy = 'manual';
        this.emit(ConflictEventType.RESOLUTION_NEEDED, conflict);
        
        return {
          conflict,
          resolved: false,
          strategy: 'manual',
          resolvedBy: 'pending',
          error: error instanceof Error ? error.message : String(error)
        };
      }
      
      // 이미 수동 해결 모드였던 경우는 오류 반환
      return {
        conflict,
        resolved: false,
        strategy,
        resolvedBy: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * 마지막 쓰기 우선 전략으로 해결
   */
  private resolveWithLastWriteWins<T>(conflict: ISyncConflict<T>, context: IConflictContext): T {
    // 삭제-업데이트 충돌 처리
    if (conflict.type === ConflictType.DELETE_UPDATE) {
      if (this.options.resolveDeleteConflicts === 'delete') {
        return null as any; // 삭제된 상태로 해결
      } else {
        // 삭제되지 않은 버전 선택
        return (conflict.local !== null) ? conflict.local : conflict.remote;
      }
    }
    
    // 타임스탬프 비교
    const useLocal = conflict.localTimestamp >= conflict.remoteTimestamp || 
                    (conflict.localTimestamp === conflict.remoteTimestamp && context.prioritizeLocal);
    
    return useLocal ? conflict.local : conflict.remote;
  }
  
  /**
   * 3-Way 병합 전략으로 해결
   */
  private resolveWithThreeWayMerge<T>(conflict: ISyncConflict<T>): IMergeResult<T> {
    // 삭제 충돌 처리
    if (conflict.type === ConflictType.DELETE_UPDATE) {
      return {
        success: true,
        merged: this.options.resolveDeleteConflicts === 'delete' ? null as any : 
               (conflict.local !== null ? conflict.local : conflict.remote)
      };
    }
    
    // 3-way 병합 수행
    return MergeUtils.threeWayMerge<T>(
      conflict.base || {} as T,
      conflict.local || {} as T,
      conflict.remote || {} as T
    );
  }
  
  /**
   * 스마트 병합 전략으로 해결
   */
  private resolveWithSmartMerge<T>(conflict: ISyncConflict<T>, context: IConflictContext): IMergeResult<T> {
    // 컬렉션별 커스텀 병합 함수가 있으면 사용
    if (this.options.customMergeFns && this.options.customMergeFns[conflict.collection]) {
      try {
        const customMergeFn = this.options.customMergeFns[conflict.collection];
        const merged = customMergeFn(
          conflict.base || {} as T,
          conflict.local || {} as T,
          conflict.remote || {} as T
        );
        
        return {
          success: true,
          merged
        };
      } catch (error) {
        console.error('커스텀 병합 함수 오류:', error);
        // 오류 발생 시 기본 3-way 병합으로 대체
      }
    }
    
    // 기본 3-way 병합 수행
    return this.resolveWithThreeWayMerge(conflict);
  }
  
  /**
   * 재귀적 병합 전략으로 해결
   */
  private resolveWithRecursiveMerge<T>(conflict: ISyncConflict<T>): IMergeResult<T> {
    // 객체가 아닌 경우 단순 비교
    if (typeof conflict.local !== 'object' || typeof conflict.remote !== 'object' || 
        conflict.local === null || conflict.remote === null) {
      return this.resolveWithThreeWayMerge(conflict);
    }
    
    // 작성 예정: 더 복잡한 객체 구조를 위한 재귀적 병합 알고리즘
    
    // 임시로 3-way 병합 사용
    return this.resolveWithThreeWayMerge(conflict);
  }
  
  /**
   * 수동으로 충돌 해결
   */
  public manuallyResolveConflict<T>(
    conflictId: string,
    collection: string,
    resolution: T,
    resolvedBy: string = 'user'
  ): IConflictResolution<T> {
    const conflictKey = `${collection}:${conflictId}`;
    const conflict = this.activeConflicts.get(conflictKey) as ISyncConflict<T>;
    
    if (!conflict) {
      throw new Error(`충돌을 찾을 수 없음: ${conflictKey}`);
    }
    
    // 충돌 해결 처리
    conflict.resolution = resolution;
    conflict.resolved = true;
    conflict.resolvedAt = Date.now();
    conflict.resolvedBy = resolvedBy;
    conflict.resolutionStrategy = 'manual';
    
    // 활성 충돌 목록에서 제거
    this.activeConflicts.delete(conflictKey);
    
    // 기록에 추가
    this.addToHistory(conflict);
    
    // 해결 이벤트 발생
    const result: IConflictResolution<T> = {
      conflict,
      resolved: true,
      resolution,
      strategy: 'manual',
      resolvedBy
    };
    
    this.emit(ConflictEventType.CONFLICT_RESOLVED, result);
    
    return result;
  }
  
  /**
   * 옵션 업데이트
   */
  public updateOptions(options: Partial<IConflictResolutionOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
  
  /**
   * 충돌 기록에 추가
   */
  private addToHistory<T>(conflict: ISyncConflict<T>): void {
    this.conflictHistory.unshift(conflict);
    
    // 최대 기록 크기 제한
    if (this.conflictHistory.length > this.maxHistorySize) {
      this.conflictHistory.pop();
    }
  }
  
  /**
   * 활성 충돌 목록 반환
   */
  public getActiveConflicts(): ISyncConflict<any>[] {
    return Array.from(this.activeConflicts.values());
  }
  
  /**
   * 충돌 기록 반환
   */
  public getConflictHistory(): ISyncConflict<any>[] {
    return [...this.conflictHistory];
  }
  
  /**
   * 모든 데이터 정리
   */
  public clear(): void {
    this.activeConflicts.clear();
    this.pendingResolutions.clear();
    this.conflictHistory = [];
    this.removeAllListeners();
  }
}

// 기본 인스턴스 내보내기
export const conflictResolver = ConflictResolver.getInstance(); 