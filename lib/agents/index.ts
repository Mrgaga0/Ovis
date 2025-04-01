import { BaseAgent } from './base-agent';
import { AgentRegistry } from './registry';
import { TaskAgent } from './specialized/task-agent';
import { ContentAgent } from './specialized/content-agent';
import { DesignAgent } from './specialized/design-agent';
import { ResearchAgent } from './specialized/research-agent';
import { WebSocketAgent } from './specialized/websocket-agent';
import { StepType } from '../workflow/executor';
import { AgentCoordinator } from './coordinator';

/**
 * 기본 에이전트 생성 함수
 */
export async function createDefaultAgents() {
  const registry = AgentRegistry.getInstance();
  
  // 작업 관리 에이전트 생성
  const taskAgent = new TaskAgent({
    id: 'task-agent',
    type: 'task',
    name: 'TaskAgent',
    description: '작업 생성, 관리, 실행을 담당하는 특화된 에이전트',
    maxQueueSize: 1000,
    maxConcurrentTasks: 5,
    maxRetries: 3,
    defaultTaskTimeout: 30000
  });
  
  // 콘텐츠 에이전트 생성
  const contentAgent = new ContentAgent({
    id: 'content-agent',
    type: 'content',
    name: 'ContentAgent',
    description: '콘텐츠 생성 및 최적화를 담당하는 에이전트'
  });
  
  // 디자인 에이전트 생성
  const designAgent = new DesignAgent({
    id: 'design-agent',
    type: 'design',
    name: 'DesignAgent',
    description: '디자인 분석 및 생성을 담당하는 에이전트'
  });
  
  // 리서치 에이전트 생성
  const researchAgent = new ResearchAgent({
    id: 'research-agent',
    type: 'research',
    name: 'ResearchAgent',
    description: '웹 검색 및 연구 분석을 담당하는 에이전트'
  });
  
  // 웹소켓 에이전트 생성
  const websocketAgent = new WebSocketAgent({
    id: 'websocket-agent',
    type: 'task',
    name: 'WebSocketAgent',
    description: '웹소켓 연결 관리 및 실시간 통신을 담당하는 에이전트',
    port: 3002,
    heartbeatInterval: 30000,
    maxInactivityTime: 300000
  });
  
  // 에이전트 초기화
  await taskAgent.initialize();
  await contentAgent.initialize();
  await designAgent.initialize();
  await researchAgent.initialize();
  await websocketAgent.initialize();
  
  // 레지스트리에 에이전트 등록
  registry.getAgent = function(id: string) {
    if (id === 'task-agent') return taskAgent;
    if (id === 'content-agent') return contentAgent;
    if (id === 'design-agent') return designAgent;
    if (id === 'research-agent') return researchAgent;
    if (id === 'websocket-agent') return websocketAgent;
    return undefined;
  };
  
  return {
    taskAgent,
    contentAgent,
    designAgent,
    researchAgent,
    websocketAgent
  };
}

/**
 * 특정 에이전트를 사용하여 작업 실행
 */
export async function executeWithAgent(agentId: string, message: { type: string; content: any }) {
  const registry = AgentRegistry.getInstance();
  const msgToSend = {
    type: message.type,
    content: message.content,
    metadata: {
      timestamp: Date.now(),
      sender: 'system',
      recipient: agentId,
      priority: 1
    }
  };
  return registry.sendMessage(msgToSend, agentId);
}

// 에이전트 레지스트리 가져오기
export function getAgentRegistry() {
  return AgentRegistry.getInstance();
}

// 모듈 내보내기
export {
  BaseAgent,
  AgentRegistry,
  TaskAgent,
  ContentAgent,
  DesignAgent,
  ResearchAgent,
  WebSocketAgent,
  AgentCoordinator
};

// 추가 에이전트 유형을 구현하고 내보낼 수 있음... 