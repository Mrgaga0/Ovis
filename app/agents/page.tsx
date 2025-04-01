'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/responsive/Container';
import { Grid } from '@/components/responsive/Grid';
import { AgentCard } from '@/components/agents/AgentCard';
import { AgentForm } from '@/components/agents/AgentForm';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from "@/hooks/use-toast";

type Agent = {
  id: string;
  name: string;
  type: string;
  status: 'initialized' | 'running' | 'paused' | 'error' | 'shutdown';
  taskCount: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 에이전트 목록 불러오기
  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agents');
      
      if (!response.ok) {
        throw new Error('에이전트 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('에이전트 목록 불러오기 오류:', error);
      toast({
        title: '오류',
        description: '에이전트 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // 에이전트 생성 처리
  const handleCreateAgent = async (values: any) => {
    setIsSubmitting(true);
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
      toast({
        title: '성공',
        description: `${newAgent.name} 에이전트가 생성되었습니다.`,
      });
      
      // 에이전트 목록 새로고침
      fetchAgents();
    } catch (error) {
      console.error('에이전트 생성 오류:', error);
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '에이전트 생성에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 에이전트 상태 변경 처리
  const updateAgentStatus = async (id: string, status: string) => {
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

      // 상태 변경 성공 시 에이전트 목록 새로고침
      fetchAgents();
      
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
    } catch (error) {
      console.error('에이전트 상태 변경 오류:', error);
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '상태 변경에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 에이전트 시작
  const handleStartAgent = (id: string) => {
    updateAgentStatus(id, 'running');
  };

  // 에이전트 일시 정지
  const handlePauseAgent = (id: string) => {
    updateAgentStatus(id, 'paused');
  };

  // 에이전트 재시작
  const handleRestartAgent = (id: string) => {
    updateAgentStatus(id, 'initialized');
  };

  // 에이전트 삭제 처리
  const handleDeleteAgent = async (id: string) => {
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '삭제에 실패했습니다.');
      }

      // 삭제 성공 시 에이전트 목록 새로고침
      fetchAgents();
      
      toast({
        title: '삭제됨',
        description: '에이전트가 성공적으로 삭제되었습니다.',
      });
    } catch (error) {
      console.error('에이전트 삭제 오류:', error);
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Container>
      <div className="flex items-center justify-between py-6">
        <div>
          <h1 className="text-3xl font-bold">에이전트 관리</h1>
          <p className="text-muted-foreground">
            현재 운영 중인 AI 에이전트를 관리합니다.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={fetchAgents}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                새 에이전트 추가
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>새 에이전트 생성</SheetTitle>
                <SheetDescription>
                  새로운 AI 에이전트를 생성합니다. 필요한 정보를 입력해주세요.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <AgentForm onSubmit={handleCreateAgent} isSubmitting={isSubmitting} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">에이전트 로딩 중...</p>
          </div>
        </div>
      ) : agents.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div>
            <p className="text-muted-foreground">
              생성된 에이전트가 없습니다. 새 에이전트를 추가해주세요.
            </p>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  새 에이전트 추가
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>새 에이전트 생성</SheetTitle>
                  <SheetDescription>
                    새로운 AI 에이전트를 생성합니다. 필요한 정보를 입력해주세요.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <AgentForm onSubmit={handleCreateAgent} isSubmitting={isSubmitting} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      ) : (
        <Grid
          cols={{
            xs: 1,
            sm: 2,
            md: 3,
            lg: 4,
          }}
          gap={4}
          className="mb-10"
        >
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              id={agent.id}
              name={agent.name}
              type={agent.type}
              status={agent.status}
              taskCount={agent.taskCount}
              onStart={handleStartAgent}
              onPause={handlePauseAgent}
              onRestart={handleRestartAgent}
              onDelete={handleDeleteAgent}
            />
          ))}
        </Grid>
      )}
    </Container>
  );
} 