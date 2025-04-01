import { BaseAgent, AgentResult, LogLevel } from './BaseAgent';

/**
 * 작업(태스크) 상태 enum
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 작업(태스크) 우선순위 enum
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 작업(태스크) 인터페이스
 */
export interface ITask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
  tags?: string[];
  assignedTo?: string;
  parentTaskId?: string;
  dependencies?: string[];
  progress?: number;
  metadata?: Record<string, any>;
}

/**
 * 작업(태스크) 결과 인터페이스
 */
export interface ITaskResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: Error;
  completedAt: Date;
  executionTime: number;
  metadata?: Record<string, any>;
}

/**
 * 작업(태스크) 에이전트 설정 인터페이스
 */
export interface TaskAgentConfig {
  maxConcurrentTasks?: number;
  defaultTaskPriority?: TaskPriority;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff?: boolean;
  };
  executionTimeout?: number;
  taskFetchInterval?: number;
}

/**
 * 작업(태스크) 에이전트 클래스
 * 하나 이상의 태스크를 관리하고 실행하는 에이전트
 */
export class TaskAgent extends BaseAgent {
  private tasks: Map<string, ITask> = new Map();
  private taskResults: Map<string, ITaskResult> = new Map();
  private runningTasks: Set<string> = new Set();
  private taskQueue: string[] = [];
  private taskFetchIntervalId: NodeJS.Timeout | null = null;
  
  /**
   * 생성자
   * @param name 에이전트 이름
   * @param config 에이전트 설정
   */
  constructor(
    name: string,
    config: TaskAgentConfig = {}
  ) {
    super(
      name,
      'task',
      '작업을 실행하고 관리하는 에이전트',
      {
        maxConcurrentTasks: config.maxConcurrentTasks || 5,
        defaultTaskPriority: config.defaultTaskPriority || TaskPriority.MEDIUM,
        retryPolicy: {
          maxRetries: config.retryPolicy?.maxRetries || 3,
          retryDelay: config.retryPolicy?.retryDelay || 5000,
          exponentialBackoff: config.retryPolicy?.exponentialBackoff || true
        },
        executionTimeout: config.executionTimeout || 60000, // 1분
        taskFetchInterval: config.taskFetchInterval || 30000, // 30초
        ...config
      }
    );
  }
  
  /**
   * 작업(태스크) 추가
   * @param task 추가할 작업
   */
  public addTask(task: Omit<ITask, 'createdAt' | 'updatedAt' | 'status'>): string {
    const taskId = task.id;
    
    if (this.tasks.has(taskId)) {
      throw new Error(`작업 ID ${taskId}는 이미 존재합니다.`);
    }
    
    const newTask: ITask = {
      ...task,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      priority: task.priority || this.getConfig().defaultTaskPriority as TaskPriority
    };
    
    this.tasks.set(taskId, newTask);
    this.taskQueue.push(taskId);
    
    // 우선순위에 따라 정렬
    this.sortTaskQueue();
    
    this.log(LogLevel.INFO, `작업 추가됨: ${taskId}`, { task: newTask });
    this.emit('task-added', { taskId, task: newTask });
    
    return taskId;
  }
  
  /**
   * 작업(태스크) 가져오기
   * @param taskId 작업 ID
   */
  public getTask(taskId: string): ITask | undefined {
    return this.tasks.get(taskId);
  }
  
  /**
   * 모든 작업(태스크) 가져오기
   */
  public getAllTasks(): ITask[] {
    return Array.from(this.tasks.values());
  }
  
  /**
   * 작업(태스크) 상태별 가져오기
   * @param status 작업 상태
   */
  public getTasksByStatus(status: TaskStatus): ITask[] {
    return this.getAllTasks().filter(task => task.status === status);
  }
  
  /**
   * 작업(태스크) 우선순위별 가져오기
   * @param priority 작업 우선순위
   */
  public getTasksByPriority(priority: TaskPriority): ITask[] {
    return this.getAllTasks().filter(task => task.priority === priority);
  }
  
  /**
   * 작업(태스크) 결과 가져오기
   * @param taskId 작업 ID
   */
  public getTaskResult(taskId: string): ITaskResult | undefined {
    return this.taskResults.get(taskId);
  }
  
  /**
   * 작업(태스크) 상태 업데이트
   * @param taskId 작업 ID
   * @param status 새 상태
   * @param metadata 추가 메타데이터
   */
  public updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    metadata?: Record<string, any>
  ): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }
    
    const previousStatus = task.status;
    
    // 상태 업데이트
    task.status = status;
    task.updatedAt = new Date();
    
    // 추가 필드 업데이트
    if (status === TaskStatus.IN_PROGRESS && !task.startedAt) {
      task.startedAt = new Date();
    } else if ((status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) && !task.completedAt) {
      task.completedAt = new Date();
    }
    
    // 메타데이터 업데이트
    if (metadata) {
      task.metadata = {
        ...task.metadata,
        ...metadata
      };
    }
    
    // 이벤트 발생
    this.emit('task-status-changed', {
      taskId,
      previousStatus,
      newStatus: status,
      task
    });
    
    this.log(LogLevel.INFO, `작업 상태 변경: ${taskId} (${previousStatus} → ${status})`, {
      taskId,
      previousStatus,
      newStatus: status
    });
    
    return true;
  }
  
  /**
   * 작업(태스크) 진행 상황 업데이트
   * @param taskId 작업 ID
   * @param progress 진행률 (0-100)
   */
  public updateTaskProgress(taskId: string, progress: number): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }
    
    // 진행률 유효성 검사
    const validProgress = Math.max(0, Math.min(100, progress));
    
    // 진행률 업데이트
    task.progress = validProgress;
    task.updatedAt = new Date();
    
    // 이벤트 발생
    this.emit('task-progress-updated', {
      taskId,
      progress: validProgress,
      task
    });
    
    return true;
  }
  
  /**
   * 작업(태스크) 삭제
   * @param taskId 작업 ID
   */
  public removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }
    
    // 실행 중인 작업은 삭제할 수 없음
    if (task.status === TaskStatus.IN_PROGRESS) {
      throw new Error(`실행 중인 작업 ${taskId}는 삭제할 수 없습니다.`);
    }
    
    // 맵에서 제거
    this.tasks.delete(taskId);
    
    // 큐에서 제거
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
    }
    
    // 이벤트 발생
    this.emit('task-removed', { taskId, task });
    
    return true;
  }
  
  /**
   * 작업(태스크) 실행
   * @param taskId 작업 ID
   */
  public async executeTask(taskId: string): Promise<ITaskResult> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`작업 ${taskId}를 찾을 수 없습니다.`);
    }
    
    // 이미 실행 중인 작업인지 확인
    if (this.runningTasks.has(taskId)) {
      throw new Error(`작업 ${taskId}는 이미 실행 중입니다.`);
    }
    
    // 의존성 확인
    if (task.dependencies && task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        const depTask = this.tasks.get(depId);
        
        if (!depTask) {
          throw new Error(`의존성 작업 ${depId}를 찾을 수 없습니다.`);
        }
        
        if (depTask.status !== TaskStatus.COMPLETED) {
          throw new Error(`의존성 작업 ${depId}가 완료되지 않았습니다.`);
        }
      }
    }
    
    // 실행 중인 작업 목록에 추가
    this.runningTasks.add(taskId);
    
    // 작업 상태 업데이트
    this.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
    
    const startTime = Date.now();
    let error: Error | undefined;
    let result: any;
    
    try {
      // 실행 타임아웃 설정
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          reject(new Error(`작업 ${taskId} 실행 시간 초과`));
        }, this.getConfig().executionTimeout as number);
      });
      
      // 실제 작업 실행
      result = await Promise.race([
        this.processTask(task),
        timeoutPromise
      ]);
      
      // 작업 완료 처리
      this.updateTaskStatus(taskId, TaskStatus.COMPLETED);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      this.log(LogLevel.ERROR, `작업 실행 오류: ${taskId}`, { error });
      
      // 작업 실패 처리
      this.updateTaskStatus(taskId, TaskStatus.FAILED, { error: error.message });
    } finally {
      // 실행 중인 작업 목록에서 제거
      this.runningTasks.delete(taskId);
    }
    
    const executionTime = Date.now() - startTime;
    
    // 작업 결과 저장
    const taskResult: ITaskResult = {
      taskId,
      success: !error,
      data: result,
      error,
      completedAt: new Date(),
      executionTime,
      metadata: {
        ...task.metadata
      }
    };
    
    this.taskResults.set(taskId, taskResult);
    
    // 이벤트 발생
    this.emit('task-executed', {
      taskId,
      result: taskResult,
      task
    });
    
    return taskResult;
  }
  
  /**
   * 작업(태스크) 처리 - 하위 클래스에서 구현하거나 재정의할 수 있음
   * @param task 처리할 작업
   */
  protected async processTask(task: ITask): Promise<any> {
    // 기본 구현은 단순히 타이머로 지연
    const delay = (task.metadata?.delay as number) || 1000;
    
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        resolve({
          message: `작업 ${task.id} 완료`,
          taskId: task.id,
          processingTime: delay
        });
      }, delay);
    });
  }
  
  /**
   * 작업(태스크) 큐 정렬
   */
  private sortTaskQueue(): void {
    // 우선순위 값 매핑
    const priorityValues: Record<TaskPriority, number> = {
      [TaskPriority.CRITICAL]: 3,
      [TaskPriority.HIGH]: 2,
      [TaskPriority.MEDIUM]: 1,
      [TaskPriority.LOW]: 0
    };
    
    this.taskQueue.sort((a, b) => {
      const taskA = this.tasks.get(a);
      const taskB = this.tasks.get(b);
      
      if (!taskA || !taskB) {
        return 0;
      }
      
      // 우선순위로 정렬
      const priorityDiff = priorityValues[taskB.priority] - priorityValues[taskA.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // 마감일이 있는 경우 마감일 기준으로 정렬
      if (taskA.dueDate && taskB.dueDate) {
        return taskA.dueDate.getTime() - taskB.dueDate.getTime();
      } else if (taskA.dueDate) {
        return -1;
      } else if (taskB.dueDate) {
        return 1;
      }
      
      // 생성일 기준으로 정렬
      return taskA.createdAt.getTime() - taskB.createdAt.getTime();
    });
  }
  
  /**
   * 작업(태스크) 처리 시작
   */
  public startTaskProcessing(): void {
    if (this.taskFetchIntervalId) {
      return;
    }
    
    // 작업 처리 간격 설정
    const interval = this.getConfig().taskFetchInterval as number;
    
    this.taskFetchIntervalId = setInterval(() => {
      this.processNextTasks();
    }, interval);
    
    // 즉시 첫 번째 처리 시작
    this.processNextTasks();
    
    this.log(LogLevel.INFO, '작업 처리 시작됨');
  }
  
  /**
   * 작업(태스크) 처리 중지
   */
  public stopTaskProcessing(): void {
    if (this.taskFetchIntervalId) {
      clearInterval(this.taskFetchIntervalId);
      this.taskFetchIntervalId = null;
      
      this.log(LogLevel.INFO, '작업 처리 중지됨');
    }
  }
  
  /**
   * 다음 작업(태스크) 처리
   */
  private async processNextTasks(): Promise<void> {
    const maxConcurrent = this.getConfig().maxConcurrentTasks as number;
    const availableSlots = maxConcurrent - this.runningTasks.size;
    
    if (availableSlots <= 0 || this.taskQueue.length === 0) {
      return;
    }
    
    // 처리할 수 있는 최대 작업 수 계산
    const tasksToProcess = Math.min(availableSlots, this.taskQueue.length);
    
    // 다음 작업 처리
    for (let i = 0; i < tasksToProcess; i++) {
      const taskId = this.taskQueue.shift();
      
      if (!taskId) {
        break;
      }
      
      const task = this.tasks.get(taskId);
      
      if (!task) {
        continue;
      }
      
      // 이미 처리 중이거나 완료된 작업 건너뛰기
      if (task.status !== TaskStatus.PENDING) {
        continue;
      }
      
      // 비동기로 작업 실행
      this.executeTask(taskId).catch(error => {
        this.log(LogLevel.ERROR, `작업 ${taskId} 실행 중 오류 발생`, { error });
      });
    }
  }
  
  /**
   * 에이전트 실행 - BaseAgent 메서드 구현
   */
  protected async execute(input?: any): Promise<AgentResult> {
    // 태스크 에이전트 실행
    this.startTaskProcessing();
    
    // 입력으로 태스크를 받으면 추가
    if (input && typeof input === 'object') {
      if (Array.isArray(input)) {
        // 배열인 경우 여러 태스크 추가
        for (const taskData of input) {
          try {
            this.addTask(taskData);
          } catch (error) {
            this.log(LogLevel.ERROR, '태스크 추가 중 오류', { error });
          }
        }
      } else {
        // 객체인 경우 단일 태스크 추가
        try {
          this.addTask(input);
        } catch (error) {
          this.log(LogLevel.ERROR, '태스크 추가 중 오류', { error });
        }
      }
    }
    
    return {
      success: true,
      data: {
        message: '태스크 에이전트 실행 시작됨',
        activeTaskCount: this.runningTasks.size,
        pendingTaskCount: this.taskQueue.length,
        totalTaskCount: this.tasks.size
      }
    };
  }
  
  /**
   * 모든 작업 통계 가져오기
   */
  public getTaskStats(): Record<string, any> {
    const tasks = this.getAllTasks();
    
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    
    // 상태별, 우선순위별 개수 집계
    for (const task of tasks) {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
    }
    
    return {
      total: tasks.length,
      running: this.runningTasks.size,
      pending: this.taskQueue.length,
      statusCounts,
      priorityCounts,
      completedCount: statusCounts[TaskStatus.COMPLETED] || 0,
      failedCount: statusCounts[TaskStatus.FAILED] || 0,
      averageExecutionTime: this.calculateAverageExecutionTime()
    };
  }
  
  /**
   * 평균 실행 시간 계산
   */
  private calculateAverageExecutionTime(): number {
    const results = Array.from(this.taskResults.values());
    
    if (results.length === 0) {
      return 0;
    }
    
    const totalTime = results.reduce((sum, result) => sum + result.executionTime, 0);
    return totalTime / results.length;
  }
  
  /**
   * 죽은 작업(태스크) 정리
   * 실행 중 상태로 멈춘 작업을 정리
   */
  public cleanupDeadTasks(): number {
    const tasks = this.getAllTasks();
    let cleanedCount = 0;
    
    for (const task of tasks) {
      // 실행 중 상태로 오래된 작업 확인
      if (task.status === TaskStatus.IN_PROGRESS && task.startedAt) {
        const now = new Date().getTime();
        const startTime = task.startedAt.getTime();
        const executionTime = now - startTime;
        
        // 타임아웃보다 오래 실행 중인 작업은 실패로 표시
        if (executionTime > (this.getConfig().executionTimeout as number) * 2) {
          this.updateTaskStatus(task.id, TaskStatus.FAILED, {
            error: '작업 실행 시간 초과로 중단됨'
          });
          
          // 실행 중 목록에서 제거
          this.runningTasks.delete(task.id);
          
          cleanedCount++;
        }
      }
    }
    
    return cleanedCount;
  }
} 