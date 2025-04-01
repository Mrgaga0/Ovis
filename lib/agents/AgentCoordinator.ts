import { v4 as uuidv4 } from 'uuid';
import { BaseAgent, AgentStatus, AgentResult, LogLevel, IAgentStats } from './BaseAgent';
import { AgentRegistry } from './AgentRegistry';

/**
 * 조정 작업 상태를 나타내는 enum
 */
export enum CoordinationTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 조정 작업 인터페이스
 */
export interface ICoordinationTask {
  id: string;
  name: string;
  description?: string;
  status: CoordinationTaskStatus;
  agentIds: string[];
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * 조정 전략 타입
 */
export type CoordinationStrategy = 'sequential' | 'parallel' | 'pipeline' | 'custom';

/**
 * 조정 설정 인터페이스
 */
export interface CoordinationConfig {
  strategy: CoordinationStrategy;
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  maxConcurrentTasks?: number;
  customStrategyHandler?: (
    task: ICoordinationTask,
    agents: BaseAgent[],
    coordinator: AgentCoordinator
  ) => Promise<any>;
}

/**
 * 실행 계획 인터페이스
 */
interface ExecutionPlan {
  strategy: CoordinationStrategy;
  steps: ExecutionStep[];
  metadata?: Record<string, any>;
}

/**
 * 실행 단계 인터페이스
 */
interface ExecutionStep {
  id: string;
  agentIds: string[];
  input?: any;
  dependsOn?: string[];
  metadata?: Record<string, any>;
}

/**
 * 에이전트 코디네이터 클래스
 * 여러 에이전트의 조정 및 협업 관리
 */
export class AgentCoordinator extends BaseAgent {
  private registry: AgentRegistry;
  private tasks: Map<string, ICoordinationTask> = new Map();
  private executionPlans: Map<string, ExecutionPlan> = new Map();
  private runningTasks: Set<string> = new Set();
  
  /**
   * 생성자
   * @param name 에이전트 이름
   * @param registry 에이전트 레지스트리
   * @param config 설정 (선택적)
   */
  constructor(
    name: string,
    registry: AgentRegistry,
    config: Record<string, any> = {}
  ) {
    super(
      name,
      'coordinator',
      '여러 에이전트 간의 조정을 관리하는 에이전트',
      {
        maxConcurrentTasks: 10,
        defaultStrategy: 'sequential',
        defaultTimeout: 300000, // 5분
        retryCount: 3,
        retryDelay: 5000,
        ...config
      }
    );
    
    this.registry = registry;
    
    // 에이전트 상태 변경 리스너 등록
    this.registry.on('agent-status-changed', this.handleAgentStatusChange.bind(this));
  }
  
  /**
   * 에이전트 상태 변경 처리
   * @param data 상태 변경 데이터
   */
  private handleAgentStatusChange(data: { 
    agentId: string;
    previousStatus: AgentStatus;
    newStatus: AgentStatus;
  }): void {
    const { agentId, previousStatus, newStatus } = data;
    
    this.log(LogLevel.DEBUG, `에이전트 상태 변경: ${agentId} (${previousStatus} → ${newStatus})`);
    
    // 현재 실행 중인 작업 중 영향받는 작업 확인
    for (const taskId of Array.from(this.runningTasks)) {
      const task = this.tasks.get(taskId);
      
      if (task && task.agentIds.includes(agentId)) {
        if (newStatus === AgentStatus.ERROR || newStatus === AgentStatus.COMPLETED) {
          this.log(LogLevel.WARN, `에이전트 ${agentId} 상태가 ${newStatus}로 변경되어 작업 ${taskId}에 영향을 줄 수 있습니다.`);
          
          // 필요에 따라 작업 재시도 또는 실패 처리 로직 추가
        }
      }
    }
  }
  
  /**
   * 조정 작업 생성
   * @param name 작업 이름
   * @param agentIds 참여 에이전트 ID 배열
   * @param description 작업 설명 (선택적)
   * @param metadata 추가 메타데이터 (선택적)
   */
  public createTask(
    name: string,
    agentIds: string[],
    description?: string,
    metadata?: Record<string, any>
  ): string {
    // 에이전트 존재 여부 확인
    for (const agentId of agentIds) {
      if (!this.registry.getAgent(agentId)) {
        throw new Error(`에이전트 ID ${agentId}를 찾을 수 없습니다.`);
      }
    }
    
    const taskId = uuidv4();
    
    const task: ICoordinationTask = {
      id: taskId,
      name,
      description,
      status: CoordinationTaskStatus.PENDING,
      agentIds,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata
    };
    
    this.tasks.set(taskId, task);
    
    this.log(LogLevel.INFO, `조정 작업 생성됨: ${taskId}`, { task });
    this.emit('task-created', { taskId, task });
    
    return taskId;
  }
  
  /**
   * 조정 작업 가져오기
   * @param taskId 작업 ID
   */
  public getTask(taskId: string): ICoordinationTask | undefined {
    return this.tasks.get(taskId);
  }
  
  /**
   * 모든 조정 작업 가져오기
   */
  public getAllTasks(): ICoordinationTask[] {
    return Array.from(this.tasks.values());
  }
  
  /**
   * 조정 작업 상태별 가져오기
   * @param status 작업 상태
   */
  public getTasksByStatus(status: CoordinationTaskStatus): ICoordinationTask[] {
    return this.getAllTasks().filter(task => task.status === status);
  }
  
  /**
   * 실행 계획 생성
   * @param taskId 작업 ID
   * @param strategy 조정 전략
   * @param steps 실행 단계
   */
  public createExecutionPlan(
    taskId: string,
    strategy: CoordinationStrategy = 'sequential',
    steps: ExecutionStep[] = []
  ): void {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`작업 ID ${taskId}를 찾을 수 없습니다.`);
    }
    
    // 기본 단계 생성
    if (steps.length === 0) {
      steps = this.generateDefaultSteps(task, strategy);
    }
    
    // 실행 계획 저장
    const plan: ExecutionPlan = {
      strategy,
      steps,
      metadata: {
        createdAt: new Date()
      }
    };
    
    this.executionPlans.set(taskId, plan);
    
    this.log(LogLevel.INFO, `실행 계획 생성됨: ${taskId}`, { strategy, stepsCount: steps.length });
  }
  
  /**
   * 기본 실행 단계 생성
   * @param task 조정 작업
   * @param strategy 조정 전략
   */
  private generateDefaultSteps(
    task: ICoordinationTask,
    strategy: CoordinationStrategy
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    switch (strategy) {
      case 'sequential':
        // 순차 실행 - 하나씩 순서대로 실행
        task.agentIds.forEach((agentId, index) => {
          steps.push({
            id: `step-${index}`,
            agentIds: [agentId],
            dependsOn: index > 0 ? [`step-${index - 1}`] : []
          });
        });
        break;
        
      case 'parallel':
        // 병렬 실행 - 모든 에이전트 동시 실행
        steps.push({
          id: 'parallel-step',
          agentIds: task.agentIds
        });
        break;
        
      case 'pipeline':
        // 파이프라인 실행 - 첫 번째 에이전트의 출력이 다음 에이전트의 입력
        task.agentIds.forEach((agentId, index) => {
          steps.push({
            id: `pipeline-step-${index}`,
            agentIds: [agentId],
            dependsOn: index > 0 ? [`pipeline-step-${index - 1}`] : []
          });
        });
        break;
        
      case 'custom':
        // 커스텀 전략은 외부에서 단계를 정의해야 함
        throw new Error('커스텀 전략은 수동으로 실행 단계를 정의해야 합니다.');
        
      default:
        throw new Error(`지원되지 않는 조정 전략: ${strategy}`);
    }
    
    return steps;
  }
  
  /**
   * 조정 작업 실행
   * @param taskId 작업 ID
   * @param input 입력 데이터 (선택적)
   */
  public async executeTask(
    taskId: string,
    input?: any
  ): Promise<any> {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`작업 ID ${taskId}를 찾을 수 없습니다.`);
    }
    
    if (task.status === CoordinationTaskStatus.RUNNING) {
      throw new Error(`작업 ${taskId}는 이미 실행 중입니다.`);
    }
    
    // 실행 계획 확인
    let plan = this.executionPlans.get(taskId);
    
    // 실행 계획이 없으면 기본 계획 생성
    if (!plan) {
      this.createExecutionPlan(taskId);
      plan = this.executionPlans.get(taskId)!;
    }
    
    // 작업 상태 업데이트
    task.status = CoordinationTaskStatus.RUNNING;
    task.startedAt = new Date();
    task.updatedAt = new Date();
    
    // 실행 중인 작업 목록에 추가
    this.runningTasks.add(taskId);
    
    // 이벤트 발생
    this.emit('task-started', { taskId, task });
    
    try {
      let result: any;
      
      // 전략에 따라 실행
      switch (plan.strategy) {
        case 'sequential':
          result = await this.executeSequentially(task, plan.steps, input);
          break;
          
        case 'parallel':
          result = await this.executeInParallel(task, plan.steps, input);
          break;
          
        case 'pipeline':
          result = await this.executeAsPipeline(task, plan.steps, input);
          break;
          
        case 'custom':
          // 커스텀 핸들러 확인
          const customHandler = this.getConfig().customStrategyHandler;
          
          if (!customHandler) {
            throw new Error('커스텀 전략 핸들러가 정의되지 않았습니다.');
          }
          
          // 에이전트 객체 가져오기
          const agents = task.agentIds.map(id => {
            const agent = this.registry.getAgent(id);
            if (!agent) {
              throw new Error(`에이전트 ID ${id}를 찾을 수 없습니다.`);
            }
            return agent;
          });
          
          // 커스텀 핸들러 실행
          result = await customHandler(task, agents, this);
          break;
          
        default:
          throw new Error(`지원되지 않는 조정 전략: ${plan.strategy}`);
      }
      
      // 작업 완료 처리
      task.status = CoordinationTaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.updatedAt = new Date();
      task.result = result;
      
      // 이벤트 발생
      this.emit('task-completed', { taskId, task, result });
      
      this.log(LogLevel.INFO, `조정 작업 완료: ${taskId}`, { result });
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // 작업 실패 처리
      task.status = CoordinationTaskStatus.FAILED;
      task.error = err;
      task.updatedAt = new Date();
      
      // 이벤트 발생
      this.emit('task-failed', { taskId, task, error: err });
      
      this.log(LogLevel.ERROR, `조정 작업 실패: ${taskId}`, { error: err });
      
      throw err;
    } finally {
      // 실행 중인 작업 목록에서 제거
      this.runningTasks.delete(taskId);
    }
  }
  
  /**
   * 순차 실행 (Sequential)
   * @param task 조정 작업
   * @param steps 실행 단계
   * @param initialInput 초기 입력
   */
  private async executeSequentially(
    task: ICoordinationTask,
    steps: ExecutionStep[],
    initialInput?: any
  ): Promise<any> {
    let currentInput = initialInput;
    let finalResult: any;
    
    for (const step of steps) {
      this.log(LogLevel.DEBUG, `순차 실행 단계: ${step.id}`, { agentIds: step.agentIds });
      
      // 단계의 모든 에이전트 실행 (일반적으로 하나씩)
      for (const agentId of step.agentIds) {
        const agent = this.registry.getAgent(agentId);
        
        if (!agent) {
          throw new Error(`에이전트 ID ${agentId}를 찾을 수 없습니다.`);
        }
        
        this.log(LogLevel.INFO, `에이전트 실행: ${agentId}`, { 
          input: currentInput,
          stepId: step.id
        });
        
        // 에이전트 실행
        const result = await agent.run(currentInput);
        
        // 다음 단계 입력으로 결과 설정
        currentInput = result.data;
        finalResult = result;
      }
    }
    
    return finalResult;
  }
  
  /**
   * 병렬 실행 (Parallel)
   * @param task 조정 작업
   * @param steps 실행 단계
   * @param input 입력
   */
  private async executeInParallel(
    task: ICoordinationTask,
    steps: ExecutionStep[],
    input?: any
  ): Promise<any> {
    // 병렬 실행에서는 일반적으로 단계가 하나만 있음
    const step = steps[0];
    const results: Record<string, any> = {};
    
    this.log(LogLevel.DEBUG, `병렬 실행 단계: ${step.id}`, { agentIds: step.agentIds });
    
    // 모든 에이전트 병렬로 실행
    const promises = step.agentIds.map(async agentId => {
      const agent = this.registry.getAgent(agentId);
      
      if (!agent) {
        throw new Error(`에이전트 ID ${agentId}를 찾을 수 없습니다.`);
      }
      
      this.log(LogLevel.INFO, `에이전트 병렬 실행: ${agentId}`, { 
        input,
        stepId: step.id
      });
      
      // 에이전트 실행
      const result = await agent.run(input);
      
      // 결과 저장
      results[agentId] = result;
      
      return result;
    });
    
    // 모든 프로미스 대기
    await Promise.all(promises);
    
    return results;
  }
  
  /**
   * 파이프라인 실행 (Pipeline)
   * @param task 조정 작업
   * @param steps 실행 단계
   * @param initialInput 초기 입력
   */
  private async executeAsPipeline(
    task: ICoordinationTask,
    steps: ExecutionStep[],
    initialInput?: any
  ): Promise<any> {
    let currentInput = initialInput;
    let finalResult: any;
    
    for (const step of steps) {
      this.log(LogLevel.DEBUG, `파이프라인 실행 단계: ${step.id}`, { agentIds: step.agentIds });
      
      // 파이프라인 단계는 일반적으로 에이전트 하나만 포함
      const agentId = step.agentIds[0];
      const agent = this.registry.getAgent(agentId);
      
      if (!agent) {
        throw new Error(`에이전트 ID ${agentId}를 찾을 수 없습니다.`);
      }
      
      this.log(LogLevel.INFO, `파이프라인 에이전트 실행: ${agentId}`, { 
        input: currentInput,
        stepId: step.id
      });
      
      // 에이전트 실행
      const result = await agent.run(currentInput);
      
      // 다음 단계 입력으로 결과 설정
      currentInput = result.data;
      finalResult = result;
    }
    
    return finalResult;
  }
  
  /**
   * 작업 취소
   * @param taskId 작업 ID
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }
    
    // 이미 완료 또는 실패한 작업은 취소 불가
    if (task.status === CoordinationTaskStatus.COMPLETED || 
        task.status === CoordinationTaskStatus.FAILED) {
      return false;
    }
    
    // 작업 상태 업데이트
    task.status = CoordinationTaskStatus.CANCELLED;
    task.updatedAt = new Date();
    
    // 실행 중인 작업이면 목록에서 제거
    if (this.runningTasks.has(taskId)) {
      this.runningTasks.delete(taskId);
    }
    
    // 이벤트 발생
    this.emit('task-cancelled', { taskId, task });
    
    this.log(LogLevel.INFO, `조정 작업 취소됨: ${taskId}`);
    
    return true;
  }
  
  /**
   * 작업 삭제
   * @param taskId 작업 ID
   */
  public removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }
    
    // 실행 중인 작업은 삭제할 수 없음
    if (task.status === CoordinationTaskStatus.RUNNING) {
      throw new Error(`실행 중인 작업 ${taskId}는 삭제할 수 없습니다.`);
    }
    
    // 맵에서 제거
    this.tasks.delete(taskId);
    
    // 실행 계획 제거
    this.executionPlans.delete(taskId);
    
    // 이벤트 발생
    this.emit('task-removed', { taskId, task });
    
    return true;
  }
  
  /**
   * 에이전트 실행 - BaseAgent 메서드 구현
   */
  protected async execute(input?: any): Promise<AgentResult> {
    // 입력이 작업 ID인 경우 해당 작업 실행
    if (input && typeof input === 'string') {
      const taskId = input;
      
      if (this.tasks.has(taskId)) {
        const result = await this.executeTask(taskId);
        
        return {
          success: true,
          data: result
        };
      } else {
        throw new Error(`작업 ID ${taskId}를 찾을 수 없습니다.`);
      }
    } 
    // 입력이 객체인 경우 새 작업 생성 후 실행
    else if (input && typeof input === 'object') {
      const { name, agentIds, description, metadata, strategy, executeImmediately = true } = input;
      
      if (!name || !agentIds || !Array.isArray(agentIds)) {
        throw new Error('작업 생성에 필요한 정보가 부족합니다.');
      }
      
      // 새 작업 생성
      const taskId = this.createTask(name, agentIds, description, metadata);
      
      // 전략이 있으면 실행 계획 생성
      if (strategy) {
        this.createExecutionPlan(taskId, strategy);
      }
      
      // 즉시 실행
      if (executeImmediately) {
        const result = await this.executeTask(taskId);
        
        return {
          success: true,
          data: {
            taskId,
            result
          }
        };
      }
      
      return {
        success: true,
        data: {
          taskId,
          message: '작업이 생성되었지만 아직 실행되지 않았습니다.'
        }
      };
    }
    
    // 기본값: 모든 조정 작업 상태 반환
    return {
      success: true,
      data: {
        message: '코디네이터 실행 중',
        tasksCount: this.tasks.size,
        runningTasksCount: this.runningTasks.size,
        tasks: this.getAllTasks().map(task => ({
          id: task.id,
          name: task.name,
          status: task.status,
          agentCount: task.agentIds.length
        }))
      }
    };
  }
  
  /**
   * 에이전트 추가
   * @param taskId 작업 ID
   * @param agentId 에이전트 ID
   */
  public addAgentToTask(taskId: string, agentId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }
    
    // 실행 중인 작업은 수정할 수 없음
    if (task.status === CoordinationTaskStatus.RUNNING) {
      throw new Error(`실행 중인 작업 ${taskId}는 수정할 수 없습니다.`);
    }
    
    // 에이전트 존재 여부 확인
    if (!this.registry.getAgent(agentId)) {
      throw new Error(`에이전트 ID ${agentId}를 찾을 수 없습니다.`);
    }
    
    // 이미 포함된 에이전트인지 확인
    if (task.agentIds.includes(agentId)) {
      return true; // 이미 포함됨
    }
    
    // 에이전트 추가
    task.agentIds.push(agentId);
    task.updatedAt = new Date();
    
    // 실행 계획이 있으면 초기화 (재생성 필요)
    this.executionPlans.delete(taskId);
    
    // 이벤트 발생
    this.emit('task-updated', { taskId, task });
    
    return true;
  }
  
  /**
   * 에이전트 제거
   * @param taskId 작업 ID
   * @param agentId 에이전트 ID
   */
  public removeAgentFromTask(taskId: string, agentId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }
    
    // 실행 중인 작업은 수정할 수 없음
    if (task.status === CoordinationTaskStatus.RUNNING) {
      throw new Error(`실행 중인 작업 ${taskId}는 수정할 수 없습니다.`);
    }
    
    // 에이전트 인덱스 찾기
    const index = task.agentIds.indexOf(agentId);
    
    if (index === -1) {
      return true; // 이미 포함되지 않음
    }
    
    // 에이전트 제거
    task.agentIds.splice(index, 1);
    task.updatedAt = new Date();
    
    // 실행 계획이 있으면 초기화 (재생성 필요)
    this.executionPlans.delete(taskId);
    
    // 이벤트 발생
    this.emit('task-updated', { taskId, task });
    
    return true;
  }
  
  /**
   * 통계 정보 가져오기
   * BaseAgent에서 상속받은 getStats 메서드를 오버라이드
   */
  public override getStats(): IAgentStats {
    const tasks = this.getAllTasks();
    
    // 상태별 작업 개수
    const statusCounts: Record<string, number> = {};
    
    for (const task of tasks) {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    }
    
    // BaseAgent의 기본 통계를 가져옴
    const baseStats = super.getStats();
    
    // 추가 통계 정보
    const additionalStats = {
      totalTasks: tasks.length,
      runningTasks: this.runningTasks.size,
      statusCounts,
      completedCount: statusCounts[CoordinationTaskStatus.COMPLETED] || 0,
      failedCount: statusCounts[CoordinationTaskStatus.FAILED] || 0,
      pendingCount: statusCounts[CoordinationTaskStatus.PENDING] || 0,
      cancelledCount: statusCounts[CoordinationTaskStatus.CANCELLED] || 0
    };
    
    // 기본 통계와 코디네이터 통계를 병합
    return {
      ...baseStats,
      ...additionalStats
    };
  }
} 