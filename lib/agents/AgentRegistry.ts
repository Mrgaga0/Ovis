import { EventEmitter } from 'events';
import { BaseAgent, AgentStatus } from './BaseAgent';

/**
 * 에이전트 레지스트리 클래스
 * 모든 생성된 에이전트를 등록, 관리, 검색하기 위한 중앙 레지스트리
 */
export class AgentRegistry extends EventEmitter {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();
  private agentsByType: Map<string, Set<string>> = new Map();
  private agentsByStatus: Map<AgentStatus, Set<string>> = new Map();
  
  /**
   * 생성자는 private으로 싱글톤 패턴을 구현
   */
  private constructor() {
    super();
    
    // 상태 맵 초기화
    Object.values(AgentStatus).forEach(status => {
      this.agentsByStatus.set(status, new Set());
    });
  }
  
  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }
  
  /**
   * 에이전트 등록
   * @param agent 등록할 BaseAgent 객체
   */
  public registerAgent(agent: BaseAgent): void {
    const agentId = agent.getId();
    const agentType = agent.getType();
    const agentStatus = agent.getStatus();
    
    // 이미 등록된 에이전트인지 확인
    if (this.agents.has(agentId)) {
      throw new Error(`에이전트 ID ${agentId}는 이미 등록되어 있습니다.`);
    }
    
    // 에이전트 맵에 추가
    this.agents.set(agentId, agent);
    
    // 타입별 맵에 추가
    if (!this.agentsByType.has(agentType)) {
      this.agentsByType.set(agentType, new Set());
    }
    this.agentsByType.get(agentType)?.add(agentId);
    
    // 상태별 맵에 추가
    this.agentsByStatus.get(agentStatus)?.add(agentId);
    
    // 에이전트 상태 변경 이벤트 리스너 등록
    agent.on('status-changed', (data: { agentId: string, previousStatus: AgentStatus, newStatus: AgentStatus }) => {
      this.handleAgentStatusChange(data.agentId, data.previousStatus, data.newStatus);
    });
    
    // 등록 이벤트 발생
    this.emit('agent-registered', { agentId, agent });
  }
  
  /**
   * 에이전트 제거
   * @param agentId 제거할 에이전트 ID
   */
  public unregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      return false;
    }
    
    // 에이전트 상태 및 타입 가져오기
    const agentType = agent.getType();
    const agentStatus = agent.getStatus();
    
    // 맵에서 제거
    this.agents.delete(agentId);
    
    // 타입별 맵에서 제거
    this.agentsByType.get(agentType)?.delete(agentId);
    if (this.agentsByType.get(agentType)?.size === 0) {
      this.agentsByType.delete(agentType);
    }
    
    // 상태별 맵에서 제거
    this.agentsByStatus.get(agentStatus)?.delete(agentId);
    
    // 제거 이벤트 발생
    this.emit('agent-unregistered', { agentId });
    
    return true;
  }
  
  /**
   * 에이전트 상태 변경 처리
   * @param agentId 에이전트 ID
   * @param previousStatus 이전 상태
   * @param newStatus 새 상태
   */
  private handleAgentStatusChange(
    agentId: string,
    previousStatus: AgentStatus,
    newStatus: AgentStatus
  ): void {
    // 이전 상태 맵에서 제거
    this.agentsByStatus.get(previousStatus)?.delete(agentId);
    
    // 새 상태 맵에 추가
    this.agentsByStatus.get(newStatus)?.add(agentId);
  }
  
  /**
   * ID로 에이전트 가져오기
   * @param agentId 에이전트 ID
   */
  public getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }
  
  /**
   * 모든 에이전트 가져오기
   */
  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * 특정 타입의 모든 에이전트 가져오기
   * @param type 에이전트 타입
   */
  public getAgentsByType(type: string): BaseAgent[] {
    const agentIds = this.agentsByType.get(type);
    
    if (!agentIds || agentIds.size === 0) {
      return [];
    }
    
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is BaseAgent => agent !== undefined);
  }
  
  /**
   * 특정 상태의 모든 에이전트 가져오기
   * @param status 에이전트 상태
   */
  public getAgentsByStatus(status: AgentStatus): BaseAgent[] {
    const agentIds = this.agentsByStatus.get(status);
    
    if (!agentIds || agentIds.size === 0) {
      return [];
    }
    
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is BaseAgent => agent !== undefined);
  }
  
  /**
   * 등록된 에이전트 수 가져오기
   */
  public getAgentCount(): number {
    return this.agents.size;
  }
  
  /**
   * 타입별 에이전트 수 가져오기
   */
  public getAgentCountByType(): Record<string, number> {
    const result: Record<string, number> = {};
    
    this.agentsByType.forEach((agentIds, type) => {
      result[type] = agentIds.size;
    });
    
    return result;
  }
  
  /**
   * 상태별 에이전트 수 가져오기
   */
  public getAgentCountByStatus(): Record<string, number> {
    const result: Record<string, number> = {};
    
    this.agentsByStatus.forEach((agentIds, status) => {
      result[status] = agentIds.size;
    });
    
    return result;
  }
  
  /**
   * 모든 에이전트 시작
   */
  public async startAllAgents(): Promise<number> {
    const idleAgents = this.getAgentsByStatus(AgentStatus.IDLE);
    const pausedAgents = this.getAgentsByStatus(AgentStatus.PAUSED);
    const agentsToStart = [...idleAgents, ...pausedAgents];
    
    let startedCount = 0;
    
    for (const agent of agentsToStart) {
      try {
        if (agent.getStatus() === AgentStatus.PAUSED) {
          if (agent.resume()) {
            startedCount++;
          }
        } else {
          const result = await agent.run();
          if (result.success) {
            startedCount++;
          }
        }
      } catch (error) {
        console.error(`에이전트 ${agent.getId()} 시작 중 오류:`, error);
      }
    }
    
    return startedCount;
  }
  
  /**
   * 모든 에이전트 일시 중지
   */
  public pauseAllAgents(): number {
    const runningAgents = this.getAgentsByStatus(AgentStatus.RUNNING);
    let pausedCount = 0;
    
    for (const agent of runningAgents) {
      try {
        if (agent.pause()) {
          pausedCount++;
        }
      } catch (error) {
        console.error(`에이전트 ${agent.getId()} 일시 중지 중 오류:`, error);
      }
    }
    
    return pausedCount;
  }
  
  /**
   * 모든 에이전트 중지
   */
  public stopAllAgents(): number {
    const activeAgents = [
      ...this.getAgentsByStatus(AgentStatus.RUNNING),
      ...this.getAgentsByStatus(AgentStatus.PAUSED)
    ];
    let stoppedCount = 0;
    
    for (const agent of activeAgents) {
      try {
        if (agent.stop()) {
          stoppedCount++;
        }
      } catch (error) {
        console.error(`에이전트 ${agent.getId()} 중지 중 오류:`, error);
      }
    }
    
    return stoppedCount;
  }
  
  /**
   * 모든 에이전트 제거 (레지스트리 초기화)
   */
  public clearRegistry(): number {
    const count = this.agents.size;
    
    this.agents.clear();
    this.agentsByType.clear();
    
    Object.values(AgentStatus).forEach(status => {
      this.agentsByStatus.set(status, new Set());
    });
    
    this.emit('registry-cleared', { count });
    
    return count;
  }
  
  /**
   * 에이전트 필터링 및 검색
   * @param filters 필터 조건 객체
   */
  public searchAgents(filters: {
    type?: string;
    status?: AgentStatus;
    name?: string;
    query?: string;
  }): BaseAgent[] {
    let filteredAgents = this.getAllAgents();
    
    // 타입 필터링
    if (filters.type) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.getType() === filters.type
      );
    }
    
    // 상태 필터링
    if (filters.status) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.getStatus() === filters.status
      );
    }
    
    // 이름 필터링
    if (filters.name) {
      const nameLower = filters.name.toLowerCase();
      filteredAgents = filteredAgents.filter(agent => 
        agent.getName().toLowerCase().includes(nameLower)
      );
    }
    
    // 쿼리 필터링 (이름, 설명에서 검색)
    if (filters.query) {
      const queryLower = filters.query.toLowerCase();
      filteredAgents = filteredAgents.filter(agent => 
        agent.getName().toLowerCase().includes(queryLower) ||
        agent.getDescription().toLowerCase().includes(queryLower)
      );
    }
    
    return filteredAgents;
  }
} 