import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistry } from '../agents/registry';
import { useWorkflowStore } from './store';
import { createDefaultAgents, executeWithAgent } from '../agents';

export type StepType = 'content' | 'design' | 'analysis' | 'deployment' | 'notification' | 'research';

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: any;
  dependencies: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

interface StepExecutionResult {
  success: boolean;
  result: any;
  error?: string;
  startTime: number;
  endTime: number;
}

interface ExecutionStatus {
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  stepResults: Record<string, StepExecutionResult>;
  startTime: number;
  endTime?: number;
  error?: string;
}

export class WorkflowExecutor {
  private clients: Set<WebSocket>;
  private executions: Map<string, ExecutionStatus>;
  private agentRegistry: AgentRegistry;

  constructor() {
    this.clients = new Set();
    this.executions = new Map();
    this.agentRegistry = AgentRegistry.getInstance();
  }

  /**
   * 클라이언트 웹소켓 연결 추가
   */
  public addClient(client: WebSocket): void {
    this.clients.add(client);
    client.on('close', () => this.clients.delete(client));
  }

  /**
   * 워크플로우 실행
   */
  public async execute(workflow: Workflow): Promise<boolean> {
    if (this.executions.has(workflow.id) && 
        this.executions.get(workflow.id)?.status === 'running') {
      throw new Error(`Workflow ${workflow.id} is already running`);
    }

    // 워크플로우 스토어에 실행 상태 초기화
    const workflowStore = useWorkflowStore.getState();
    workflowStore.initExecution(workflow.id);

    // 실행 상태 초기화
    const executionStatus: ExecutionStatus = {
      workflowId: workflow.id,
      status: 'running',
      progress: 0,
      stepResults: {},
      startTime: Date.now()
    };
    this.executions.set(workflow.id, executionStatus);

    // 워크플로우 시작 알림
    this.broadcastStatus(workflow.id);

    try {
      // 단계 의존성 분석 및 실행 순서 결정
      const steps = this.resolveStepOrder(workflow.steps);
      
      let totalSteps = steps.length;
      let completedSteps = 0;

      // 각 단계 실행
      for (const step of steps) {
        // 현재 단계 업데이트
        executionStatus.currentStep = step.id;
        workflowStore.updateExecutionStatus(workflow.id, {
          currentStep: step.id,
          progress: Math.floor((completedSteps / totalSteps) * 100)
        });
        workflowStore.addExecutionLog(
          workflow.id,
          `단계 실행 시작: ${step.name}`,
          'info'
        );
        this.broadcastStatus(workflow.id);

        try {
          // 단계 실행
          const stepResult = await this.executeStep(workflow.id, step);
          
          // 결과 저장
          executionStatus.stepResults[step.id] = stepResult;
          
          // 성공/실패 로그 기록
          if (stepResult.success) {
            workflowStore.addExecutionLog(
              workflow.id,
              `단계 실행 성공: ${step.name}`,
              'success'
            );
          } else {
            workflowStore.addExecutionLog(
              workflow.id,
              `단계 실행 실패: ${step.name} - ${stepResult.error || '알 수 없는 오류'}`,
              'error'
            );
          }
          
          // 실패 시 중단
          if (!stepResult.success) {
            executionStatus.status = 'failed';
            executionStatus.error = stepResult.error;
            executionStatus.endTime = Date.now();
            this.broadcastStatus(workflow.id);
            workflowStore.finishExecution(workflow.id, 'failed', stepResult.error);
            return false;
          }
          
          // 진행률 업데이트
          completedSteps++;
          executionStatus.progress = Math.floor((completedSteps / totalSteps) * 100);
          workflowStore.updateExecutionStatus(workflow.id, {
            progress: executionStatus.progress
          });
          this.broadcastStatus(workflow.id);
        } catch (error) {
          // 예외 발생 시 처리
          executionStatus.status = 'failed';
          const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
          executionStatus.error = errorMessage;
          executionStatus.endTime = Date.now();
          this.broadcastStatus(workflow.id);
          workflowStore.addExecutionLog(
            workflow.id,
            `단계 실행 중 예외 발생: ${step.name} - ${errorMessage}`,
            'error'
          );
          workflowStore.finishExecution(workflow.id, 'failed', errorMessage);
          return false;
        }
      }

      // 워크플로우 완료
      executionStatus.status = 'completed';
      executionStatus.progress = 100;
      executionStatus.endTime = Date.now();
      executionStatus.currentStep = undefined;
      this.broadcastStatus(workflow.id);
      
      workflowStore.finishExecution(workflow.id, 'completed');
      return true;
    } catch (error) {
      // 전체 워크플로우 예외 처리
      executionStatus.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      executionStatus.error = errorMessage;
      executionStatus.endTime = Date.now();
      this.broadcastStatus(workflow.id);
      
      workflowStore.finishExecution(workflow.id, 'failed', errorMessage);
      return false;
    }
  }

  /**
   * 워크플로우 실행 상태 조회
   */
  public getExecutionStatus(workflowId: string): ExecutionStatus | undefined {
    return this.executions.get(workflowId);
  }

  /**
   * 개별 단계 실행
   */
  private async executeStep(workflowId: string, step: WorkflowStep): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const executionStatus = this.executions.get(workflowId);
    
    if (!executionStatus) {
      throw new Error(`No execution found for workflow ${workflowId}`);
    }

    try {
      // 에이전트를 이용한 단계 실행
      const result = await executeWithAgent(
        step.id,
        step.type,
        step.config,
        { 
          workflowId, 
          previousResults: executionStatus.stepResults,
          workflowName: executionStatus.workflowId // 실제로는 워크플로우 객체에서 이름을 가져와야 함
        }
      );

      return {
        success: result.success,
        result: result.result,
        error: result.error,
        startTime,
        endTime: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        startTime,
        endTime: Date.now()
      };
    }
  }

  /**
   * 단계 의존성 분석 및 실행 순서 결정
   */
  private resolveStepOrder(steps: WorkflowStep[]): WorkflowStep[] {
    // 단계 맵 생성
    const stepMap = new Map<string, WorkflowStep>();
    steps.forEach(step => stepMap.set(step.id, step));
    
    // 의존성 그래프 생성
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // 초기화
    steps.forEach(step => {
      graph.set(step.id, []);
      inDegree.set(step.id, 0);
    });
    
    // 그래프 및 진입차수 설정
    steps.forEach(step => {
      (step.dependencies || []).forEach(depId => {
        if (!stepMap.has(depId)) {
          throw new Error(`의존성 오류: 단계 ${depId}가 존재하지 않습니다.`);
        }
        graph.get(depId)?.push(step.id);
        inDegree.set(step.id, (inDegree.get(step.id) || 0) + 1);
      });
    });
    
    // 위상 정렬
    const queue: string[] = [];
    const order: string[] = [];
    
    // 진입차수가 0인 노드 큐에 추가
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });
    
    // 큐가 빌 때까지 처리
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      
      // 인접 노드 처리
      graph.get(current)?.forEach(next => {
        inDegree.set(next, (inDegree.get(next) || 0) - 1);
        if (inDegree.get(next) === 0) {
          queue.push(next);
        }
      });
    }
    
    // 사이클 검사
    if (order.length !== steps.length) {
      throw new Error('의존성 오류: 워크플로우 단계 간 순환 의존성이 감지되었습니다.');
    }
    
    // 정렬된 순서대로 단계 반환
    return order.map(id => stepMap.get(id)!);
  }

  /**
   * 워크플로우 실행 상태 브로드캐스트
   */
  private broadcastStatus(workflowId: string): void {
    const status = this.executions.get(workflowId);
    if (!status) return;
    
    const message = JSON.stringify({
      type: 'workflow_status_update',
      data: status
    });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// 애플리케이션 시작 시 기본 에이전트 생성
createDefaultAgents(); 