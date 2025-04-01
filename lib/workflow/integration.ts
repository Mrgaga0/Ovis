import { v4 as uuidv4 } from 'uuid';
import { AgentRegistry } from '../agents/registry';
import { MessageBus, createMessage, MessagePriority, MessageStatus } from '../agents/messaging';
import { WorkflowExecutor, Workflow, WorkflowStep, StepType } from './executor';

/**
 * 워크플로우-에이전트 통합 클래스
 * 
 * 이 클래스는 워크플로우 시스템과 에이전트 시스템 간의 통합을 담당합니다.
 * 워크플로우 단계를 에이전트 작업으로 변환하고, 결과를 관리합니다.
 */
export class WorkflowAgentIntegration {
  private static instance: WorkflowAgentIntegration;
  private agentRegistry: AgentRegistry;
  private messageBus: MessageBus;
  private workflowExecutor: WorkflowExecutor;
  
  private constructor() {
    this.agentRegistry = AgentRegistry.getInstance();
    this.messageBus = MessageBus.getInstance();
    this.workflowExecutor = new WorkflowExecutor();
  }
  
  /**
   * 싱글톤 인스턴스 획득
   */
  public static getInstance(): WorkflowAgentIntegration {
    if (!WorkflowAgentIntegration.instance) {
      WorkflowAgentIntegration.instance = new WorkflowAgentIntegration();
    }
    return WorkflowAgentIntegration.instance;
  }
  
  /**
   * 워크플로우 실행
   */
  public async executeWorkflow(workflow: Workflow): Promise<boolean> {
    return this.workflowExecutor.execute(workflow);
  }
  
  /**
   * 워크플로우 실행 상태 조회
   */
  public getWorkflowStatus(workflowId: string): any {
    return this.workflowExecutor.getExecutionStatus(workflowId);
  }
  
  /**
   * 워크플로우 단계 유형에 따른 에이전트 선택 및 작업 실행
   */
  public async executeStep(step: WorkflowStep, context: any): Promise<any> {
    // 단계 유형에 따른 에이전트 선택
    const agentType = this.mapStepTypeToAgentType(step.type);
    
    // 해당 유형의 에이전트 중 하나 선택 또는 생성
    const agents = this.agentRegistry.findAgentTypesWithCapability(this.getRequiredCapabilityForStep(step));
    
    if (agents.length === 0) {
      throw new Error(`단계 ${step.type}에 필요한 기능을 가진 에이전트를 찾을 수 없습니다.`);
    }
    
    // 첫 번째로 찾은 에이전트 타입으로 에이전트 생성
    const agentId = `${agentType}-agent-${uuidv4()}`;
    const agent = this.agentRegistry.createAgent(
      agents[0].type,
      `${step.name} 에이전트`,
      `워크플로우 단계 ${step.id} 실행을 위한 임시 에이전트`,
      step.config
    );
    
    try {
      // 에이전트에 메시지 전송
      const messageType = this.getMessageTypeForStep(step);
      const message = createMessage(
        messageType,
        {
          ...step.config,
          stepId: step.id,
          context
        },
        {
          sender: 'workflow-system',
          recipients: [agent.getId()],
          priority: MessagePriority.HIGH
        }
      );
      
      // 메시지 버스를 통해 전송
      const messageId = this.messageBus.publish(message);
      
      // 응답 대기
      return new Promise((resolve, reject) => {
        this.messageBus.subscribeToResponse(
          'workflow-system',
          messageId,
          (response) => {
            // 에이전트 종료
            this.agentRegistry.terminateAgent(agent.getId()).catch(console.error);
            
            if (response.status === MessageStatus.COMPLETED) {
              resolve(response.payload);
            } else {
              reject(new Error(response.payload?.error || '에이전트 작업 실패'));
            }
          }
        );
      });
    } catch (error) {
      // 에러 발생 시 에이전트 종료 시도
      await this.agentRegistry.terminateAgent(agent.getId()).catch(console.error);
      throw error;
    }
  }
  
  /**
   * 단계 유형에 따른 에이전트 유형 매핑
   */
  private mapStepTypeToAgentType(stepType: StepType): string {
    switch (stepType) {
      case 'content':
        return 'content';
      case 'design':
        return 'design';
      case 'analysis':
        return 'content'; // 분석은 콘텐츠 에이전트가 처리
      case 'deployment':
        return 'task';
      case 'notification':
        return 'task';
      default:
        throw new Error(`지원하지 않는 단계 유형: ${stepType}`);
    }
  }
  
  /**
   * 단계 유형에 따른 필요 기능 반환
   */
  private getRequiredCapabilityForStep(step: WorkflowStep): string {
    switch (step.type) {
      case 'content':
        return 'content_generation';
      case 'design':
        return 'design_analysis';
      case 'analysis':
        return 'content_analysis';
      case 'deployment':
        return 'task_execution';
      case 'notification':
        return 'task_management';
      default:
        throw new Error(`지원하지 않는 단계 유형: ${step.type}`);
    }
  }
  
  /**
   * 단계 유형에 따른 메시지 유형 반환
   */
  private getMessageTypeForStep(step: WorkflowStep): string {
    switch (step.type) {
      case 'content':
        return 'generate_content';
      case 'design':
        return 'analyze_design';
      case 'analysis':
        return 'analyze_content';
      case 'deployment':
        return 'execute_deployment';
      case 'notification':
        return 'send_notification';
      default:
        throw new Error(`지원하지 않는 단계 유형: ${step.type}`);
    }
  }
} 