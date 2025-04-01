import { v4 as uuidv4 } from 'uuid';
import { BaseAgent, IAgentConfig, IAgentResponse } from './base-agent';
import { AgentRegistry } from './registry';
import { MessageBus, MessagePriority, MessageStatus, IAgentMessage } from './messaging';

/**
 * 작업 상태 정의
 */
export enum JobStatus {
  CREATED = 'created',
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMED_OUT = 'timed_out'
}

/**
 * 작업 우선순위 정의
 */
export enum JobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * 작업 정의 인터페이스
 */
export interface IJobDefinition {
  name: string;
  description?: string;
  steps: {
    agentId: string;
    messageType: string;
    payload: any;
    dependsOn?: string[];
  }[];
  priority?: JobPriority;
  maxRetries?: number;
  timeout?: number;
}

/**
 * 작업 인터페이스
 */
export interface IJob {
  id: string;
  definition: IJobDefinition;
  status: JobStatus;
  priority: JobPriority;
  steps: {
    id: string;
    status: JobStatus;
    agentId: string;
    messageType: string;
    payload: any;
    dependsOn: string[];
    startTime?: number;
    endTime?: number;
    retries: number;
    error?: string;
    result?: any;
  }[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: Record<string, any>;
}

/**
 * 에이전트 코디네이터 설정 인터페이스
 */
export interface IAgentCoordinatorConfig extends IAgentConfig {
  maxConcurrentJobs?: number;
  maxQueueSize?: number;
  defaultJobTimeout?: number;
  maxJobRetries?: number;
}

/**
 * 에이전트 코디네이터 클래스
 * 
 * 여러 에이전트 간의 협력 작업을 조정하고 관리합니다.
 * 작업 생성, 실행 및 모니터링 기능을 제공합니다.
 */
export class AgentCoordinator extends BaseAgent {
  private jobs: Map<string, IJob> = new Map();
  private jobQueue: string[] = [];
  private processingJobs: Set<string> = new Set();
  private registry: AgentRegistry;
  private messageBus: MessageBus;
  private maxConcurrentJobs: number;
  private maxQueueSize: number;
  private defaultJobTimeout: number;
  private maxJobRetries: number;
  private isProcessing: boolean = false;

  constructor(config: IAgentCoordinatorConfig) {
    super(config);
    this.registry = AgentRegistry.getInstance();
    this.messageBus = MessageBus.getInstance();
    this.maxConcurrentJobs = config.maxConcurrentJobs || 5;
    this.maxQueueSize = config.maxQueueSize || 100;
    this.defaultJobTimeout = config.defaultJobTimeout || 60000; // 기본 1분
    this.maxJobRetries = config.maxJobRetries || 3;
  }

  /**
   * 에이전트 초기화
   */
  protected async onInitialize(): Promise<void> {
    // 메시지 타입 구독
    this.messageBus.subscribe(
      this.config.id,
      'CREATE_JOB',
      this.handleCreateJobMessage.bind(this)
    );
    
    this.messageBus.subscribe(
      this.config.id,
      'CANCEL_JOB',
      this.handleCancelJobMessage.bind(this)
    );
    
    this.messageBus.subscribe(
      this.config.id,
      'GET_JOB_STATUS',
      this.handleGetJobStatusMessage.bind(this)
    );
    
    // 작업 처리 시작
    this.startJobProcessing();
  }

  /**
   * 에이전트 종료
   */
  protected async onShutdown(): Promise<void> {
    this.isProcessing = false;
    
    // 실행 중인 모든 작업을 일시 중지 상태로 변경
    for (const jobId of Array.from(this.processingJobs)) {
      const job = this.jobs.get(jobId);
      if (job && job.status === JobStatus.RUNNING) {
        job.status = JobStatus.PAUSED;
        this.jobs.set(jobId, job);
      }
    }
  }

  /**
   * 메시지 처리
   */
  protected async onProcessMessage(message: any): Promise<any> {
    switch (message.type) {
      case 'CREATE_JOB':
        return this.createJob(message.payload);
      case 'CANCEL_JOB':
        return this.cancelJob(message.payload.jobId);
      case 'GET_JOB_STATUS':
        return this.getJobStatus(message.payload.jobId);
      case 'LIST_JOBS':
        return this.listJobs(message.payload);
      case 'PAUSE_JOB':
        return this.pauseJob(message.payload.jobId);
      case 'RESUME_JOB':
        return this.resumeJob(message.payload.jobId);
      default:
        throw new Error(`알 수 없는 메시지 타입: ${message.type}`);
    }
  }

  /**
   * 작업 생성 메시지 처리
   */
  private handleCreateJobMessage(message: IAgentMessage): void {
    this.createJob(message.payload)
      .then(result => {
        // 응답 게시
        this.messageBus.publishResponse({
          messageId: message.id,
          sender: this.config.id,
          recipient: message.sender,
          payload: result,
          status: MessageStatus.DELIVERED
        });
      })
      .catch(error => {
        // 오류 응답 게시
        this.messageBus.publishResponse({
          messageId: message.id,
          sender: this.config.id,
          recipient: message.sender,
          payload: { error: error.message },
          status: MessageStatus.FAILED
        });
      });
  }

  /**
   * 작업 취소 메시지 처리
   */
  private handleCancelJobMessage(message: IAgentMessage): void {
    this.cancelJob(message.payload.jobId)
      .then(result => {
        this.messageBus.publishResponse({
          messageId: message.id,
          sender: this.config.id,
          recipient: message.sender,
          payload: result,
          status: MessageStatus.DELIVERED
        });
      })
      .catch(error => {
        this.messageBus.publishResponse({
          messageId: message.id,
          sender: this.config.id,
          recipient: message.sender,
          payload: { error: error.message },
          status: MessageStatus.FAILED
        });
      });
  }

  /**
   * 작업 상태 조회 메시지 처리
   */
  private handleGetJobStatusMessage(message: IAgentMessage): void {
    this.getJobStatus(message.payload.jobId)
      .then(result => {
        this.messageBus.publishResponse({
          messageId: message.id,
          sender: this.config.id,
          recipient: message.sender,
          payload: result,
          status: MessageStatus.DELIVERED
        });
      })
      .catch(error => {
        this.messageBus.publishResponse({
          messageId: message.id,
          sender: this.config.id,
          recipient: message.sender,
          payload: { error: error.message },
          status: MessageStatus.FAILED
        });
      });
  }

  /**
   * 작업 생성
   */
  public async createJob(jobDefinition: IJobDefinition): Promise<{ jobId: string }> {
    if (this.jobQueue.length >= this.maxQueueSize) {
      throw new Error('작업 대기열이 가득 찼습니다.');
    }

    if (!jobDefinition.name) {
      throw new Error('작업 이름이 필요합니다.');
    }

    if (!jobDefinition.steps || jobDefinition.steps.length === 0) {
      throw new Error('작업에는 최소 한 개 이상의 단계가 필요합니다.');
    }

    // 작업 ID 생성
    const jobId = uuidv4();
    
    // 각 단계에 ID 추가
    const steps = jobDefinition.steps.map(step => ({
      id: uuidv4(),
      status: JobStatus.CREATED,
      agentId: step.agentId,
      messageType: step.messageType,
      payload: step.payload,
      dependsOn: step.dependsOn || [],
      retries: 0
    }));

    // 작업 생성
    const job: IJob = {
      id: jobId,
      definition: jobDefinition,
      status: JobStatus.CREATED,
      priority: jobDefinition.priority ?? JobPriority.NORMAL,
      steps,
      createdAt: Date.now()
    };

    // 작업 맵에 추가
    this.jobs.set(jobId, job);
    
    // 우선순위에 따라 대기열에 삽입
    this.enqueueJob(jobId);
    
    // 이벤트 발행
    this.messageBus.publish({
      type: 'JOB_CREATED',
      sender: this.config.id,
      recipients: [],
      payload: { jobId, name: job.definition.name },
      priority: MessagePriority.NORMAL
    });
    
    return { jobId };
  }

  /**
   * 작업을 우선순위에 따라 대기열에 삽입
   */
  private enqueueJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // 우선순위에 따라 삽입 위치 결정
    let insertIndex = this.jobQueue.length;
    for (let i = 0; i < this.jobQueue.length; i++) {
      const queuedJobId = this.jobQueue[i];
      const queuedJob = this.jobs.get(queuedJobId);
      if (queuedJob && job.priority > queuedJob.priority) {
        insertIndex = i;
        break;
      }
    }

    // 대기열에 삽입
    this.jobQueue.splice(insertIndex, 0, jobId);
    
    // 작업 상태 업데이트
    job.status = JobStatus.PENDING;
    this.jobs.set(jobId, job);
    
    // 이벤트 발행
    this.messageBus.publish({
      type: 'JOB_PENDING',
      sender: this.config.id,
      recipients: [],
      payload: { jobId, name: job.definition.name },
      priority: MessagePriority.NORMAL
    });
  }

  /**
   * 작업 취소
   */
  public async cancelJob(jobId: string): Promise<{ success: boolean }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`작업을 찾을 수 없음: ${jobId}`);
    }

    // 이미 완료된 작업은 취소할 수 없음
    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      throw new Error(`이미 ${job.status} 상태인 작업은 취소할 수 없습니다.`);
    }

    // 대기 중인 작업이면 대기열에서 제거
    if (job.status === JobStatus.PENDING) {
      const queueIndex = this.jobQueue.indexOf(jobId);
      if (queueIndex !== -1) {
        this.jobQueue.splice(queueIndex, 1);
      }
    }

    // 실행 중인 작업이면 처리 목록에서 제거
    if (job.status === JobStatus.RUNNING) {
      this.processingJobs.delete(jobId);
    }

    // 작업 상태 업데이트
    job.status = JobStatus.CANCELLED;
    job.completedAt = Date.now();
    this.jobs.set(jobId, job);
    
    // 이벤트 발행
    this.messageBus.publish({
      type: 'JOB_CANCELLED',
      sender: this.config.id,
      recipients: [],
      payload: { jobId, name: job.definition.name },
      priority: MessagePriority.NORMAL
    });
    
    return { success: true };
  }

  /**
   * 작업 상태 조회
   */
  public async getJobStatus(jobId: string): Promise<IJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`작업을 찾을 수 없음: ${jobId}`);
    }
    return job;
  }

  /**
   * 작업 목록 조회
   */
  public async listJobs(options?: { status?: JobStatus, limit?: number, offset?: number }): Promise<IJob[]> {
    let jobs = Array.from(this.jobs.values());
    
    // 상태 필터링
    if (options?.status) {
      jobs = jobs.filter(job => job.status === options.status);
    }
    
    // 최신순 정렬
    jobs.sort((a, b) => b.createdAt - a.createdAt);
    
    // 페이지네이션
    if (options?.offset !== undefined && options?.limit !== undefined) {
      jobs = jobs.slice(options.offset, options.offset + options.limit);
    }
    
    return jobs;
  }

  /**
   * 작업 일시 중지
   */
  public async pauseJob(jobId: string): Promise<{ success: boolean }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`작업을 찾을 수 없음: ${jobId}`);
    }

    // 실행 중인 작업만 일시 중지 가능
    if (job.status !== JobStatus.RUNNING) {
      throw new Error('실행 중인 작업만 일시 중지할 수 있습니다.');
    }

    // 작업 상태 업데이트
    job.status = JobStatus.PAUSED;
    this.jobs.set(jobId, job);
    
    // 처리 목록에서 제거
    this.processingJobs.delete(jobId);
    
    // 이벤트 발행
    this.messageBus.publish({
      type: 'JOB_PAUSED',
      sender: this.config.id,
      recipients: [],
      payload: { jobId, name: job.definition.name },
      priority: MessagePriority.NORMAL
    });
    
    return { success: true };
  }

  /**
   * 작업 재개
   */
  public async resumeJob(jobId: string): Promise<{ success: boolean }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`작업을 찾을 수 없음: ${jobId}`);
    }

    // 일시 중지된 작업만 재개 가능
    if (job.status !== JobStatus.PAUSED) {
      throw new Error('일시 중지된 작업만 재개할 수 있습니다.');
    }

    // 대기열에 다시 추가
    this.enqueueJob(jobId);
    
    return { success: true };
  }

  /**
   * 작업 처리 시작
   */
  private startJobProcessing(): void {
    this.isProcessing = true;
    this.processNextJob();
  }

  /**
   * 다음 작업 처리
   */
  private async processNextJob(): Promise<void> {
    if (!this.isProcessing) return;

    // 동시 처리 중인 작업 수 확인
    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      // 0.5초 후 다시 시도
      setTimeout(() => this.processNextJob(), 500);
      return;
    }

    // 작업 큐 최적화 실행
    this.optimizeJobQueue();

    // 다음 작업 가져오기
    if (this.jobQueue.length === 0) {
      // 0.5초 후 다시 시도
      setTimeout(() => this.processNextJob(), 500);
      return;
    }

    // 대기열에서 다음 작업 가져오기
    const jobId = this.jobQueue.shift();
    if (!jobId) {
      // 0.5초 후 다시 시도
      setTimeout(() => this.processNextJob(), 500);
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      // 작업이 삭제된 경우 다음 작업으로
      this.processNextJob();
      return;
    }

    // 작업 실행 시작
    this.processingJobs.add(jobId);
    job.status = JobStatus.RUNNING;
    job.startedAt = Date.now();
    this.jobs.set(jobId, job);
    
    // 이벤트 발행
    this.messageBus.publish({
      type: 'JOB_STARTED',
      sender: this.config.id,
      recipients: [],
      payload: { jobId, name: job.definition.name },
      priority: MessagePriority.NORMAL
    });
    
    // 작업 실행
    try {
      await this.processJob(job);
      
      // 작업 완료 처리
      job.status = JobStatus.COMPLETED;
      job.completedAt = Date.now();
      this.jobs.set(jobId, job);
      
      // 처리 중인 작업 목록에서 제거
      this.processingJobs.delete(jobId);
      
      // 이벤트 발행
      this.messageBus.publish({
        type: 'JOB_COMPLETED',
        sender: this.config.id,
        recipients: [],
        payload: { 
          jobId, 
          name: job.definition.name,
          result: job.result 
        },
        priority: MessagePriority.NORMAL
      });
    } catch (error) {
      // 작업 실패 처리
      job.status = JobStatus.FAILED;
      job.completedAt = Date.now();
      job.error = error instanceof Error ? error.message : String(error);
      this.jobs.set(jobId, job);
      
      // 처리 중인 작업 목록에서 제거
      this.processingJobs.delete(jobId);
      
      // 이벤트 발행
      this.messageBus.publish({
        type: 'JOB_FAILED',
        sender: this.config.id,
        recipients: [],
        payload: { 
          jobId, 
          name: job.definition.name,
          error: job.error 
        },
        priority: MessagePriority.NORMAL
      });
    }
    
    // 다음 작업 처리
    this.processNextJob();
  }

  /**
   * 작업 큐 최적화
   * 우선순위, 리소스 활용도, 작업 대기 시간 등을 고려하여 큐 재정렬
   */
  private optimizeJobQueue(): void {
    if (this.jobQueue.length <= 1) return;

    // 작업 정보와 함께 큐 항목 생성
    interface JobQueueItem {
      jobId: string;
      priority: JobPriority;
      createdAt: number;
      waitTime: number; // 대기 시간 (밀리초)
      resourceEstimate: number; // 리소스 사용 추정치 (0-1)
      readyStepsCount: number;
      score: number; // 최종 점수
    }

    const now = Date.now();
    const queueItems: JobQueueItem[] = [];

    // 작업 큐에서 정보 수집
    for (const jobId of this.jobQueue) {
      const job = this.jobs.get(jobId);
      if (!job) continue;

      // 대기 시간 (밀리초)
      const waitTime = now - job.createdAt;
      
      // 준비된 단계 수
      const readyStepsCount = this.findNextSteps(job).length;
      
      // 리소스 사용 추정치 (단순화된 방식)
      // 더 복잡한 추정 알고리즘으로 대체 가능
      const resourceEstimate = job.steps.length > 10 ? 0.8 : 
                              job.steps.length > 5 ? 0.5 : 0.3;

      queueItems.push({
        jobId,
        priority: job.priority,
        createdAt: job.createdAt,
        waitTime,
        resourceEstimate,
        readyStepsCount,
        score: 0 // 초기값, 나중에 계산
      });
    }

    // 점수 계산
    // 1. 우선순위 (40%)
    // 2. 대기 시간 (30%)
    // 3. 리소스 효율성 (10%)
    // 4. 단계 준비도 (20%)
    const maxWaitTime = Math.max(...queueItems.map(item => item.waitTime));
    
    queueItems.forEach(item => {
      const priorityScore = (item.priority / JobPriority.CRITICAL) * 0.4;
      const waitTimeScore = maxWaitTime > 0 ? (item.waitTime / maxWaitTime) * 0.3 : 0;
      const resourceScore = (1 - item.resourceEstimate) * 0.1; // 리소스 사용이 적을수록 높은 점수
      const readyStepsScore = item.readyStepsCount > 0 ? 0.2 : 0;
      
      item.score = priorityScore + waitTimeScore + resourceScore + readyStepsScore;
    });

    // 점수 기반 정렬
    queueItems.sort((a, b) => b.score - a.score);

    // 정렬된 결과로 작업 큐 업데이트
    this.jobQueue = queueItems.map(item => item.jobId);

    // 로그
    console.log('작업 큐 최적화 완료:', queueItems.slice(0, 3).map(item => ({
      jobId: item.jobId,
      priority: item.priority,
      waitTime: Math.round(item.waitTime / 1000) + '초',
      score: item.score.toFixed(2)
    })));
  }

  /**
   * 작업 실행
   */
  private async processJob(job: IJob): Promise<void> {
    // 결과 저장 객체 초기화
    job.result = {};
    
    // 모든 단계가 완료될 때까지 반복
    let allStepsCompleted = false;
    
    while (!allStepsCompleted) {
      // 다음에 실행할 단계 찾기
      const nextSteps = this.findNextSteps(job);
      
      // 더 이상 실행할 단계가 없으면 종료
      if (nextSteps.length === 0) {
        // 모든 단계 완료 확인
        allStepsCompleted = job.steps.every(step => 
          step.status === JobStatus.COMPLETED || 
          step.status === JobStatus.FAILED
        );
        
        // 모든 단계가 완료되지 않았지만 실행할 단계가 없으면 에러
        if (!allStepsCompleted) {
          throw new Error('작업을 완료할 수 없습니다: 의존성 문제 또는 교착 상태');
        }
        
        break;
      }
      
      // 각 단계를 독립적으로 실행
      await Promise.all(nextSteps.map(step => this.executeStep(job, step)));
      
      // 모든 단계의 상태 확인
      const failedSteps = job.steps.filter(step => step.status === JobStatus.FAILED);
      
      // 실패한 단계가 있으면 전체 작업 실패로 처리
      if (failedSteps.length > 0) {
        throw new Error(`단계 실행 실패: ${failedSteps.map(s => s.id).join(', ')}`);
      }
    }
  }

  /**
   * 다음에 실행할 단계 찾기
   */
  private findNextSteps(job: IJob): IJob['steps'][0][] {
    return job.steps.filter(step => {
      // 이미 완료되었거나 실행 중인 단계는 제외
      if (
        step.status === JobStatus.RUNNING || 
        step.status === JobStatus.COMPLETED || 
        step.status === JobStatus.FAILED
      ) {
        return false;
      }
      
      // 의존성 확인
      if (step.dependsOn.length === 0) {
        return true;
      }
      
      // 모든 의존 단계가 완료되었는지 확인
      return step.dependsOn.every(depId => {
        const depStep = job.steps.find(s => s.id === depId);
        return depStep && depStep.status === JobStatus.COMPLETED;
      });
    });
  }

  /**
   * 단계 실행
   */
  private async executeStep(job: IJob, step: IJob['steps'][0]): Promise<void> {
    // 단계 상태 업데이트
    step.status = JobStatus.RUNNING;
    step.startTime = Date.now();
    this.jobs.set(job.id, job);
    
    // 타임아웃 설정
    const timeout = job.definition.timeout || this.defaultJobTimeout;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // 타임아웃 Promise 생성
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`단계 실행 타임아웃: ${step.id}`));
      }, timeout);
    });
    
    try {
      // 에이전트에 메시지 전송 - IAgentMessage 구조에 맞게 생성
      const message = {
        type: step.messageType,
        content: {
          ...step.payload,
          jobId: job.id,
          stepId: step.id
        },
        metadata: {
          timestamp: Date.now(),
          sender: this.config.id,
          recipient: step.agentId,
          priority: 1
        }
      };
      
      // Race 조건으로 타임아웃 처리
      const response = await Promise.race([
        this.registry.sendMessage(message, step.agentId),
        timeoutPromise
      ]);
      
      // 타임아웃 취소
      if (timeoutId) clearTimeout(timeoutId);
      
      // 응답 처리
      if (response.success) {
        // 단계 완료 처리
        step.status = JobStatus.COMPLETED;
        step.endTime = Date.now();
        step.result = response.data;
        
        // 작업 결과에 단계 결과 추가
        if (job.result) {
          job.result[step.id] = response.data;
        }
      } else {
        // 재시도 처리
        if (step.retries < (job.definition.maxRetries || this.maxJobRetries)) {
          step.retries++;
          step.status = JobStatus.PENDING;
          
          // 에러 정보 저장
          step.error = response.error;
          
          // 이벤트 발행
          this.messageBus.publish({
            type: 'STEP_RETRY',
            sender: this.config.id,
            recipients: [],
            payload: { 
              jobId: job.id, 
              stepId: step.id,
              attempt: step.retries,
              error: step.error
            },
            priority: MessagePriority.NORMAL
          });
        } else {
          // 최대 재시도 횟수 초과
          step.status = JobStatus.FAILED;
          step.endTime = Date.now();
          step.error = response.error;
          
          // 이벤트 발행
          this.messageBus.publish({
            type: 'STEP_FAILED',
            sender: this.config.id,
            recipients: [],
            payload: { 
              jobId: job.id, 
              stepId: step.id,
              error: step.error
            },
            priority: MessagePriority.NORMAL
          });
          
          throw new Error(`단계 실행 실패(${step.retries}회 재시도 후): ${step.error}`);
        }
      }
    } catch (error) {
      // 타임아웃 취소
      if (timeoutId) clearTimeout(timeoutId);
      
      // 재시도 처리
      if (step.retries < (job.definition.maxRetries || this.maxJobRetries)) {
        step.retries++;
        step.status = JobStatus.PENDING;
        step.error = error instanceof Error ? error.message : String(error);
        
        // 이벤트 발행
        this.messageBus.publish({
          type: 'STEP_RETRY',
          sender: this.config.id,
          recipients: [],
          payload: { 
            jobId: job.id, 
            stepId: step.id,
            attempt: step.retries,
            error: step.error
          },
          priority: MessagePriority.NORMAL
        });
      } else {
        // 최대 재시도 횟수 초과
        step.status = JobStatus.FAILED;
        step.endTime = Date.now();
        step.error = error instanceof Error ? error.message : String(error);
        
        // 이벤트 발행
        this.messageBus.publish({
          type: 'STEP_FAILED',
          sender: this.config.id,
          recipients: [],
          payload: { 
            jobId: job.id, 
            stepId: step.id,
            error: step.error
          },
          priority: MessagePriority.NORMAL
        });
        
        throw error;
      }
    } finally {
      // 작업 상태 업데이트
      this.jobs.set(job.id, job);
    }
  }

  /**
   * 의존성 관리를 위한 메서드들
   */

  /**
   * 작업 의존성 사이클 검사
   * 
   * @param jobDefinition 작업 정의
   * @returns 사이클이 있으면 true, 없으면 false
   */
  private hasDependencyCycle(jobDefinition: IJobDefinition): boolean {
    // 단계 ID로 변환된 의존성 맵 생성
    const stepMap = new Map<string, { dependencies: string[], visited: boolean, inStack: boolean }>();
    
    // 단계마다 고유 ID 부여 (임시)
    const steps = jobDefinition.steps.map((step, index) => ({
      ...step,
      tempId: `step-${index}`
    }));

    // 맵 초기화
    steps.forEach((step) => {
      stepMap.set(step.tempId, {
        dependencies: step.dependsOn?.map(depStepId => {
          const depIndex = steps.findIndex(s => s.tempId === depStepId);
          return depIndex !== -1 ? `step-${depIndex}` : depStepId;
        }) || [],
        visited: false,
        inStack: false
      });
    });

    // DFS를 사용한 사이클 검출
    const detectCycle = (stepId: string): boolean => {
      const step = stepMap.get(stepId);
      if (!step) return false;

      if (step.inStack) return true; // 사이클 발견
      if (step.visited) return false; // 이미 확인됨

      step.visited = true;
      step.inStack = true;

      for (const depId of step.dependencies) {
        if (detectCycle(depId)) {
          return true;
        }
      }

      step.inStack = false;
      return false;
    };

    // 모든 단계에 대해 사이클 검사
    const stepEntries = Array.from(stepMap.entries());
    for (const [stepId, step] of stepEntries) {
      if (!step.visited) {
        if (detectCycle(stepId)) {
          return true; // 사이클 발견
        }
      }
    }

    return false; // 사이클 없음
  }

  /**
   * 효율적인 작업 실행 순서 계산
   * @param job 작업
   * @returns 최적화된 실행 단계 순서
   */
  private calculateOptimalExecutionOrder(job: IJob): IJob['steps'][0][] {
    // 위상 정렬을 위한 준비
    const stepMap = new Map<string, {
      step: IJob['steps'][0],
      dependencies: string[],
      dependencyCount: number
    }>();

    // 단계 맵 초기화
    job.steps.forEach(step => {
      stepMap.set(step.id, {
        step,
        dependencies: step.dependsOn,
        dependencyCount: step.dependsOn.length
      });
    });

    // 실행 가능한 단계 (의존성 없는 단계) 찾기
    const readySteps: IJob['steps'][0][] = [];
    const stepEntries = Array.from(stepMap.entries());
    for (const [_, stepInfo] of stepEntries) {
      if (stepInfo.dependencyCount === 0 && 
          stepInfo.step.status !== JobStatus.COMPLETED && 
          stepInfo.step.status !== JobStatus.FAILED &&
          stepInfo.step.status !== JobStatus.RUNNING) {
        readySteps.push(stepInfo.step);
      }
    }

    return readySteps;
  }

  /**
   * 작업 성능 메트릭 수집
   * @param jobId 작업 ID
   */
  public getJobMetrics(jobId: string): {
    totalDuration: number;
    stepDurations: { [stepId: string]: number };
    avgStepDuration: number;
    status: JobStatus;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
  } {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`작업을 찾을 수 없음: ${jobId}`);
    }

    // 단계별 소요 시간 계산
    const stepDurations: { [stepId: string]: number } = {};
    let totalStepDuration = 0;
    let completedStepsCount = 0;

    for (const step of job.steps) {
      if (step.startTime && step.endTime) {
        const duration = step.endTime - step.startTime;
        stepDurations[step.id] = duration;
        totalStepDuration += duration;
        completedStepsCount++;
      }
    }

    // 전체 작업 소요 시간
    const totalDuration = job.completedAt && job.startedAt 
      ? job.completedAt - job.startedAt 
      : undefined;

    // 평균 단계 소요 시간
    const avgStepDuration = completedStepsCount > 0 
      ? totalStepDuration / completedStepsCount 
      : 0;

    return {
      totalDuration: totalDuration || 0,
      stepDurations,
      avgStepDuration,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    };
  }

  /**
   * 리소스 사용량 기반 작업 스로틀링
   * 시스템 리소스 상태에 따라 동시 작업 수 자동 조정
   * @param systemLoad 시스템 부하 수준 (0-1)
   */
  public adjustConcurrencyBasedOnLoad(systemLoad: number): void {
    // 시스템 부하에 따라 최대 동시 작업 수 동적 조정
    const initialMax = this.maxConcurrentJobs;
    
    // 부하 수준에 따른 동적 조정
    // 부하가 낮으면 더 많은 작업, 부하가 높으면 더 적은 작업
    if (systemLoad < 0.3) {
      // 낮은 부하: 최대 150%까지 증가
      this.maxConcurrentJobs = Math.min(Math.ceil(initialMax * 1.5), 10);
    } else if (systemLoad < 0.7) {
      // 중간 부하: 기본값 사용
      this.maxConcurrentJobs = initialMax;
    } else {
      // 높은 부하: 최대 50%까지 감소
      this.maxConcurrentJobs = Math.max(Math.floor(initialMax * 0.5), 1);
    }
    
    // 변경 로그
    console.log(`시스템 부하 (${systemLoad.toFixed(2)})에 따라 최대 동시 작업 수 조정: ${this.maxConcurrentJobs}`);
    
    // 큐 처리 상태 확인
    if (this.processingJobs.size < this.maxConcurrentJobs && this.jobQueue.length > 0) {
      // 처리 용량이 있고 대기 중인 작업이 있으면 작업 처리 트리거
      this.processNextJob();
    }
  }
} 