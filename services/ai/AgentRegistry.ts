import { BaseAgent, IAgentMessage, IAgentResponse } from './BaseAgent';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent>;
  private agentsByName: Map<string, BaseAgent>;

  private constructor() {
    this.agents = new Map();
    this.agentsByName = new Map();
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public registerAgent(agent: BaseAgent): void {
    const id = agent.getId();
    const name = agent.getName();

    if (this.agents.has(id)) {
      throw new Error(`ID가 '${id}'인 에이전트가 이미 등록되어 있습니다.`);
    }

    if (this.agentsByName.has(name)) {
      throw new Error(`이름이 '${name}'인 에이전트가 이미 등록되어 있습니다.`);
    }

    this.agents.set(id, agent);
    this.agentsByName.set(name, agent);
  }

  public getAgent(idOrName: string): BaseAgent | undefined {
    return this.agents.get(idOrName) || this.agentsByName.get(idOrName);
  }

  public removeAgent(idOrName: string): boolean {
    const agent = this.getAgent(idOrName);
    
    if (!agent) {
      return false;
    }

    const id = agent.getId();
    const name = agent.getName();

    this.agents.delete(id);
    this.agentsByName.delete(name);

    return true;
  }

  public async sendMessage(recipientIdOrName: string, message: IAgentMessage): Promise<IAgentResponse> {
    const agent = this.getAgent(recipientIdOrName);
    
    if (!agent) {
      return {
        success: false,
        error: `수신자 '${recipientIdOrName}'를 찾을 수 없습니다.`,
        metadata: {
          processingTime: 0,
          timestamp: Date.now()
        }
      };
    }

    return agent.handleMessage(message);
  }

  public async broadcastMessage(message: IAgentMessage): Promise<Map<string, IAgentResponse>> {
    const responses = new Map<string, IAgentResponse>();
    
    const agentEntries = Array.from(this.agents.entries());
    for (const [id, agent] of agentEntries) {
      responses.set(id, await agent.handleMessage(message));
    }
    
    return responses;
  }

  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  public getAgentCount(): number {
    return this.agents.size;
  }

  public async initializeAllAgents(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    const agentEntries = Array.from(this.agents.entries());
    for (const [id, agent] of agentEntries) {
      try {
        await agent.initialize();
        results.set(id, true);
      } catch (error) {
        console.error(`에이전트 초기화 오류 (${id}):`, error);
        results.set(id, false);
      }
    }
    
    return results;
  }

  public async shutdownAllAgents(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    const agentEntries = Array.from(this.agents.entries());
    for (const [id, agent] of agentEntries) {
      try {
        await agent.shutdown();
        results.set(id, true);
      } catch (error) {
        console.error(`에이전트 종료 오류 (${id}):`, error);
        results.set(id, false);
      }
    }
    
    return results;
  }

  public reset(): void {
    this.agents.clear();
    this.agentsByName.clear();
  }
} 