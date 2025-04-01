import { v4 as uuidv4 } from 'uuid';
import { BaseAgent, IAgentConfig, IAgentMessage, IAgentResponse } from './base-agent';
import { DesignAgent } from './specialized/design-agent';
import { ContentAgent } from './specialized/content-agent';
import { TaskAgent } from './specialized/task-agent';
import { MessageBus, MessagePriority, MessageStatus } from './messaging';
import { StepType } from '../workflow/executor';

/**
 * 에이전트 팩토리 타입
 * 에이전트 생성 함수의 시그니처를 정의합니다.
 */
export type AgentFactory = (config: IAgentConfig) => BaseAgent;

/**
 * 에이전트 등록 정보
 * 에이전트 타입에 대한 메타데이터와 생성 함수를 포함합니다.
 */
export interface AgentRegistration {
  type: string;
  name: string;
  description: string;
  capabilities: string[];
  factory: AgentFactory;
}

/**
 * 에이전트 실행 결과 인터페이스
 */
export interface AgentResult {
  success: boolean;
  result: any;
  error?: string;
}

/**
 * 에이전트 실행 컨텍스트 인터페이스
 */
export interface AgentContext {
  workflowId: string;
  workflowName: string;
  previousResults: Record<string, any>;
  [key: string]: any;
}

/**
 * 에이전트 인터페이스
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  type: StepType;
  capabilities: string[];
  execute: (config: any, context: AgentContext) => Promise<AgentResult>;
}

/**
 * 에이전트 레지스트리
 * 모든 에이전트 타입 등록 및 에이전트 인스턴스 관리
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agentTypes: Map<string, AgentRegistration>;
  private activeAgents: Map<string, BaseAgent>;
  private messageBus: MessageBus;
  private agents: Map<string, Agent> = new Map();
  private typeAgents: Map<StepType, Agent[]> = new Map();

  private constructor() {
    this.agentTypes = new Map();
    this.activeAgents = new Map();
    this.messageBus = MessageBus.getInstance();
    this.registerDefaultAgents();
    this.typeAgents.set('content', []);
    this.typeAgents.set('design', []);
    this.typeAgents.set('analysis', []);
    this.typeAgents.set('deployment', []);
    this.typeAgents.set('notification', []);
    this.typeAgents.set('research', []);
  }

  /**
   * 싱글톤 인스턴스 획득
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * 기본 에이전트 등록
   */
  private registerDefaultAgents(): void {
    this.registerAgentType({
      type: 'design',
      name: '디자인 에이전트',
      description: '디자인 분석 및 생성을 담당하는 에이전트',
      capabilities: [
        'design_analysis',
        'style_generation',
        'layout_planning',
        'color_scheme',
        'typography',
        'component_design'
      ],
      factory: (config) => new DesignAgent(config)
    });

    this.registerAgentType({
      type: 'content',
      name: '콘텐츠 에이전트',
      description: '콘텐츠 생성 및 최적화를 담당하는 에이전트',
      capabilities: [
        'content_generation',
        'content_optimization',
        'content_analysis',
        'headline_generation',
        'keyword_extraction'
      ],
      factory: (config) => new ContentAgent(config)
    });

    this.registerAgentType({
      type: 'task',
      name: '작업 관리 에이전트',
      description: '워크플로우 작업 실행과 조율을 담당하는 에이전트',
      capabilities: [
        'task_management',
        'task_scheduling',
        'task_execution',
        'task_monitoring',
        'task_coordination'
      ],
      factory: (config) => new TaskAgent(config)
    });
  }

  /**
   * 새로운 에이전트 타입 등록
   */
  public registerAgentType(registration: AgentRegistration): void {
    if (this.agentTypes.has(registration.type)) {
      throw new Error(`이미 등록된 에이전트 타입입니다: ${registration.type}`);
    }

    this.agentTypes.set(registration.type, registration);
  }

  /**
   * 등록된 에이전트 타입 정보 획득
   */
  public getAgentTypeInfo(type: string): AgentRegistration | undefined {
    return this.agentTypes.get(type);
  }

  /**
   * 모든 등록된 에이전트 타입 목록 조회
   */
  public listAgentTypes(): AgentRegistration[] {
    return Array.from(this.agentTypes.values());
  }

  /**
   * 특정 기능을 가진 에이전트 타입 검색
   */
  public findAgentTypesWithCapability(capability: string): AgentRegistration[] {
    return this.listAgentTypes().filter(
      agentType => agentType.capabilities.includes(capability)
    );
  }

  /**
   * 에이전트 생성
   */
  public createAgent(type: string, name: string, description: string, settings?: Record<string, any>): BaseAgent {
    const registration = this.agentTypes.get(type);
    if (!registration) {
      throw new Error(`등록되지 않은 에이전트 타입입니다: ${type}`);
    }

    const agentId = uuidv4();
    const config: IAgentConfig = {
      id: agentId,
      type: type as any, // 타입 단언
      name,
      description,
      capabilities: registration.capabilities.slice(),
      settings,
      metadata: {
        created: Date.now(),
        lastActive: Date.now(),
        version: '1.0.0'
      }
    };

    const agent = registration.factory(config);
    this.activeAgents.set(agentId, agent);
    
    // 에이전트 초기화
    agent.initialize().catch(error => {
      console.error(`에이전트 초기화 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      this.activeAgents.delete(agentId);
    });

    return agent;
  }

  /**
   * 활성화된 에이전트 가져오기
   */
  public getAgent(agentId: string): BaseAgent | undefined {
    return this.activeAgents.get(agentId);
  }

  /**
   * 모든 활성 에이전트 목록 조회
   */
  public listActiveAgents(): BaseAgent[] {
    return Array.from(this.activeAgents.values());
  }

  /**
   * 에이전트 종료 및 제거
   */
  public async terminateAgent(agentId: string): Promise<boolean> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      return false;
    }

    try {
      await agent.shutdown();
      this.activeAgents.delete(agentId);
      return true;
    } catch (error) {
      console.error(`에이전트 종료 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      return false;
    }
  }

  /**
   * 특정 능력을 가진 에이전트 찾기
   */
  public findAgentsWithCapability(capability: string): BaseAgent[] {
    return this.listActiveAgents().filter(
      agent => agent.hasCapability(capability)
    );
  }

  /**
   * 에이전트에 메시지 전송
   */
  public async sendMessage(
    message: Omit<IAgentMessage, 'id' | 'timestamp' | 'metadata'>, 
    targetAgentId: string
  ): Promise<IAgentResponse> {
    const agent = this.activeAgents.get(targetAgentId);
    if (!agent) {
      throw new Error(`존재하지 않는 에이전트 ID: ${targetAgentId}`);
    }

    const fullMessage: IAgentMessage = {
      ...message,
      metadata: {
        timestamp: Date.now(),
        sender: 'registry',
        recipient: targetAgentId,
        priority: 1
      }
    };

    return agent.processMessage(fullMessage);
  }

  /**
   * 워크플로우 단계를 위한 에이전트 실행
   * 워크플로우 시스템과 통합하기 위한 메서드
   */
  public async executeWorkflowStep(
    stepId: string, 
    stepType: StepType, 
    config: any, 
    context: AgentContext
  ): Promise<AgentResult> {
    try {
      // 해당 타입의 에이전트 목록 가져오기
      const agents = this.getAgentsByType(stepType);
      
      // 해당 타입의 에이전트가 없는 경우
      if (agents.length === 0) {
        throw new Error(`No agents available for step type: ${stepType}`);
      }
      
      // 현재는 단순히 첫 번째 적합한 에이전트 사용
      // 추후 역량 기반 선택 로직으로 개선 가능
      const agent = agents[0];
      
      console.log(`Executing step ${stepId} with agent ${agent.name} (${agent.id})`);
      
      // 에이전트 실행
      const result = await agent.execute(config, {
        ...context,
        stepId,
        stepType
      });
      
      return result;
    } catch (error) {
      console.error(`Error executing workflow step ${stepId}:`, error);
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      };
    }
  }

  /**
   * 등록된 에이전트 제거
   */
  public removeAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    
    // 에이전트 맵에서 제거
    this.agents.delete(id);
    
    // 타입별 에이전트 목록에서 제거
    const typeAgents = this.typeAgents.get(agent.type) || [];
    const updatedTypeAgents = typeAgents.filter(a => a.id !== id);
    this.typeAgents.set(agent.type, updatedTypeAgents);
    
    return true;
  }

  /**
   * 에이전트 등록
   */
  public registerAgent(agent: Agent): void {
    // ID 중복 검사
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with ID ${agent.id} already exists`);
    }

    // 에이전트 맵에 추가
    this.agents.set(agent.id, agent);

    // 타입별 에이전트 목록에 추가
    const typeAgents = this.typeAgents.get(agent.type) || [];
    typeAgents.push(agent);
    this.typeAgents.set(agent.type, typeAgents);

    console.log(`Agent '${agent.name}' (${agent.id}) registered successfully`);
  }

  /**
   * ID로 에이전트 조회
   */
  public getAgentById(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * 타입으로 에이전트 목록 조회
   */
  public getAgentsByType(type: StepType): Agent[] {
    return this.typeAgents.get(type) || [];
  }

  /**
   * 모든 에이전트 조회
   */
  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
} 