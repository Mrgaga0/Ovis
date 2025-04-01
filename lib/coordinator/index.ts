import { AgentRegistry } from '../agents/registry';
import { IAgentMessage, IAgentResponse } from '../agents/base-agent';

export interface ICoordinatorConfig {
  maxConcurrentTasks?: number;
  retryAttempts?: number;
  retryDelay?: number;
  taskTimeout?: number;
}

export class AgentCoordinator {
  private static instance: AgentCoordinator;
  private registry: AgentRegistry;
  private config: ICoordinatorConfig;
  private taskQueue: Map<string, Promise<void>>;
  private isProcessing: boolean;

  private constructor(config: ICoordinatorConfig = {}) {
    this.registry = AgentRegistry.getInstance();
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 5,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      taskTimeout: config.taskTimeout || 30000,
    };
    this.taskQueue = new Map();
    this.isProcessing = false;
  }

  public static getInstance(config?: ICoordinatorConfig): AgentCoordinator {
    if (!AgentCoordinator.instance) {
      AgentCoordinator.instance = new AgentCoordinator(config);
    }
    return AgentCoordinator.instance;
  }

  public async coordinateTask(task: IAgentMessage): Promise<IAgentResponse> {
    if (this.taskQueue.size >= this.config.maxConcurrentTasks!) {
      throw new Error('Maximum concurrent tasks reached');
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const taskPromise = this.processTask(taskId, task);

    this.taskQueue.set(taskId, taskPromise);

    try {
      await taskPromise;
      return {
        success: true,
        data: { taskId },
        metadata: {
          processingTime: 0,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          processingTime: 0,
          timestamp: Date.now(),
        },
      };
    } finally {
      this.taskQueue.delete(taskId);
    }
  }

  private async processTask(taskId: string, task: IAgentMessage): Promise<void> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.config.retryAttempts!) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Task timeout'));
          }, this.config.taskTimeout!);
        });

        const response = await Promise.race([
          this.registry.sendMessage(task.metadata?.recipient || '', task),
          timeoutPromise,
        ]);

        if (response.success) {
          return;
        }

        throw new Error(response.error || 'Task failed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        attempts++;

        if (attempts < this.config.retryAttempts!) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay!));
        }
      }
    }

    throw lastError || new Error('Max retry attempts reached');
  }

  public async shutdown(): Promise<void> {
    // 모든 진행 중인 작업이 완료될 때까지 대기
    await Promise.all(Array.from(this.taskQueue.values()));
    await this.registry.shutdown();
  }

  public getTaskQueueSize(): number {
    return this.taskQueue.size;
  }

  public getConfig(): ICoordinatorConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ICoordinatorConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }
} 