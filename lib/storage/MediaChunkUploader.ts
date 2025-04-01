import { EventEmitter } from 'events';

/**
 * 청크 상태 열거형
 */
export enum ChunkState {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  COMPLETE = 'complete',
  FAILED = 'failed'
}

/**
 * 청크 인터페이스
 */
export interface IChunk {
  id: number;
  file: File;
  start: number;
  end: number;
  state: ChunkState;
  retries: number;
  progress: number;
  data?: Blob;
}

/**
 * 업로드 상태 열거형
 */
export enum UploadState {
  PREPARING = 'preparing',
  UPLOADING = 'uploading',
  PAUSED = 'paused',
  COMPLETE = 'complete',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 미디어 청크 업로드 이벤트 열거형
 */
export enum UploadEventType {
  UPLOAD_STARTED = 'upload_started',
  UPLOAD_PROGRESS = 'upload_progress',
  UPLOAD_PAUSED = 'upload_paused',
  UPLOAD_RESUMED = 'upload_resumed',
  UPLOAD_COMPLETE = 'upload_complete',
  UPLOAD_FAILED = 'upload_failed',
  UPLOAD_CANCELLED = 'upload_cancelled',
  CHUNK_PROGRESS = 'chunk_progress',
  CHUNK_COMPLETE = 'chunk_complete',
  CHUNK_FAILED = 'chunk_failed',
  CHUNK_RETRY = 'chunk_retry'
}

/**
 * 미디어 청크 업로드 설정 인터페이스
 */
export interface IMediaChunkUploaderOptions {
  url: string;
  chunkSize?: number;
  maxRetries?: number;
  maxParallelUploads?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
  onComplete?: (fileUrl: string) => void;
  onError?: (error: Error) => void;
}

/**
 * 미디어 청크 업로더
 * 
 * 대용량 미디어 파일을 청크 단위로 업로드하는 기능을 제공합니다.
 * 진행 상태 추적, 일시 중지/재개, 오류 처리 기능을 포함합니다.
 */
export class MediaChunkUploader extends EventEmitter {
  private file: File;
  private chunks: IChunk[] = [];
  private options: Required<IMediaChunkUploaderOptions>;
  private uploadState: UploadState = UploadState.PREPARING;
  private uploadId: string | null = null;
  private activeUploads: number = 0;
  private totalProgress: number = 0;
  private abortControllers: Map<number, AbortController> = new Map();
  
  /**
   * 생성자
   * @param file 업로드할 파일
   * @param options 업로드 옵션
   */
  constructor(file: File, options: IMediaChunkUploaderOptions) {
    super();
    
    this.file = file;
    this.options = {
      url: options.url,
      chunkSize: options.chunkSize || 1024 * 1024 * 5, // 5MB
      maxRetries: options.maxRetries || 3,
      maxParallelUploads: options.maxParallelUploads || 3,
      retryDelay: options.retryDelay || 2000,
      headers: options.headers || {},
      metadata: options.metadata || {},
      onProgress: options.onProgress || (() => {}),
      onComplete: options.onComplete || (() => {}),
      onError: options.onError || (() => {})
    };
    
    // 청크 생성
    this.createChunks();
  }
  
  /**
   * 파일을 청크로 분할
   */
  private createChunks(): void {
    const size = this.file.size;
    const chunkSize = this.options.chunkSize;
    const chunksCount = Math.ceil(size / chunkSize);
    this.chunks = [];
    
    for (let i = 0; i < chunksCount; i++) {
      const start = i * chunkSize;
      const end = Math.min(size, start + chunkSize);
      
      this.chunks.push({
        id: i,
        file: this.file,
        start,
        end,
        state: ChunkState.PENDING,
        retries: 0,
        progress: 0
      });
    }
  }
  
  /**
   * 업로드 시작
   */
  public async start(): Promise<void> {
    // 이미 업로드 중인 경우 중지
    if (this.uploadState === UploadState.UPLOADING) {
      return;
    }
    
    this.uploadState = UploadState.UPLOADING;
    
    try {
      // 업로드 세션 초기화
      this.uploadId = await this.initializeUpload();
      
      // 이벤트 발행
      this.emit(UploadEventType.UPLOAD_STARTED, {
        file: this.file,
        uploadId: this.uploadId,
        totalChunks: this.chunks.length
      });
      
      // 청크 업로드 시작
      this.uploadChunks();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('업로드 초기화 중 오류 발생'));
    }
  }
  
  /**
   * 업로드 세션 초기화
   */
  private async initializeUpload(): Promise<string> {
    try {
      const response = await fetch(`${this.options.url}/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers
        },
        body: JSON.stringify({
          filename: this.file.name,
          contentType: this.file.type,
          size: this.file.size,
          totalChunks: this.chunks.length,
          metadata: this.options.metadata
        })
      });
      
      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }
      
      const data = await response.json();
      return data.uploadId;
    } catch (error) {
      console.error('업로드 초기화 실패:', error);
      throw error;
    }
  }
  
  /**
   * 청크 업로드 처리
   */
  private uploadChunks(): void {
    if (this.uploadState !== UploadState.UPLOADING) {
      return;
    }
    
    // 대기 중인 청크 찾기
    const pendingChunks = this.chunks.filter(chunk => chunk.state === ChunkState.PENDING);
    
    if (pendingChunks.length === 0 && this.activeUploads === 0) {
      // 모든 청크 업로드 완료
      this.finalizeUpload();
      return;
    }
    
    // 병렬 업로드 제한 준수
    const availableSlots = Math.max(0, this.options.maxParallelUploads - this.activeUploads);
    const chunksToUpload = pendingChunks.slice(0, availableSlots);
    
    // 선택된 청크 업로드
    for (const chunk of chunksToUpload) {
      this.uploadChunk(chunk);
    }
  }
  
  /**
   * 개별 청크 업로드
   */
  private async uploadChunk(chunk: IChunk): Promise<void> {
    // 업로드 상태가 아닌 경우 중지
    if (this.uploadState !== UploadState.UPLOADING) {
      return;
    }
    
    // 청크 상태 업데이트
    chunk.state = ChunkState.UPLOADING;
    this.activeUploads++;
    
    // 데이터 슬라이스 읽기
    if (!chunk.data) {
      chunk.data = this.file.slice(chunk.start, chunk.end);
    }
    
    // 진행률 모니터링을 위한 AbortController 생성
    const controller = new AbortController();
    this.abortControllers.set(chunk.id, controller);
    
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('uploadId', this.uploadId!);
      formData.append('chunkId', chunk.id.toString());
      formData.append('totalChunks', this.chunks.length.toString());
      formData.append('chunk', chunk.data);
      
      // 업로드 요청
      const response = await fetch(`${this.options.url}/chunk`, {
        method: 'POST',
        headers: {
          ...this.options.headers
        },
        body: formData,
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`청크 업로드 오류: ${response.status}`);
      }
      
      // 청크 업로드 성공
      chunk.state = ChunkState.COMPLETE;
      chunk.progress = 100;
      this.activeUploads--;
      
      // 이벤트 발행
      this.emit(UploadEventType.CHUNK_COMPLETE, {
        chunkId: chunk.id,
        uploadId: this.uploadId
      });
      
      // 진행률 업데이트
      this.updateProgress();
      
      // 다음 청크 업로드
      this.uploadChunks();
    } catch (error) {
      // AbortController에 의한 중단이 아닌 경우 재시도
      if (error instanceof Error && error.name !== 'AbortError') {
        await this.handleChunkError(chunk, error);
      }
    } finally {
      this.abortControllers.delete(chunk.id);
    }
  }
  
  /**
   * 청크 오류 처리
   */
  private async handleChunkError(chunk: IChunk, error: Error): Promise<void> {
    chunk.retries++;
    
    // 이벤트 발행
    this.emit(UploadEventType.CHUNK_FAILED, {
      chunkId: chunk.id,
      uploadId: this.uploadId,
      error: error.message,
      retries: chunk.retries,
      maxRetries: this.options.maxRetries
    });
    
    if (chunk.retries <= this.options.maxRetries) {
      // 재시도
      chunk.state = ChunkState.PENDING;
      this.activeUploads--;
      
      // 이벤트 발행
      this.emit(UploadEventType.CHUNK_RETRY, {
        chunkId: chunk.id,
        uploadId: this.uploadId,
        retryCount: chunk.retries,
        delay: this.options.retryDelay
      });
      
      // 지연 후 재시도
      await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
      this.uploadChunks();
    } else {
      // 최대 재시도 횟수 초과
      chunk.state = ChunkState.FAILED;
      this.activeUploads--;
      
      // 업로드 실패 처리
      this.uploadState = UploadState.FAILED;
      
      // 이벤트 발행
      this.emit(UploadEventType.UPLOAD_FAILED, {
        uploadId: this.uploadId,
        error: `청크 ${chunk.id} 업로드 실패: 최대 재시도 횟수 초과`
      });
      
      // 오류 콜백 호출
      this.options.onError(new Error(`청크 ${chunk.id} 업로드 실패: 최대 재시도 횟수 초과`));
    }
  }
  
  /**
   * 진행률 업데이트
   */
  private updateProgress(): void {
    // 전체 진행률 계산
    let totalProgress = 0;
    
    for (const chunk of this.chunks) {
      if (chunk.state === ChunkState.COMPLETE) {
        totalProgress += chunk.end - chunk.start;
      } else if (chunk.state === ChunkState.UPLOADING) {
        totalProgress += (chunk.end - chunk.start) * (chunk.progress / 100);
      }
    }
    
    // 백분율로 변환
    const progress = Math.floor((totalProgress / this.file.size) * 100);
    this.totalProgress = progress;
    
    // 이벤트 발행
    this.emit(UploadEventType.UPLOAD_PROGRESS, {
      uploadId: this.uploadId,
      progress,
      uploaded: totalProgress,
      total: this.file.size
    });
    
    // 콜백 호출
    this.options.onProgress(progress);
  }
  
  /**
   * 업로드 마무리
   */
  private async finalizeUpload(): Promise<void> {
    try {
      const response = await fetch(`${this.options.url}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers
        },
        body: JSON.stringify({
          uploadId: this.uploadId
        })
      });
      
      if (!response.ok) {
        throw new Error(`업로드 마무리 오류: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 업로드 완료
      this.uploadState = UploadState.COMPLETE;
      
      // 이벤트 발행
      this.emit(UploadEventType.UPLOAD_COMPLETE, {
        uploadId: this.uploadId,
        fileUrl: data.fileUrl,
        file: this.file
      });
      
      // 완료 콜백 호출
      this.options.onComplete(data.fileUrl);
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('업로드 마무리 중 오류 발생'));
    }
  }
  
  /**
   * 오류 처리
   */
  private handleError(error: Error): void {
    this.uploadState = UploadState.FAILED;
    
    // 이벤트 발행
    this.emit(UploadEventType.UPLOAD_FAILED, {
      uploadId: this.uploadId,
      error: error.message
    });
    
    // 오류 콜백 호출
    this.options.onError(error);
  }
  
  /**
   * 업로드 일시 중지
   */
  public pause(): void {
    if (this.uploadState !== UploadState.UPLOADING) {
      return;
    }
    
    this.uploadState = UploadState.PAUSED;
    
    // 활성 업로드 중단
    for (const controller of Array.from(this.abortControllers.values())) {
      controller.abort();
    }
    
    // 업로드 중인 청크를 대기 상태로 변경
    for (const chunk of this.chunks) {
      if (chunk.state === ChunkState.UPLOADING) {
        chunk.state = ChunkState.PENDING;
      }
    }
    
    this.activeUploads = 0;
    
    // 이벤트 발행
    this.emit(UploadEventType.UPLOAD_PAUSED, {
      uploadId: this.uploadId,
      progress: this.totalProgress
    });
  }
  
  /**
   * 업로드 재개
   */
  public resume(): void {
    if (this.uploadState !== UploadState.PAUSED) {
      return;
    }
    
    this.uploadState = UploadState.UPLOADING;
    
    // 이벤트 발행
    this.emit(UploadEventType.UPLOAD_RESUMED, {
      uploadId: this.uploadId,
      progress: this.totalProgress
    });
    
    // 업로드 재개
    this.uploadChunks();
  }
  
  /**
   * 업로드 취소
   */
  public async cancel(): Promise<void> {
    // 진행 중인 업로드 중단
    for (const controller of Array.from(this.abortControllers.values())) {
      controller.abort();
    }
    
    this.activeUploads = 0;
    this.uploadState = UploadState.CANCELLED;
    
    // 서버에 취소 요청
    if (this.uploadId) {
      try {
        await fetch(`${this.options.url}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.options.headers
          },
          body: JSON.stringify({
            uploadId: this.uploadId
          })
        });
      } catch (error) {
        console.error('업로드 취소 요청 실패:', error);
      }
    }
    
    // 이벤트 발행
    this.emit(UploadEventType.UPLOAD_CANCELLED, {
      uploadId: this.uploadId,
      file: this.file
    });
  }
  
  /**
   * 현재 상태 가져오기
   */
  public getState(): UploadState {
    return this.uploadState;
  }
  
  /**
   * 현재 진행률 가져오기
   */
  public getProgress(): number {
    return this.totalProgress;
  }
  
  /**
   * 청크 상태 가져오기
   */
  public getChunksStatus(): Array<{id: number, state: ChunkState, progress: number}> {
    return this.chunks.map(chunk => ({
      id: chunk.id,
      state: chunk.state,
      progress: chunk.progress
    }));
  }
} 