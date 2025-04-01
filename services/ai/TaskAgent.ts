import { v4 as uuidv4 } from 'uuid';
import { BaseAgent, IAgentMessage, IAgentResponse, IAgentOptions } from './BaseAgent';

export interface ITask {
  id: string;
  type: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskAgentOptions extends IAgentOptions {
  maxConcurrentTasks?: number;
}

export class TaskAgent extends BaseAgent {
  private tasks: Map<string, ITask>;
  private taskQueue: string[];
  private activeTaskCount: number;
  private maxConcurrentTasks: number;

  constructor(options?: TaskAgentOptions) {
    super(options);
    this.tasks = new Map();
    this.taskQueue = [];
    this.activeTaskCount = 0;
    this.maxConcurrentTasks = options?.maxConcurrentTasks || 3;
    
    // 메시지 핸들러 등록
    this.registerHandler('CREATE_TASK', this.handleCreateTask.bind(this));
    this.registerHandler('GET_TASK', this.handleGetTask.bind(this));
    this.registerHandler('UPDATE_TASK', this.handleUpdateTask.bind(this));
    this.registerHandler('DELETE_TASK', this.handleDeleteTask.bind(this));
    this.registerHandler('LIST_TASKS', this.handleListTasks.bind(this));
    this.registerHandler('PROCESS_TASK', this.handleProcessTask.bind(this));
  }

  protected async onInitialize(): Promise<void> {
    // 초기화 로직 구현
    console.log(`TaskAgent(${this.id}) 초기화 됨`);
  }

  protected async onShutdown(): Promise<void> {
    // 종료 로직 구현
    console.log(`TaskAgent(${this.id}) 종료 됨`);
  }

  private async handleCreateTask(message: IAgentMessage): Promise<IAgentResponse> {
    try {
      const { type, priority = 0, data } = message.content;
      
      if (!type) {
        return {
          success: false,
          error: '작업 타입은 필수입니다.',
          metadata: {
            processingTime: 0,
            timestamp: Date.now()
          }
        };
      }

      const taskId = uuidv4();
      const task: ITask = {
        id: taskId,
        type,
        priority,
        status: 'pending',
        data,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.tasks.set(taskId, task);
      this.addToQueue(taskId);
      
      return {
        success: true,
        data: task,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `작업 생성 오류: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    }
  }

  private async handleGetTask(message: IAgentMessage): Promise<IAgentResponse> {
    try {
      const { taskId } = message.content;
      
      if (!taskId) {
        return {
          success: false,
          error: '작업 ID는 필수입니다.',
          metadata: {
            processingTime: 0,
            timestamp: Date.now()
          }
        };
      }

      const task = this.tasks.get(taskId);
      
      if (!task) {
        return {
          success: false,
          error: `작업 ID '${taskId}'를 찾을 수 없습니다.`,
          metadata: {
            processingTime: 0,
            timestamp: Date.now()
          }
        };
      }
      
      return {
        success: true,
        data: task,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `작업 조회 오류: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    }
  }

  private async handleUpdateTask(message: IAgentMessage): Promise<IAgentResponse> {
    try {
      const { id, data } = message.content;
      
      if (!id) {
        return {
          success: false,
          error: '작업 ID는 필수입니다.',
          metadata: {
            processingTime: 0,
            timestamp: Date.now()
          }
        };
      }

      const task = this.tasks.get(id);
      
      if (!task) {
        return {
          success: false,
          error: `작업 ID '${id}'를 찾을 수 없습니다.`,
          metadata: {
            processingTime: 0,
            timestamp: Date.now()
          }
        };
      }

      // 작업 데이터 업데이트
      task.data = { ...task.data, ...data };
      task.updatedAt = Date.now();
      
      return {
        success: true,
        data: task,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `작업 업데이트 오류: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    }
  }

  private async handleDeleteTask(message: IAgentMessage): Promise<IAgentResponse> {
    try {
      const { taskId } = message.content;
      
      if (!taskId) {
        return {
          success: false,
          error: '작업 ID는 필수입니다.',
          metadata: {
            processingTime: 0,
            timestamp: Date.now()
          }
        };
      }

      const deleted = this.tasks.delete(taskId);
      
      // 큐에서도 제거
      const queueIndex = this.taskQueue.indexOf(taskId);
      if (queueIndex > -1) {
        this.taskQueue.splice(queueIndex, 1);
      }
      
      return {
        success: deleted,
        data: deleted,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `작업 삭제 오류: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    }
  }

  private async handleListTasks(message: IAgentMessage): Promise<IAgentResponse> {
    try {
      const { status, type } = message.content;
      
      let tasks = Array.from(this.tasks.values());
      
      // 필터링
      if (status) {
        tasks = tasks.filter(task => task.status === status);
      }
      
      if (type) {
        tasks = tasks.filter(task => task.type === type);
      }
      
      return {
        success: true,
        data: tasks,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `작업 목록 조회 오류: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    }
  }

  private async handleProcessTask(message: IAgentMessage): Promise<IAgentResponse> {
    try {
      const { taskId } = message.content;
      
      if (!taskId) {
        return {
          success: false,
          error: '작업 ID는 필수입니다.',
          metadata: {
            processingTime: 0,
            timestamp: Date.now()
          }
        };
      }

      const task = this.tasks.get(taskId);
      
      if (!task) {
        return {
          success: false,
          error: `작업 ID '${taskId}'를 찾을 수 없습니다.`,
          metadata: {
            processingTime: 0,
            timestamp: Date.now()
          }
        };
      }

      // 작업이 대기 상태가 아닌 경우
      if (task.status !== 'pending') {
        return {
          success: false,
          error: `작업의 상태가 'pending'이 아닙니다. 현재 상태: ${task.status}`,
          metadata: {
            processingTime: 0,
            timestamp: Date.now()
          }
        };
      }

      // 작업 실행
      this.processTask(taskId);
      
      return {
        success: true,
        data: { message: `작업 '${taskId}' 처리 중` },
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `작업 처리 오류: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    }
  }

  private addToQueue(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // 우선순위 기반으로 큐에 삽입
    let inserted = false;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTask = this.tasks.get(this.taskQueue[i]);
      if (queuedTask && task.priority < queuedTask.priority) {
        this.taskQueue.splice(i, 0, taskId);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.taskQueue.push(taskId);
    }

    // 작업 스케줄링
    this.scheduleTasks();
  }

  private async scheduleTasks(): Promise<void> {
    // 동시 작업 제한에 도달한 경우
    if (this.activeTaskCount >= this.maxConcurrentTasks) {
      return;
    }

    // 대기 중인 작업이 없는 경우
    if (this.taskQueue.length === 0) {
      return;
    }

    // 다음 작업 실행
    const nextTaskId = this.taskQueue.shift();
    if (nextTaskId) {
      this.processTask(nextTaskId);
    }
  }

  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return;
    }

    // 작업 상태 업데이트
    task.status = 'processing';
    task.updatedAt = Date.now();
    this.activeTaskCount++;

    try {
      // 작업 유형에 따른 처리 로직
      const result = await this.executeTaskByType(task);
      
      // 작업 완료 처리
      task.status = 'completed';
      task.result = result;
      task.updatedAt = Date.now();
    } catch (error) {
      // 작업 실패 처리
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.updatedAt = Date.now();
      console.error(`작업 처리 오류 (${taskId}):`, error);
    } finally {
      this.activeTaskCount--;
      this.scheduleTasks(); // 다음 작업 스케줄링
    }
  }

  private async executeTaskByType(task: ITask): Promise<any> {
    // 작업 유형에 따른 처리 로직 구현
    // 실제 구현에서는 다양한 작업 유형에 따른 로직을 추가
    switch (task.type) {
      case 'data_processing':
        // 데이터 처리 로직
        return this.processData(task.data);
        
      case 'notification':
        // 알림 로직
        return this.sendNotification(task.data);
        
      default:
        // 기본 처리 로직
        return { message: `'${task.type}' 유형의 작업 처리 완료` };
    }
  }

  private async processData(data: any): Promise<any> {
    // 데이터 처리 로직 구현
    // 임시 구현: 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { processed: data };
  }

  private async sendNotification(data: any): Promise<any> {
    // 알림 로직 구현
    // 임시 구현: 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 500));
    return { sent: true, message: data.message };
  }
} 