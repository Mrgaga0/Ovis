import { v4 as uuidv4 } from 'uuid';
import { AgentStatus } from '@/lib/agents/BaseAgent';
import { TaskStatus, TaskPriority } from '@/lib/agents/TaskAgent';

/**
 * 에이전트 타입 정의
 */
export interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
  status: AgentStatus;
  createdAt: Date;
  updatedAt: Date;
  config: Record<string, any>;
  stats?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * 작업(태스크) 타입 정의
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
  tags?: string[];
  parentTaskId?: string;
  dependencies?: string[];
  progress?: number;
  data?: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 에이전트 메시지 타입 정의
 */
export interface AgentMessage {
  id: string;
  agentId: string;
  taskId?: string;
  content: string;
  role: 'user' | 'system' | 'agent' | 'assistant';
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 에이전트 타입 정의
 */
export const AgentTypes = [
  'task',
  'workflow',
  'data',
  'llm',
  'search',
  'coordinator',
  'custom'
] as const;

export type AgentType = (typeof AgentTypes)[number];

/**
 * 에이전트 생성 요청 타입
 */
export interface CreateAgentRequest {
  name: string;
  type: AgentType;
  description?: string;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * 에이전트 업데이트 요청 타입
 */
export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  status?: AgentStatus;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * 작업(태스크) 생성 요청 타입
 */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  agentId?: string;
  dueDate?: Date;
  tags?: string[];
  parentTaskId?: string;
  dependencies?: string[];
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * 작업(태스크) 업데이트 요청 타입
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  agentId?: string;
  dueDate?: Date;
  tags?: string[];
  dependencies?: string[];
  progress?: number;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * 에이전트 서비스 클래스
 * 에이전트와 태스크 관련 API 호출 처리
 */
export class AgentService {
  private baseUrl: string;
  private apiKey?: string;

  /**
   * 생성자
   * @param baseUrl API 기본 URL
   * @param apiKey API 키 (선택적)
   */
  constructor(baseUrl: string = '/api', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * API 요청 헤더 생성
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * API 요청 실행 (유틸리티 메서드)
   * @param endpoint API 엔드포인트
   * @param method HTTP 메서드
   * @param data 요청 데이터 (선택적)
   */
  private async fetchApi<T>(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders();

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      throw new Error(
        errorData.message || `API 요청 실패: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * 모든 에이전트 목록 가져오기
   * @param type 에이전트 타입으로 필터링 (선택적)
   * @param status 에이전트 상태로 필터링 (선택적)
   */
  async getAgents(type?: AgentType, status?: AgentStatus): Promise<Agent[]> {
    let endpoint = '/agents';
    const params = new URLSearchParams();

    if (type) {
      params.append('type', type);
    }

    if (status) {
      params.append('status', status);
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    return this.fetchApi<Agent[]>(endpoint, 'GET');
  }

  /**
   * 특정 에이전트 정보 가져오기
   * @param id 에이전트 ID
   */
  async getAgent(id: string): Promise<Agent> {
    return this.fetchApi<Agent>(`/agents/${id}`, 'GET');
  }

  /**
   * 새 에이전트 생성
   * @param data 에이전트 생성 데이터
   */
  async createAgent(data: CreateAgentRequest): Promise<Agent> {
    return this.fetchApi<Agent>('/agents', 'POST', data);
  }

  /**
   * 에이전트 정보 업데이트
   * @param id 에이전트 ID
   * @param data 업데이트할 데이터
   */
  async updateAgent(id: string, data: UpdateAgentRequest): Promise<Agent> {
    return this.fetchApi<Agent>(`/agents/${id}`, 'PATCH', data);
  }

  /**
   * 에이전트 삭제
   * @param id 에이전트 ID
   */
  async deleteAgent(id: string): Promise<{ success: boolean }> {
    return this.fetchApi<{ success: boolean }>(`/agents/${id}`, 'DELETE');
  }

  /**
   * 에이전트 실행
   * @param id 에이전트 ID
   * @param input 실행 입력 데이터 (선택적)
   */
  async runAgent(id: string, input?: any): Promise<{ success: boolean; data?: any }> {
    return this.fetchApi<{ success: boolean; data?: any }>(
      `/agents/${id}/run`,
      'POST',
      { input }
    );
  }

  /**
   * 에이전트 일시 중지
   * @param id 에이전트 ID
   */
  async pauseAgent(id: string): Promise<{ success: boolean }> {
    return this.fetchApi<{ success: boolean }>(`/agents/${id}/pause`, 'POST');
  }

  /**
   * 에이전트 재개
   * @param id 에이전트 ID
   */
  async resumeAgent(id: string): Promise<{ success: boolean }> {
    return this.fetchApi<{ success: boolean }>(`/agents/${id}/resume`, 'POST');
  }

  /**
   * 에이전트 중지
   * @param id 에이전트 ID
   */
  async stopAgent(id: string): Promise<{ success: boolean }> {
    return this.fetchApi<{ success: boolean }>(`/agents/${id}/stop`, 'POST');
  }

  /**
   * 에이전트 로그 가져오기
   * @param id 에이전트 ID
   * @param limit 반환할 로그 항목 수 (선택적)
   */
  async getAgentLogs(id: string, limit?: number): Promise<any[]> {
    let endpoint = `/agents/${id}/logs`;
    
    if (limit) {
      endpoint += `?limit=${limit}`;
    }
    
    return this.fetchApi<any[]>(endpoint, 'GET');
  }

  /**
   * 에이전트 통계 가져오기
   * @param id 에이전트 ID
   */
  async getAgentStats(id: string): Promise<Record<string, any>> {
    return this.fetchApi<Record<string, any>>(`/agents/${id}/stats`, 'GET');
  }

  /**
   * 에이전트에 의해 처리된 태스크 목록 가져오기
   * @param id 에이전트 ID
   * @param status 태스크 상태로 필터링 (선택적)
   */
  async getAgentTasks(id: string, status?: TaskStatus): Promise<Task[]> {
    let endpoint = `/agents/${id}/tasks`;
    
    if (status) {
      endpoint += `?status=${status}`;
    }
    
    return this.fetchApi<Task[]>(endpoint, 'GET');
  }

  /**
   * 모든 태스크 목록 가져오기
   * @param status 태스크 상태로 필터링 (선택적)
   * @param priority 태스크 우선순위로 필터링 (선택적)
   * @param agentId 담당 에이전트 ID로 필터링 (선택적)
   */
  async getTasks(
    status?: TaskStatus,
    priority?: TaskPriority,
    agentId?: string
  ): Promise<Task[]> {
    let endpoint = '/tasks';
    const params = new URLSearchParams();

    if (status) {
      params.append('status', status);
    }

    if (priority) {
      params.append('priority', priority);
    }

    if (agentId) {
      params.append('agentId', agentId);
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    return this.fetchApi<Task[]>(endpoint, 'GET');
  }

  /**
   * 특정 태스크 정보 가져오기
   * @param id 태스크 ID
   */
  async getTask(id: string): Promise<Task> {
    return this.fetchApi<Task>(`/tasks/${id}`, 'GET');
  }

  /**
   * 새 태스크 생성
   * @param data 태스크 생성 데이터
   */
  async createTask(data: CreateTaskRequest): Promise<Task> {
    return this.fetchApi<Task>('/tasks', 'POST', data);
  }

  /**
   * 태스크 정보 업데이트
   * @param id 태스크 ID
   * @param data 업데이트할 데이터
   */
  async updateTask(id: string, data: UpdateTaskRequest): Promise<Task> {
    return this.fetchApi<Task>(`/tasks/${id}`, 'PATCH', data);
  }

  /**
   * 태스크 삭제
   * @param id 태스크 ID
   */
  async deleteTask(id: string): Promise<{ success: boolean }> {
    return this.fetchApi<{ success: boolean }>(`/tasks/${id}`, 'DELETE');
  }

  /**
   * 에이전트 메시지 가져오기
   * @param agentId 에이전트 ID (선택적)
   * @param taskId 태스크 ID (선택적)
   * @param limit 반환할 메시지 수 (선택적)
   */
  async getMessages(
    agentId?: string,
    taskId?: string,
    limit?: number
  ): Promise<AgentMessage[]> {
    let endpoint = '/agents/messages';
    const params = new URLSearchParams();

    if (agentId) {
      params.append('agentId', agentId);
    }

    if (taskId) {
      params.append('taskId', taskId);
    }

    if (limit) {
      params.append('limit', limit.toString());
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    return this.fetchApi<AgentMessage[]>(endpoint, 'GET');
  }

  /**
   * 에이전트에 메시지 전송
   * @param agentId 에이전트 ID
   * @param content 메시지 내용
   * @param taskId 관련 태스크 ID (선택적)
   * @param metadata 추가 메타데이터 (선택적)
   */
  async sendMessage(
    agentId: string,
    content: string,
    taskId?: string,
    metadata?: Record<string, any>
  ): Promise<AgentMessage> {
    return this.fetchApi<AgentMessage>('/agents/messages', 'POST', {
      agentId,
      content,
      taskId,
      metadata,
      role: 'user',
    });
  }
} 