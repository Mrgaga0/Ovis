'use client';

import { useState, useEffect } from 'react';
import { Container } from '@/components/responsive/Container';
import { Grid } from '@/components/responsive/Grid';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Bot, 
  BrainCircuit, 
  Check, 
  Clock, 
  ExternalLink, 
  PlayCircle, 
  XCircle 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  failedTasks: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    failedTasks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // 대시보드 통계 불러오기
  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      // 에이전트 데이터 가져오기
      const agentsResponse = await fetch('/api/agents');
      if (!agentsResponse.ok) {
        throw new Error('에이전트 데이터를 불러오는데 실패했습니다.');
      }
      const agents = await agentsResponse.json();
      
      // 태스크 데이터 가져오기
      const tasksResponse = await fetch('/api/agents/tasks');
      if (!tasksResponse.ok) {
        throw new Error('태스크 데이터를 불러오는데 실패했습니다.');
      }
      const tasks = await tasksResponse.json();
      
      // 통계 계산
      const activeAgents = agents.filter(
        (agent: any) => agent.status === 'running'
      ).length;
      
      const completedTasks = tasks.filter(
        (task: any) => task.status === 'completed'
      ).length;
      
      const pendingTasks = tasks.filter(
        (task: any) => ['created', 'pending', 'processing'].includes(task.status)
      ).length;
      
      const failedTasks = tasks.filter(
        (task: any) => task.status === 'failed'
      ).length;
      
      setStats({
        totalAgents: agents.length,
        activeAgents,
        totalTasks: tasks.length,
        completedTasks,
        pendingTasks,
        failedTasks,
      });
    } catch (error) {
      console.error('대시보드 통계 로딩 오류:', error);
      toast({
        title: '오류',
        description: '대시보드 데이터를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDashboardStats();
  }, []);
  
  return (
    <Container>
      <div className="py-6">
        <h1 className="text-3xl font-bold mb-1">대시보드</h1>
        <p className="text-muted-foreground mb-6">
          AI 에이전트 및 태스크 현황 요약
        </p>
        
        {/* 주요 통계 카드 */}
        <Grid
          cols={{
            xs: 1,
            sm: 2,
            md: 4,
          }}
          gap={4}
          className="mb-8"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Bot className="mr-2 h-5 w-5 text-primary" />
                총 에이전트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAgents}</div>
              <p className="text-sm text-muted-foreground">
                활성 에이전트: {stats.activeAgents}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BrainCircuit className="mr-2 h-5 w-5 text-primary" />
                총 태스크
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTasks}</div>
              <p className="text-sm text-muted-foreground">
                전체 처리 태스크 수
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Check className="mr-2 h-5 w-5 text-green-500" />
                완료 태스크
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completedTasks}</div>
              <p className="text-sm text-muted-foreground">
                성공률: {stats.totalTasks > 0 
                  ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
                  : 0}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Clock className="mr-2 h-5 w-5 text-orange-500" />
                대기 태스크
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingTasks}</div>
              <p className="text-sm text-muted-foreground">
                진행 및 대기 중인 태스크
              </p>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 빠른 액션 섹션 */}
        <h2 className="text-xl font-bold mb-4">빠른 액션</h2>
        <Grid
          cols={{
            xs: 1,
            sm: 2,
            md: 3,
          }}
          gap={4}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>에이전트 관리</CardTitle>
              <CardDescription>
                에이전트를 생성하고 현재 상태를 확인합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => router.push('/agents')}
              >
                <Bot className="mr-2 h-4 w-4" />
                에이전트 관리로 이동
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>태스크 관리</CardTitle>
              <CardDescription>
                진행 중인 태스크를 모니터링하고 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => router.push('/tasks')}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                태스크 관리로 이동
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>워크플로우</CardTitle>
              <CardDescription>
                자동화 워크플로우를 생성하고 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => router.push('/workflow')}
              >
                <BrainCircuit className="mr-2 h-4 w-4" />
                워크플로우로 이동
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </div>
    </Container>
  );
} 