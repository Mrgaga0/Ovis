import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * 에이전트 상태 enum
 */
export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  COMPLETED = 'completed'
}

/**
 * 에이전트 메타데이터 인터페이스
 */
export interface AgentMetadata {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: AgentStatus;
  createdAt: Date;
  updatedAt: Date;
  config: Record<string, any>;
}

/**
 * 에이전트 실행 결과 인터페이스
 */
export interface AgentResult {
  success: boolean;
  data?: any;
  error?: Error;
  executionTime?: number;
  metadata?: Record<string, any>;
}

/**
 * 에이전트 로그 레벨 enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info', 
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 에이전트 로그 항목 인터페이스
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  agentId: string;
  metadata?: Record<string, any>;
}

/**
 * 에이전트 메시지 인터페이스
 */
export interface IAgentMessage {
  id: string;
  content: string;
  role: 'user' | 'system' | 'agent';
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 에이전트 응답 인터페이스
 */
export interface IAgentResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

/**
 * 에이전트 옵션 인터페이스
 */
export interface IAgentOptions {
  id?: string;
  name?: string;
  type?: string;
  capabilities?: string[];
  settings?: Record<string, any>;
  timeout?: number;
  maxRetries?: number;
}

/**
 * 에이전트 통계 인터페이스
 */
export interface IAgentStats {
  messagesProcessed: number;
  successRate: number;
  avgResponseTime: number;
  errorCount: number;
  lastActive: number;
}

/**
 * 모든 에이전트의 기본 클래스
 * 다양한 타입의 에이전트가 상속받아 확장합니다.
 */
export abstract class BaseAgent extends EventEmitter {
  protected metadata: AgentMetadata;
  protected logs: LogEntry[] = [];
  protected maxLogEntries: number = 1000;
  protected id: string;
  protected name: string;
  protected type: string;
  protected capabilities: string[];
  protected settings: Record<string, any>;
  protected status: AgentStatus;
  protected timeout: number;
  protected maxRetries: number;
  protected stats: IAgentStats;
  protected messageHistory: IAgentMessage[];
  
  /**
   * 생성자
   * @param name 에이전트 이름
   * @param type 에이전트 타입
   * @param description 에이전트 설명
   * @param config 설정 객체
   */
  constructor(
    name: string,
    type: string,
    description: string = '',
    config: Record<string, any> = {}
  ) {
    super();
    
    this.metadata = {
      id: uuidv4(),
      name,
      description,
      type,
      status: AgentStatus.IDLE,
      createdAt: new Date(),
      updatedAt: new Date(),
      config
    };
    
    this.id = this.metadata.id;
    this.name = this.metadata.name;
    this.type = this.metadata.type;
    this.capabilities = config.capabilities || [];
    this.settings = config.settings || {};
    this.timeout = config.timeout || 30000; // 30초 기본 타임아웃
    this.maxRetries = config.maxRetries || 3;
    this.status = this.metadata.status;
    this.messageHistory = [];
    this.stats = {
      messagesProcessed: 0,
      successRate: 0,
      avgResponseTime: 0,
      errorCount: 0,
      lastActive: Date.now(),
    };
    
    this.initialize();
  }
  
  /**
   * 에이전트 초기화 메서드
   * 하위 클래스에서 오버라이드할 수 있음
   */
  protected initialize(): void {
    this.emit('initialized', { agentId: this.id });
  }
  
  /**
   * 에이전트 ID 가져오기
   */
  public getId(): string {
    return this.metadata.id;
  }
  
  /**
   * 에이전트 이름 가져오기
   */
  public getName(): string {
    return this.metadata.name;
  }
  
  /**
   * 에이전트 설명 가져오기
   */
  public getDescription(): string {
    return this.metadata.description || '';
  }
  
  /**
   * 에이전트 타입 가져오기
   */
  public getType(): string {
    return this.metadata.type;
  }
  
  /**
   * 에이전트 상태 가져오기
   */
  public getStatus(): AgentStatus {
    return this.metadata.status;
  }
  
  /**
   * 에이전트 메타데이터 가져오기
   */
  public getMetadata(): AgentMetadata {
    return { ...this.metadata };
  }
  
  /**
   * 에이전트 설정 가져오기
   */
  public getConfig(): Record<string, any> {
    return { ...this.metadata.config };
  }
  
  /**
   * 에이전트 로그 가져오기
   * @param limit 반환할 최대 로그 수 (기본: 100)
   * @param level 필터링할 로그 레벨 (기본: 모든 레벨)
   */
  public getLogs(limit: number = 100, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-limit);
  }
  
  /**
   * 에이전트 이름 설정
   * @param name 새 이름
   */
  public setName(name: string): void {
    this.metadata.name = name;
    this.metadata.updatedAt = new Date();
  }
  
  /**
   * 에이전트 설명 설정
   * @param description 새 설명
   */
  public setDescription(description: string): void {
    this.metadata.description = description;
    this.metadata.updatedAt = new Date();
  }
  
  /**
   * 에이전트 설정 업데이트
   * @param config 새 설정 객체 (기존 설정과 병합됨)
   */
  public updateConfig(config: Record<string, any>): void {
    this.metadata.config = {
      ...this.metadata.config,
      ...config
    };
    this.metadata.updatedAt = new Date();
  }
  
  /**
   * 에이전트 상태 설정
   * @param status 새 상태
   */
  protected setStatus(status: AgentStatus): void {
    if (this.metadata.status !== status) {
      const previousStatus = this.metadata.status;
      this.metadata.status = status;
      this.metadata.updatedAt = new Date();
      
      this.emit('status-changed', {
        agentId: this.metadata.id,
        previousStatus,
        newStatus: status
      });
      
      this.log(LogLevel.INFO, `상태 변경: ${previousStatus} → ${status}`);
    }
  }
  
  /**
   * 로그 항목 추가
   * @param level 로그 레벨
   * @param message 로그 메시지
   * @param metadata 추가 메타데이터
   */
  protected log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      agentId: this.metadata.id,
      metadata
    };
    
    this.logs.push(logEntry);
    
    // 최대 로그 수 제한
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }
    
    this.emit('log', logEntry);
  }
  
  /**
   * 에이전트 실행
   * @param input 에이전트에 전달할 입력 데이터
   */
  public async run(input?: any): Promise<AgentResult> {
    if (this.metadata.status === AgentStatus.RUNNING) {
      return {
        success: false,
        error: new Error('에이전트가 이미 실행 중입니다.')
      };
    }
    
    this.setStatus(AgentStatus.RUNNING);
    const startTime = Date.now();
    
    try {
      this.log(LogLevel.INFO, '에이전트 실행 시작', { input });
      this.emit('start', { agentId: this.metadata.id, input });
      
      const result = await this.execute(input);
      
      const executionTime = Date.now() - startTime;
      this.log(LogLevel.INFO, '에이전트 실행 완료', {
        executionTime,
        success: result.success
      });
      
      this.setStatus(AgentStatus.COMPLETED);
      
      this.emit('complete', {
        agentId: this.metadata.id,
        result,
        executionTime
      });
      
      return {
        ...result,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.log(LogLevel.ERROR, `에이전트 실행 오류: ${err.message}`, {
        error: err,
        executionTime
      });
      
      this.setStatus(AgentStatus.ERROR);
      
      this.emit('error', {
        agentId: this.metadata.id,
        error: err,
        executionTime
      });
      
      return {
        success: false,
        error: err,
        executionTime
      };
    }
  }
  
  /**
   * 에이전트 실행 일시 중지
   */
  public pause(): boolean {
    if (this.metadata.status !== AgentStatus.RUNNING) {
      return false;
    }
    
    this.setStatus(AgentStatus.PAUSED);
    this.emit('pause', { agentId: this.metadata.id });
    return true;
  }
  
  /**
   * 일시 중지된 에이전트 재개
   */
  public resume(): boolean {
    if (this.metadata.status !== AgentStatus.PAUSED) {
      return false;
    }
    
    this.setStatus(AgentStatus.RUNNING);
    this.emit('resume', { agentId: this.metadata.id });
    return true;
  }
  
  /**
   * 에이전트 중지 및 리셋
   */
  public stop(): boolean {
    if (this.metadata.status !== AgentStatus.RUNNING && 
        this.metadata.status !== AgentStatus.PAUSED) {
      return false;
    }
    
    this.setStatus(AgentStatus.IDLE);
    this.emit('stop', { agentId: this.metadata.id });
    return true;
  }
  
  /**
   * 에이전트 저장을 위한 직렬화
   */
  public serialize(): string {
    return JSON.stringify({
      metadata: this.metadata,
      logs: this.logs
    });
  }
  
  /**
   * 에이전트 정보 얻기
   */
  public getInfo(): Record<string, any> {
    return {
      id: this.metadata.id,
      name: this.metadata.name,
      type: this.metadata.type,
      description: this.metadata.description,
      status: this.metadata.status,
      stats: { ...this.stats },
      config: { ...this.metadata.config },
      createdAt: this.metadata.createdAt,
      updatedAt: this.metadata.updatedAt
    };
  }
  
  /**
   * 에이전트 설정 업데이트
   */
  public updateSettings(settings: Record<string, any>): void {
    this.settings = { ...this.settings, ...settings };
    this.emit('settings-updated', { agentId: this.id, settings: this.settings });
  }
  
  /**
   * 에이전트 통계 얻기
   */
  public getStats(): IAgentStats {
    return this.stats;
  }
  
  /**
   * 메시지 기록 얻기
   */
  public getMessageHistory(): IAgentMessage[] {
    return [...this.messageHistory];
  }
  
  /**
   * 에이전트 실행 로직
   * 하위 클래스에서 구현해야 함
   * @param input 에이전트에 전달할 입력 데이터
   */
  protected abstract execute(input?: any): Promise<AgentResult>;
} 