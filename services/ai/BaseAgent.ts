import { v4 as uuidv4 } from 'uuid';

export interface IAgentMessage {
  type: string;
  content: any;
  metadata?: {
    timestamp: number;
    sender: string;
    recipient?: string;
    priority?: number;
  };
}

export interface IAgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingTime: number;
    timestamp: number;
  };
}

export interface IAgentOptions {
  id?: string;
  name?: string;
}

type MessageHandler = (message: IAgentMessage) => Promise<IAgentResponse>;

export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected status: 'initializing' | 'running' | 'paused' | 'error' | 'shutdown';
  protected messageHandlers: Map<string, MessageHandler>;
  protected startTime: number;

  constructor(options?: IAgentOptions) {
    this.id = options?.id || uuidv4();
    this.name = options?.name || `agent-${this.id.substring(0, 8)}`;
    this.status = 'initializing';
    this.messageHandlers = new Map();
    this.startTime = Date.now();
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getStatus(): string {
    return this.status;
  }

  public getUptime(): number {
    return Date.now() - this.startTime;
  }

  public async initialize(): Promise<void> {
    try {
      await this.onInitialize();
      this.status = 'running';
    } catch (error) {
      this.status = 'error';
      console.error(`초기화 오류 (${this.name}):`, error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    try {
      await this.onShutdown();
      this.status = 'shutdown';
    } catch (error) {
      this.status = 'error';
      console.error(`종료 오류 (${this.name}):`, error);
      throw error;
    }
  }

  public async handleMessage(message: IAgentMessage): Promise<IAgentResponse> {
    const startTime = Date.now();
    
    try {
      if (this.status !== 'running') {
        return {
          success: false,
          error: `에이전트가 실행 중이 아닙니다. 현재 상태: ${this.status}`,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        };
      }

      const handler = this.messageHandlers.get(message.type);
      
      if (!handler) {
        return {
          success: false,
          error: `메시지 타입 '${message.type}'에 대한 핸들러가 없습니다.`,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        };
      }

      const response = await handler(message);
      
      return {
        ...response,
        metadata: {
          ...response.metadata,
          processingTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `메시지 처리 오류: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  protected registerHandler(type: string, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
} 