import { BaseAgent, IAgentConfig, IAgentMessage, IAgentResponse } from '../base-agent';
import { v4 as uuidv4 } from 'uuid';

/**
 * 작업 상태 타입
 */
type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 작업 인터페이스
 */
interface ITask {
  id: string;
  type: string;
  priority: number;
  status: TaskStatus;
  data: any;
  error?: {
    message: string;
    stack?: string;
    timestamp: number;
  };
  retries: number;
  processingTime?: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * 작업 에이전트 설정 인터페이스
 */
interface ITaskAgentConfig extends IAgentConfig {
  maxQueueSize?: number;
  maxConcurrentTasks?: number;
  maxRetries?: number;
  defaultTaskTimeout?: number;
}

/**
 * TaskAgent 클래스
 * 작업 생성, 관리, 실행을 담당하는 특화된 에이전트
 */
export class TaskAgent extends BaseAgent {
  private tasks: Map<string, ITask>;
  private processingQueue: ITask[];
  private activeTasksCount: number;
  
  private maxQueueSize: number;
  private maxConcurrentTasks: number;
  private maxRetries: number;
  private defaultTaskTimeout: number;
  
  private taskTypeHandlers: Map<string, (task: ITask) => Promise<any>>;
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * TaskAgent 생성자
   */
  constructor(config: ITaskAgentConfig) {
    super({
      ...config,
      capabilities: [...(config.capabilities || []), 'task_management', 'task_execution'],
    });
    
    this.tasks = new Map();
    this.processingQueue = [];
    this.activeTasksCount = 0;
    
    // 설정값 적용
    this.maxQueueSize = config.maxQueueSize || 1000;
    this.maxConcurrentTasks = config.maxConcurrentTasks || 5;
    this.maxRetries = config.maxRetries || 3;
    this.defaultTaskTimeout = config.defaultTaskTimeout || 30000; // 30초
    
    this.taskTypeHandlers = new Map();
  }

  /**
   * 작업 타입별 핸들러 등록
   */
  public registerTaskHandler(taskType: string, handler: (task: ITask) => Promise<any>): void {
    this.taskTypeHandlers.set(taskType, handler);
  }

  /**
   * 초기화 시 호출되는 메서드
   */
  protected async onInitialize(): Promise<void> {
    // 주기적으로 큐를 처리하는 인터벌 설정
    this.processingInterval = setInterval(() => this.processQueue(), 1000);
    console.log(`TaskAgent ${this.config.name} initialized`);
  }

  /**
   * 종료 시 호출되는 메서드
   */
  protected async onShutdown(): Promise<void> {
    // 인터벌 정리
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    // 작업 큐 정리
    this.tasks.clear();
    this.processingQueue = [];
    console.log(`TaskAgent ${this.config.name} shutdown`);
  }

  /**
   * 메시지 처리
   */
  protected async onProcessMessage(message: IAgentMessage): Promise<any> {
    if (!message || !message.type) {
      throw new Error('유효하지 않은 메시지 형식');
    }
    
    try {
      switch (message.type) {
        case 'CREATE_TASK':
          return this.createTask(message.content);
        case 'GET_TASK':
          return this.getTask(message.content.taskId);
        case 'UPDATE_TASK':
          return this.updateTask(message.content);
        case 'DELETE_TASK':
          return this.deleteTask(message.content.taskId);
        case 'LIST_TASKS':
          return this.listTasks(message.content);
        case 'PROCESS_TASK':
          return this.processTask(message.content.taskId);
        case 'REGISTER_TASK_HANDLER':
          this.registerTaskHandler(message.content.taskType, message.content.handler);
          return { success: true };
        default:
          throw new Error(`지원하지 않는 메시지 타입: ${message.type}`);
      }
    } catch (error) {
      console.error(`메시지 처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      throw error;
    }
  }

  /**
   * 작업 생성
   */
  private async createTask(taskData: any): Promise<ITask> {
    // 유효성 검사
    if (!taskData || !taskData.type) {
      throw new Error('작업 타입은 필수 항목입니다.');
    }
    
    // 큐 크기 제한 검사
    if (this.tasks.size >= this.maxQueueSize) {
      throw new Error('작업 큐가 가득 찼습니다. 나중에 다시 시도해주세요.');
    }
    
    const task: ITask = {
      id: `task_${uuidv4()}`,
      type: taskData.type,
      priority: typeof taskData.priority === 'number' ? taskData.priority : 0,
      status: 'pending',
      data: taskData.data || {},
      retries: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tasks.set(task.id, task);
    this.processingQueue.push(task);
    
    // 우선순위에 따라 큐 정렬
    this.sortQueue();
    
    return task;
  }

  /**
   * 작업 조회
   */
  private async getTask(taskId: string): Promise<ITask | null> {
    if (!taskId) {
      throw new Error('작업 ID는 필수 항목입니다.');
    }
    return this.tasks.get(taskId) || null;
  }

  /**
   * 작업 업데이트
   */
  private async updateTask(taskData: { id: string; data: any }): Promise<ITask | null> {
    if (!taskData || !taskData.id) {
      throw new Error('작업 ID는 필수 항목입니다.');
    }
    
    const task = this.tasks.get(taskData.id);
    if (!task) return null;
    
    // 이미 처리 완료된 작업은 수정 불가
    if (task.status === 'completed' || task.status === 'failed') {
      throw new Error(`'${task.status}' 상태의 작업은 수정할 수 없습니다.`);
    }

    const updatedTask: ITask = {
      ...task,
      data: { ...task.data, ...taskData.data },
      updatedAt: Date.now(),
    };

    this.tasks.set(task.id, updatedTask);
    
    // 큐에 있는 작업도 업데이트
    const queueIndex = this.processingQueue.findIndex(t => t.id === task.id);
    if (queueIndex !== -1) {
      this.processingQueue[queueIndex] = updatedTask;
      this.sortQueue();
    }
    
    return updatedTask;
  }

  /**
   * 작업 삭제
   */
  private async deleteTask(taskId: string): Promise<boolean> {
    if (!taskId) {
      throw new Error('작업 ID는 필수 항목입니다.');
    }
    
    const task = this.tasks.get(taskId);
    if (!task) return false;
    
    // 실행 중인 작업은 삭제 불가
    if (task.status === 'processing') {
      throw new Error('실행 중인 작업은 삭제할 수 없습니다.');
    }

    this.tasks.delete(taskId);
    this.processingQueue = this.processingQueue.filter(t => t.id !== taskId);
    return true;
  }

  /**
   * 작업 목록 조회
   */
  private async listTasks(filters?: { status?: string; type?: string; limit?: number; offset?: number }): Promise<ITask[]> {
    let tasks = Array.from(this.tasks.values());

    if (filters) {
      if (filters.status) {
        tasks = tasks.filter(task => task.status === filters.status);
      }
      if (filters.type) {
        tasks = tasks.filter(task => task.type === filters.type);
      }
      
      // 정렬: 최신 작업 우선
      tasks.sort((a, b) => b.createdAt - a.createdAt);
      
      // 페이지네이션
      if (typeof filters.offset === 'number' && typeof filters.limit === 'number') {
        tasks = tasks.slice(filters.offset, filters.offset + filters.limit);
      } else if (typeof filters.limit === 'number') {
        tasks = tasks.slice(0, filters.limit);
      }
    }

    return tasks;
  }

  /**
   * 단일 작업 처리
   */
  private async processTask(taskId: string): Promise<ITask | null> {
    if (!taskId) {
      throw new Error('작업 ID는 필수 항목입니다.');
    }
    
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    // 이미 처리 중이거나 완료된 작업은 처리 불가
    if (task.status !== 'pending') {
      throw new Error(`'${task.status}' 상태의 작업은 처리할 수 없습니다.`);
    }

    try {
      const updatedTask: ITask = {
        ...task,
        status: 'processing',
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.tasks.set(task.id, updatedTask);
      this.activeTasksCount++;

      // 작업 실행
      const startTime = Date.now();
      let result;
      
      try {
        result = await this.executeTask(updatedTask);
      } catch (error) {
        throw error;
      } finally {
        const processingTime = Date.now() - startTime;
        
        // 작업 결과 업데이트
        const completedTask: ITask = {
          ...updatedTask,
          status: 'completed',
          processingTime,
          completedAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        if (result) {
          completedTask.data = {
            ...completedTask.data,
            result,
          };
        }

        this.tasks.set(task.id, completedTask);
        this.activeTasksCount--;
        return completedTask;
      }
    } catch (error) {
      const errorInfo = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
      };
      
      // 재시도 로직
      if (task.retries < this.maxRetries) {
        const retryTask: ITask = {
          ...task,
          status: 'pending',
          retries: task.retries + 1,
          error: errorInfo,
          updatedAt: Date.now(),
        };
        
        this.tasks.set(task.id, retryTask);
        this.processingQueue.push(retryTask);
        this.sortQueue();
        
        this.activeTasksCount--;
        return retryTask;
      } else {
        // 최대 재시도 횟수 초과
        const failedTask: ITask = {
          ...task,
          status: 'failed',
          error: errorInfo,
          updatedAt: Date.now(),
        };

        this.tasks.set(task.id, failedTask);
        this.activeTasksCount--;
        return failedTask;
      }
    }
  }

  /**
   * 작업 큐 처리
   */
  private async processQueue(): Promise<void> {
    // 동시 실행 작업 수 제한 검사
    if (this.activeTasksCount >= this.maxConcurrentTasks) {
      return;
    }
    
    // 처리할 작업이 없으면 종료
    if (this.processingQueue.length === 0) {
      return;
    }
    
    // 동시에 실행할 수 있는 최대 작업 수 계산
    const availableSlots = this.maxConcurrentTasks - this.activeTasksCount;
    const tasksToProcess = this.processingQueue.slice(0, availableSlots);
    
    // 선택된 작업들을 큐에서 제거
    this.processingQueue = this.processingQueue.slice(availableSlots);
    
    // 작업 처리
    for (const task of tasksToProcess) {
      // 비동기로 처리하고 결과는 기다리지 않음
      this.processTask(task.id).catch(error => {
        console.error(`작업 처리 오류 (${task.id}): ${error}`);
      });
    }
  }

  /**
   * 작업 실행
   */
  private async executeTask(task: ITask): Promise<any> {
    // 작업 타입별 핸들러 검색
    const handler = this.taskTypeHandlers.get(task.type);
    
    if (handler) {
      // 작업 타임아웃 적용
      return Promise.race([
        handler(task),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('작업 실행 시간 초과')), this.defaultTaskTimeout);
        })
      ]);
    } else {
      // 기본 작업 실행 로직
      console.log(`작업 실행 중: ${task.id} (${task.type})`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 예시: 1초 대기
      return { executed: true };
    }
  }

  /**
   * 우선순위에 따라 큐 정렬
   */
  private sortQueue(): void {
    this.processingQueue.sort((a, b) => b.priority - a.priority);
  }
} 