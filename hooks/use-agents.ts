import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'initialized' | 'running' | 'paused' | 'error' | 'shutdown';
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UseAgentsOptions {
  autoLoad?: boolean;
}

/**
 * 에이전트 관리를 위한 커스텀 훅
 * @param options 설정 옵션
 */
export function useAgents(options: UseAgentsOptions = {}) {
  const { autoLoad = true } = options;
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 에이전트 목록 불러오기
  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agents');
      
      if (!response.ok) {
        throw new Error('에이전트 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('에이전트 목록 불러오기 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: '에이전트 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 에이전트 생성
  const createAgent = useCallback(async (values: any) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '에이전트 생성에 실패했습니다.');
      }

      const newAgent = await response.json();
      setAgents(prev => [...prev, newAgent]);
      
      toast({
        title: '성공',
        description: `${newAgent.name} 에이전트가 생성되었습니다.`,
      });
      
      return newAgent;
    } catch (error) {
      console.error('에이전트 생성 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '에이전트 생성에 실패했습니다.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // 에이전트 상태 변경
  const updateAgentStatus = useCallback(async (id: string, status: string) => {
    setError(null);
    
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '상태 변경에 실패했습니다.');
      }

      const updatedAgent = await response.json();
      setAgents(prev => prev.map(agent => 
        agent.id === id ? { ...agent, status: updatedAgent.status } : agent
      ));
      
      const statusText = {
        running: '실행 중',
        paused: '일시 정지됨',
        initialized: '초기화됨',
        shutdown: '중지됨',
      }[status] || status;
      
      toast({
        title: '상태 변경됨',
        description: `에이전트 상태가 ${statusText}(으)로 변경되었습니다.`,
      });
      
      return updatedAgent;
    } catch (error) {
      console.error('에이전트 상태 변경 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '상태 변경에 실패했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  // 에이전트 삭제
  const deleteAgent = useCallback(async (id: string) => {
    setError(null);
    
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '삭제에 실패했습니다.');
      }

      setAgents(prev => prev.filter(agent => agent.id !== id));
      
      toast({
        title: '삭제됨',
        description: '에이전트가 성공적으로 삭제되었습니다.',
      });
      
      return true;
    } catch (error) {
      console.error('에이전트 삭제 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '삭제에 실패했습니다.',
        variant: 'destructive',
      });
      return false;
    }
  }, []);

  // 에이전트 메시지 전송
  const sendMessage = useCallback(async (agentId: string, type: string, content: any) => {
    setError(null);
    
    try {
      const response = await fetch('/api/agents/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetAgent: agentId,
          type,
          content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '메시지 전송에 실패했습니다.');
      }

      return await response.json();
    } catch (error) {
      console.error('에이전트 메시지 전송 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '메시지 전송에 실패했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  // 컴포넌트 마운트 시 에이전트 목록 불러오기
  useEffect(() => {
    if (autoLoad) {
      fetchAgents();
    }
  }, [autoLoad, fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    isSubmitting,
    fetchAgents,
    createAgent,
    updateAgentStatus,
    deleteAgent,
    sendMessage
  };
} 