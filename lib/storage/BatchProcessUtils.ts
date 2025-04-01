/**
 * 배치 프로세싱 유틸리티
 * 
 * 대용량 데이터 처리 시 메모리 효율성과 성능 최적화를 위한 유틸리티 함수 모음
 */

/**
 * 배치 처리 옵션 인터페이스
 */
export interface IBatchProcessOptions<T> {
  items: T[];                         // 처리할 항목 배열
  batchSize: number;                 // 배치 크기
  processFn: (batch: T[]) => Promise<void>; // 각 배치를 처리하는 함수
  onProgress?: (processed: number, total: number) => void; // 진행 상황 콜백
  concurrency?: number;              // 동시 처리할 배치 수 (기본값: 1)
  abortSignal?: AbortSignal;         // 중단 시그널
  priorityFn?: (item: T) => number;  // 항목 우선순위 계산 함수 (값이 높을수록 우선순위 높음)
  intervalBetweenBatches?: number;   // 배치 사이 지연 시간(ms)
}

/**
 * 배치 처리 결과 인터페이스
 */
export interface IBatchProcessResult {
  totalItems: number;      // 총 항목 수
  processedItems: number;  // 처리된 항목 수
  successfulBatches: number; // 성공한 배치 수
  failedBatches: number;   // 실패한 배치 수
  errors: Error[];         // 발생한 오류들
  elapsedTime: number;     // 소요 시간(ms)
  aborted: boolean;        // 중단 여부
}

/**
 * 처리 상태를 추적하는 Wake Map
 */
export class WakeMap<K, V> extends Map<K, V> {
  private accessTimes: Map<K, number> = new Map();
  
  /**
   * 항목 설정 (기존 Map.set 재정의)
   */
  set(key: K, value: V): this {
    this.accessTimes.set(key, Date.now());
    return super.set(key, value);
  }
  
  /**
   * 항목 조회 (기존 Map.get 재정의)
   */
  get(key: K): V | undefined {
    if (super.has(key)) {
      this.accessTimes.set(key, Date.now());
    }
    return super.get(key);
  }
  
  /**
   * 항목 삭제 (기존 Map.delete 재정의)
   */
  delete(key: K): boolean {
    this.accessTimes.delete(key);
    return super.delete(key);
  }
  
  /**
   * Map 초기화 (기존 Map.clear 재정의)
   */
  clear(): void {
    this.accessTimes.clear();
    super.clear();
  }
  
  /**
   * 가장 오래 접근하지 않은 항목들 삭제
   * @param count 삭제할 항목 수
   * @returns 삭제된 항목 키 배열
   */
  pruneOldest(count: number): K[] {
    if (count <= 0 || this.size === 0) return [];
    
    // 접근 시간순으로 정렬
    const sortedEntries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1]);
    
    // 삭제할 항목 수 제한
    const itemsToRemove = sortedEntries.slice(0, Math.min(count, sortedEntries.length));
    
    // 항목 삭제
    const removedKeys: K[] = [];
    for (const [key] of itemsToRemove) {
      super.delete(key);
      this.accessTimes.delete(key);
      removedKeys.push(key);
    }
    
    return removedKeys;
  }
  
  /**
   * 지정된 시간보다 오래된 항목 삭제
   * @param maxAge 최대 유지 시간(ms)
   * @returns 삭제된 항목 수
   */
  pruneByAge(maxAge: number): number {
    if (maxAge <= 0 || this.size === 0) return 0;
    
    const now = Date.now();
    const keysToRemove: K[] = [];
    
    // 오래된 항목 찾기
    for (const [key, time] of this.accessTimes.entries()) {
      if (now - time > maxAge) {
        keysToRemove.push(key);
      }
    }
    
    // 항목 삭제
    for (const key of keysToRemove) {
      super.delete(key);
      this.accessTimes.delete(key);
    }
    
    return keysToRemove.length;
  }
  
  /**
   * 항목의 마지막 접근 시간 조회
   * @param key 키
   * @returns 마지막 접근 시간 (없으면 0)
   */
  getLastAccessTime(key: K): number {
    return this.accessTimes.get(key) || 0;
  }
}

/**
 * 항목들을 배치로 분할
 * @param items 처리할 항목 배열
 * @param batchSize 배치 크기
 * @returns 배치 배열
 */
export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  if (!items.length) return [];
  if (!batchSize || batchSize <= 0) batchSize = 50; // 기본값
  
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * 항목들을 우선순위에 따라 배치로 분할
 * @param items 처리할 항목 배열
 * @param batchSize 배치 크기
 * @param priorityFn 우선순위 계산 함수
 * @returns 우선순위별로 정렬된 배치 배열
 */
export function splitIntoBatchesByPriority<T>(
  items: T[], 
  batchSize: number,
  priorityFn: (item: T) => number
): T[][] {
  if (!items.length) return [];
  if (!batchSize || batchSize <= 0) batchSize = 50; // 기본값
  
  // 우선순위에 따라 정렬
  const sortedItems = [...items].sort((a, b) => priorityFn(b) - priorityFn(a));
  
  // 배치로 분할
  return splitIntoBatches(sortedItems, batchSize);
}

/**
 * 배치 작업 처리
 * @param options 배치 처리 옵션
 * @returns 처리 결과 프로미스
 */
export async function processBatches<T>(options: IBatchProcessOptions<T>): Promise<IBatchProcessResult> {
  const {
    items,
    batchSize,
    processFn,
    onProgress,
    concurrency = 1,
    abortSignal,
    priorityFn,
    intervalBetweenBatches = 0
  } = options;
  
  // 입력 검증
  if (!items || !Array.isArray(items)) {
    throw new Error('배치 처리할 항목 배열이 필요합니다.');
  }
  
  if (!processFn || typeof processFn !== 'function') {
    throw new Error('배치 처리 함수가 필요합니다.');
  }
  
  // 초기 결과 상태
  const result: IBatchProcessResult = {
    totalItems: items.length,
    processedItems: 0,
    successfulBatches: 0,
    failedBatches: 0,
    errors: [],
    elapsedTime: 0,
    aborted: false
  };
  
  // 항목이 없으면 즉시 반환
  if (items.length === 0) {
    return result;
  }
  
  // 배치 분할
  const batches = priorityFn
    ? splitIntoBatchesByPriority(items, batchSize, priorityFn)
    : splitIntoBatches(items, batchSize);
  
  // 동시성 제한 (최소 1, 최대 배치 수)
  const effectiveConcurrency = Math.max(1, Math.min(concurrency, batches.length));
  
  // 시작 시간 기록
  const startTime = Date.now();
  
  // 진행 중인 배치 작업 추적
  const activePromises = new Set<Promise<void>>();
  
  // 지정된 시간 동안 대기하는 함수
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // 각 배치를 처리하는 함수
  async function processBatch(batch: T[], batchIndex: number): Promise<void> {
    try {
      if (abortSignal?.aborted) {
        result.aborted = true;
        return;
      }
      
      if (intervalBetweenBatches > 0 && batchIndex > 0) {
        await wait(intervalBetweenBatches);
      }
      
      await processFn(batch);
      
      result.successfulBatches++;
      result.processedItems += batch.length;
      
      if (onProgress && typeof onProgress === 'function') {
        onProgress(result.processedItems, result.totalItems);
      }
    } catch (error) {
      result.failedBatches++;
      result.errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  // 모든 배치 처리
  let nextBatchIndex = 0;
  
  // 초기 배치 시작
  for (let i = 0; i < Math.min(effectiveConcurrency, batches.length); i++) {
    const batchPromise = processBatch(batches[nextBatchIndex], nextBatchIndex)
      .then(() => {
        activePromises.delete(batchPromise);
      });
    
    activePromises.add(batchPromise);
    nextBatchIndex++;
  }
  
  // 나머지 배치 처리
  while (nextBatchIndex < batches.length && !result.aborted) {
    if (activePromises.size < effectiveConcurrency) {
      const batchPromise = processBatch(batches[nextBatchIndex], nextBatchIndex)
        .then(() => {
          activePromises.delete(batchPromise);
        });
      
      activePromises.add(batchPromise);
      nextBatchIndex++;
    } else {
      // 활성 작업 중 하나가 완료될 때까지 대기
      await Promise.race(Array.from(activePromises));
    }
    
    // 중단 신호 확인
    if (abortSignal?.aborted) {
      result.aborted = true;
      break;
    }
  }
  
  // 남은 활성 작업 완료 대기
  await Promise.all(Array.from(activePromises));
  
  // 소요 시간 계산
  result.elapsedTime = Date.now() - startTime;
  
  return result;
}

/**
 * 데이터 항목 처리를 위한 우선순위 계산 함수
 * @param lastModified 마지막 수정 시간
 * @param size 항목 크기 (바이트)
 * @param importance 중요도 (0-10)
 * @returns 우선순위 점수 (높을수록 우선순위 높음)
 */
export function calculatePriority(lastModified: number, size: number, importance: number = 5): number {
  const now = Date.now();
  const ageInHours = (now - lastModified) / (1000 * 60 * 60);
  const sizeScore = Math.min(10, Math.log10(size) * 2); // 크기에 따른 로그 스케일 점수
  
  // 최근 수정된 항목, 중요한 항목, 작은 항목에 더 높은 우선순위
  return (
    (10 - Math.min(10, ageInHours)) * 0.4 + // 최신성: 40%
    importance * 0.4 +                     // 중요도: 40%
    (10 - sizeScore) * 0.2                 // 크기 (역비례): 20%
  );
}

/**
 * 배치 작업 취소를 위한 컨트롤러
 */
export class BatchController {
  private abortController: AbortController;
  private startTime: number;
  private isPaused: boolean = false;
  private pausePromise: Promise<void> | null = null;
  private pauseResolver: (() => void) | null = null;
  
  constructor() {
    this.abortController = new AbortController();
    this.startTime = Date.now();
  }
  
  /**
   * 작업 중단
   */
  abort(): void {
    this.abortController.abort();
  }
  
  /**
   * 중단 시그널 반환
   */
  get signal(): AbortSignal {
    return this.abortController.signal;
  }
  
  /**
   * 경과 시간 반환 (ms)
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
  
  /**
   * 작업 일시 중지
   */
  pause(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      this.pausePromise = new Promise<void>(resolve => {
        this.pauseResolver = resolve;
      });
    }
  }
  
  /**
   * 작업 재개
   */
  resume(): void {
    if (this.isPaused && this.pauseResolver) {
      this.isPaused = false;
      this.pauseResolver();
      this.pausePromise = null;
      this.pauseResolver = null;
    }
  }
  
  /**
   * 일시 중지 상태인 경우 재개될 때까지 대기
   */
  async waitIfPaused(): Promise<void> {
    if (this.isPaused && this.pausePromise) {
      await this.pausePromise;
    }
  }
  
  /**
   * 일시 중지 상태 확인
   */
  get paused(): boolean {
    return this.isPaused;
  }
  
  /**
   * 중단 상태 확인
   */
  get aborted(): boolean {
    return this.abortController.signal.aborted;
  }
} 