import { AgentRegistry } from './AgentRegistry';
import { IAgentMessage, IAgentResponse } from './BaseAgent';

export interface ICoordinationTask {
  id: string;
  type: string;
  agents: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: any;
  results?: Map<string, IAgentResponse>;
  createdAt: number;
  updatedAt: number;
}

export interface ICoordinationOptions {
  maxConcurrentTasks?: number;
  defaultTimeout?: number;
  maxRetries?: number;
}

export class AgentCoordinator {
  private static instance: AgentCoordinator;
  private registry: AgentRegistry;
  private tasks: Map<string, ICoordinationTask>;
  private activeTaskCount: number;
  private maxConcurrentTasks: number;
  private defaultTimeout: number;
  private maxRetries: number;

  private constructor(options?: ICoordinationOptions) {
    this.registry = AgentRegistry.getInstance();
    this.tasks = new Map();
    this.activeTaskCount = 0;
    this.maxConcurrentTasks = options?.maxConcurrentTasks || 5;
    this.defaultTimeout = options?.defaultTimeout || 30000; // 30초
    this.maxRetries = options?.maxRetries || 3;
  }

  public static getInstance(options?: ICoordinationOptions): AgentCoordinator {
    if (!AgentCoordinator.instance) {
      AgentCoordinator.instance = new AgentCoordinator(options);
    }
    return AgentCoordinator.instance;
  }

  public async createTask(type: string, agents: string[], data: any): Promise<ICoordinationTask> {
    // 모든 에이전트가 존재하는지 확인
    for (const agentId of agents) {
      if (!this.registry.getAgent(agentId)) {
        throw new Error(`에이전트 ID '${agentId}'를 찾을 수 없습니다.`);
      }
    }

    const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const task: ICoordinationTask = {
      id: taskId,
      type,
      agents,
      status: 'pending',
      data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.tasks.set(taskId, task);
    this.scheduleTask();
    
    return task;
  }

  public getTask(taskId: string): ICoordinationTask | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(): ICoordinationTask[] {
    return Array.from(this.tasks.values());
  }

  public getTasksByStatus(status: ICoordinationTask['status']): ICoordinationTask[] {
    return this.getAllTasks().filter(task => task.status === status);
  }

  private async scheduleTask(): Promise<void> {
    // 동시 작업 제한에 도달한 경우
    if (this.activeTaskCount >= this.maxConcurrentTasks) {
      return;
    }

    // 대기 중인 작업 찾기
    const pendingTasks = this.getTasksByStatus('pending');
    if (pendingTasks.length === 0) {
      return;
    }

    // 다음 작업 실행
    const nextTask = pendingTasks[0];
    this.executeTask(nextTask.id);
  }

  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return;
    }

    // 작업 상태 업데이트
    task.status = 'running';
    task.updatedAt = Date.now();
    this.activeTaskCount++;

    try {
      // 각 에이전트에 메시지 전송
      const results = new Map<string, IAgentResponse>();
      
      for (const agentId of task.agents) {
        const message: IAgentMessage = {
          type: task.type,
          content: task.data,
          metadata: {
            timestamp: Date.now(),
            sender: 'coordinator',
            recipient: agentId
          }
        };

        // 변수 초기화
        let response: IAgentResponse = {
          success: false,
          error: '초기 응답이 설정되지 않음',
          metadata: {
            timestamp: Date.now(),
            processingTime: 0
          }
        };
        let retries = 0;
        
        // 재시도 메커니즘
        do {
          try {
            response = await this.sendMessageWithTimeout(agentId, message, this.defaultTimeout);
            break;
          } catch (error) {
            retries++;
            if (retries >= this.maxRetries) {
              throw error;
            }
            // 지수 백오프 재시도
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
          }
        } while (retries < this.maxRetries);

        results.set(agentId, response);
      }

      // 작업 완료 처리
      task.status = 'completed';
      task.results = results;
      task.updatedAt = Date.now();
    } catch (error) {
      // 작업 실패 처리
      task.status = 'failed';
      task.updatedAt = Date.now();
      console.error(`작업 실행 오류 (${taskId}):`, error);
    } finally {
      this.activeTaskCount--;
      this.scheduleTask(); // 다음 작업 스케줄링
    }
  }

  private async sendMessageWithTimeout(
    agentId: string, 
    message: IAgentMessage, 
    timeout: number
  ): Promise<IAgentResponse> {
    return Promise.race([
      this.registry.sendMessage(agentId, message),
      new Promise<IAgentResponse>((_, reject) => {
        setTimeout(() => reject(new Error(`메시지 처리 시간 초과 (${timeout}ms)`)), timeout);
      })
    ]);
  }

  public reset(): void {
    this.tasks.clear();
    this.activeTaskCount = 0;
  }
} 