import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  agentId: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  data: any;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseTasksOptions {
  autoLoad?: boolean;
  agentId?: string;
}

/**
 * 태스크 관리를 위한 커스텀 훅
 * @param options 설정 옵션
 */
export function useTasks(options: UseTasksOptions = {}) {
  const { autoLoad = true, agentId } = options;
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 태스크 목록 불러오기
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = agentId 
        ? `/api/agents/tasks?agentId=${agentId}` 
        : '/api/agents/tasks';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('태스크 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('태스크 목록 불러오기 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: '태스크 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  // 태스크 생성
  const createTask = useCallback(async (taskData: { agentId: string; type: string; data: any; priority?: number }) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agents/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '태스크 생성에 실패했습니다.');
      }

      const newTask = await response.json();
      setTasks(prev => [...prev, newTask]);
      
      toast({
        title: '성공',
        description: `새 태스크가 생성되었습니다.`,
      });
      
      return newTask;
    } catch (error) {
      console.error('태스크 생성 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '태스크 생성에 실패했습니다.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // 태스크 상세 조회
  const getTask = useCallback(async (taskId: string) => {
    setError(null);
    
    try {
      const response = await fetch(`/api/agents/tasks/${taskId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '태스크 조회에 실패했습니다.');
      }
      
      return await response.json();
    } catch (error) {
      console.error('태스크 조회 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '태스크 조회에 실패했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  // 태스크 상태 변경
  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    setError(null);
    
    try {
      const response = await fetch(`/api/agents/tasks/${taskId}`, {
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

      const updatedTask = await response.json();
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: updatedTask.status } : task
      ));
      
      const statusText = {
        pending: '대기 중',
        processing: '처리 중',
        completed: '완료됨',
        failed: '실패'
      }[status] || status;
      
      toast({
        title: '상태 변경됨',
        description: `태스크 상태가 ${statusText}(으)로 변경되었습니다.`,
      });
      
      return updatedTask;
    } catch (error) {
      console.error('태스크 상태 변경 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '상태 변경에 실패했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  // 태스크 삭제
  const deleteTask = useCallback(async (taskId: string) => {
    setError(null);
    
    try {
      const response = await fetch(`/api/agents/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '삭제에 실패했습니다.');
      }

      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      toast({
        title: '삭제됨',
        description: '태스크가 성공적으로 삭제되었습니다.',
      });
      
      return true;
    } catch (error) {
      console.error('태스크 삭제 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '삭제에 실패했습니다.',
        variant: 'destructive',
      });
      return false;
    }
  }, []);

  // 태스크 처리 요청
  const processTask = useCallback(async (taskId: string) => {
    setError(null);
    
    try {
      const response = await fetch('/api/agents/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetAgent: 'task',  // 태스크 처리는 태스크 에이전트에게 요청
          type: 'PROCESS_TASK',
          content: { taskId },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '태스크 처리에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        // 태스크 목록 새로고침
        fetchTasks();
        
        toast({
          title: '처리 요청됨',
          description: '태스크 처리가 요청되었습니다.',
        });
      } else {
        throw new Error(result.error || '태스크 처리에 실패했습니다.');
      }
      
      return result;
    } catch (error) {
      console.error('태스크 처리 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '태스크 처리에 실패했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchTasks]);

  // 컴포넌트 마운트 시 태스크 목록 불러오기
  useEffect(() => {
    if (autoLoad) {
      fetchTasks();
    }
  }, [autoLoad, fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    isSubmitting,
    fetchTasks,
    createTask,
    getTask,
    updateTaskStatus,
    deleteTask,
    processTask
  };
} 