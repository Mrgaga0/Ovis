import { EventEmitter } from 'events';

/**
 * 에이전트 타입 정의
 */
export type AgentType = 'task' | 'design' | 'content' | 'code' | 'analysis' | 'test' | 'research' | 'websocket';

/**
 * 에이전트 설정 인터페이스
 */
export interface IAgentConfig {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities?: string[];
  settings?: Record<string, any>;
  metadata?: {
    created: number;
    lastActive: number;
    version: string;
  };
  maxRetries?: number;
  timeout?: number;
}

/**
 * 에이전트 메시지 인터페이스
 */
export interface IAgentMessage {
  type: string;
  content: any;
  metadata?: {
    timestamp: number;
    sender: string;
    recipient?: string;
    priority?: number;
    id?: string;
    correlationId?: string;
  };
}

/**
 * 에이전트 응답 인터페이스
 */
export interface IAgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingTime: number;
    timestamp: number;
    correlationId?: string;
  };
}

/**
 * 에이전트 상태 정의
 */
export enum AgentStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  SHUTDOWN = 'shutdown'
}

/**
 * 에이전트 로그 레벨 정의
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 기본 에이전트 추상 클래스
 */
export abstract class BaseAgent extends EventEmitter {
  protected config: IAgentConfig;
  protected state: Map<string, any>;
  protected isRunning: boolean;
  protected status: AgentStatus;
  protected messageHandlers: Map<string, Array<(message: IAgentMessage) => Promise<any>>>;
  protected metrics: {
    messagesProcessed: number;
    totalProcessingTime: number;
    errors: number;
    lastActive: number;
  };
  protected retryDelays: number[];

  /**
   * BaseAgent 생성자
   */
  constructor(config: IAgentConfig) {
    super();
    
    // 필수 설정 확인
    if (!config.id) throw new Error('에이전트 ID는 필수입니다.');
    if (!config.type) throw new Error('에이전트 타입은 필수입니다.');
    if (!config.name) throw new Error('에이전트 이름은 필수입니다.');
    
    this.config = {
      ...config,
      capabilities: config.capabilities || [],
      settings: config.settings || {},
      metadata: config.metadata || {
        created: Date.now(),
        lastActive: Date.now(),
        version: '1.0.0'
      },
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000 // 기본 30초
    };
    
    // 상태 초기화
    this.state = new Map();
    this.isRunning = false;
    this.status = AgentStatus.INITIALIZING;
    
    // 메시지 핸들러
    this.messageHandlers = new Map();
    
    // 메트릭 초기화
    this.metrics = {
      messagesProcessed: 0,
      totalProcessingTime: 0,
      errors: 0,
      lastActive: Date.now()
    };
    
    // 재시도 지연 시간 (ms): 지수 백오프
    this.retryDelays = [1000, 2000, 5000, 10000, 30000];
    
    // 시스템 이벤트 구독
    this.on('error', this.handleError.bind(this));
  }

  /**
   * 에이전트 설정 조회
   */
  public getConfig(): IAgentConfig {
    return { ...this.config };
  }

  /**
   * 에이전트 ID 조회
   */
  public getId(): string {
    return this.config.id;
  }

  /**
   * 에이전트 이름 조회
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * 에이전트 상태 조회
   */
  public getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * 에이전트 능력 목록 조회
   */
  public getCapabilities(): string[] {
    return this.config.capabilities ?? [];
  }

  /**
   * 에이전트 특정 능력 보유 여부 확인
   */
  public hasCapability(capability: string): boolean {
    return (this.config.capabilities || []).includes(capability);
  }

  /**
   * 성능 메트릭 조회
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * 에이전트 초기화
   */
  public async initialize(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    try {
      this.status = AgentStatus.INITIALIZING;
      this.log(LogLevel.INFO, `에이전트 초기화 시작: ${this.config.name} (${this.config.id})`);
      
      await this.onInitialize();
      
      this.isRunning = true;
      this.status = AgentStatus.READY;
      this.updateLastActive();
      
      this.log(LogLevel.INFO, `에이전트 초기화 완료: ${this.config.name} (${this.config.id})`);
      this.emit('initialized', { agentId: this.config.id, timestamp: Date.now() });
    } catch (error) {
      this.status = AgentStatus.ERROR;
      this.log(LogLevel.ERROR, `에이전트 초기화 실패: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 에이전트 종료
   */
  public async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    try {
      this.log(LogLevel.INFO, `에이전트 종료 시작: ${this.config.name} (${this.config.id})`);
      
      await this.onShutdown();
      
      this.isRunning = false;
      this.status = AgentStatus.SHUTDOWN;
      this.updateLastActive();
      
      this.log(LogLevel.INFO, `에이전트 종료 완료: ${this.config.name} (${this.config.id})`);
      this.emit('shutdown', { agentId: this.config.id, timestamp: Date.now() });
    } catch (error) {
      this.log(LogLevel.ERROR, `에이전트 종료 실패: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 메시지 처리
   */
  public async processMessage(message: IAgentMessage): Promise<IAgentResponse> {
    if (!this.isRunning) {
      await this.initialize();
    }

    // 메시지 처리 시작 시간
    const startTime = Date.now();
    this.updateLastActive();
    this.status = AgentStatus.BUSY;
    
    // 상관 ID (correlation ID) 유지 또는 생성
    const correlationId = message.metadata?.correlationId || `corr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    this.log(LogLevel.INFO, `메시지 처리 시작: ${message.type}`, {
      correlationId,
      messageType: message.type,
      sender: message.metadata?.sender
    });
    
    try {
      // 등록된 핸들러 확인
      const handlers = this.messageHandlers.get(message.type);
      let response: any;
      
      if (handlers && handlers.length > 0) {
        // 등록된 핸들러로 처리
        const results = await Promise.all(handlers.map(handler => handler(message)));
        response = results.length === 1 ? results[0] : results;
      } else {
        // 기본 처리 메서드 사용
        response = await this.onProcessMessage(message);
      }
      
      // 처리 시간 업데이트
      const processingTime = Date.now() - startTime;
      this.metrics.messagesProcessed++;
      this.metrics.totalProcessingTime += processingTime;
      
      this.status = AgentStatus.READY;
      this.log(LogLevel.INFO, `메시지 처리 완료: ${message.type} (${processingTime}ms)`, { correlationId });
      
      return {
        success: true,
        data: response,
        metadata: {
          processingTime,
          timestamp: Date.now(),
          correlationId
        }
      };
    } catch (error) {
      // 에러 처리
      const processingTime = Date.now() - startTime;
      this.metrics.errors++;
      
      this.status = AgentStatus.ERROR;
      this.log(LogLevel.ERROR, `메시지 처리 실패: ${message.type}`, {
        correlationId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // 에러 이벤트 발생
      this.emit('messageError', {
        messageType: message.type,
        error,
        correlationId
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          processingTime,
          timestamp: Date.now(),
          correlationId
        }
      };
    } finally {
      this.updateLastActive();
    }
  }

  /**
   * 에이전트 정보 조회
   */
  public getInfo(): {
    id: string;
    name: string;
    type: AgentType;
    status: AgentStatus;
    capabilities: string[];
    metrics: typeof this.metrics;
  } {
    return {
      id: this.config.id,
      name: this.config.name,
      type: this.config.type,
      status: this.status,
      capabilities: this.getCapabilities(),
      metrics: { ...this.metrics }
    };
  }

  /**
   * 메시지 핸들러 등록
   */
  public registerMessageHandler(
    messageType: string, 
    handler: (message: IAgentMessage) => Promise<any>
  ): void {
    const handlers = this.messageHandlers.get(messageType) || [];
    handlers.push(handler);
    this.messageHandlers.set(messageType, handlers);
    
    this.log(LogLevel.DEBUG, `메시지 핸들러 등록: ${messageType}`);
  }

  /**
   * 메시지 핸들러 해제
   */
  public unregisterMessageHandler(
    messageType: string, 
    handler: (message: IAgentMessage) => Promise<any>
  ): boolean {
    const handlers = this.messageHandlers.get(messageType);
    if (!handlers) return false;
    
    const index = handlers.indexOf(handler);
    if (index === -1) return false;
    
    handlers.splice(index, 1);
    if (handlers.length === 0) {
      this.messageHandlers.delete(messageType);
    } else {
      this.messageHandlers.set(messageType, handlers);
    }
    
    this.log(LogLevel.DEBUG, `메시지 핸들러 해제: ${messageType}`);
    return true;
  }

  /**
   * 로깅
   */
  protected log(level: LogLevel, message: string, data?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      agent: this.config.id,
      message,
      ...data
    };
    
    // 로그 이벤트 발생
    this.emit('log', logEntry);
    
    // 콘솔 출력
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[${timestamp}] [${level}] [${this.config.id}] ${message}`, data);
        break;
      case LogLevel.INFO:
        console.info(`[${timestamp}] [${level}] [${this.config.id}] ${message}`, data);
        break;
      case LogLevel.WARN:
        console.warn(`[${timestamp}] [${level}] [${this.config.id}] ${message}`, data);
        break;
      case LogLevel.ERROR:
        console.error(`[${timestamp}] [${level}] [${this.config.id}] ${message}`, data);
        break;
    }
  }

  /**
   * 마지막 활성 시간 업데이트
   */
  protected updateLastActive(): void {
    const now = Date.now();
    this.metrics.lastActive = now;
    if (this.config.metadata) {
      this.config.metadata.lastActive = now;
    }
  }

  /**
   * 에러 처리
   */
  protected handleError(error: Error): void {
    this.log(LogLevel.ERROR, `에이전트 에러: ${error.message}`, {
      stack: error.stack,
      name: error.name
    });
    
    // 에이전트 상태 업데이트
    this.status = AgentStatus.ERROR;
    this.metrics.errors++;
  }

  /**
   * 지연 함수
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 재시도 정책을 적용한 함수 실행
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelays?: number[];
      shouldRetry?: (error: any) => boolean;
      onRetry?: (attempt: number, error: any) => void;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.config.maxRetries ?? 3;
    const retryDelays = options.retryDelays ?? this.retryDelays;
    const shouldRetry = options.shouldRetry ?? (() => true);
    const onRetry = options.onRetry ?? (() => {});
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt >= maxRetries || !shouldRetry(error)) {
          throw error;
        }
        
        const delay = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
        
        onRetry(attempt + 1, error);
        this.log(LogLevel.WARN, `함수 실행 재시도 (${attempt + 1}/${maxRetries}): ${delay}ms 후 재시도`, {
          error: error instanceof Error ? error.message : String(error)
        });
        
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * 타임아웃이 있는 함수 실행
   */
  protected async withTimeout<T>(
    fn: () => Promise<T>,
    timeout: number = this.config.timeout || 30000
  ): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`작업 시간 초과 (${timeout}ms)`));
      }, timeout);
      
      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * BaseAgent를 상속받는 클래스가 구현해야 하는 메서드들
   */
  protected abstract onInitialize(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
  protected abstract onProcessMessage(message: IAgentMessage): Promise<any>;
} 