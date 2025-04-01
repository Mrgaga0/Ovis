'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, MessageSquare, PlayCircle, ClipboardList } from 'lucide-react';
import { Container } from '@/components/responsive/Container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

type Agent = {
  id: string;
  name: string;
  type: string;
  status: 'initialized' | 'running' | 'paused' | 'error' | 'shutdown';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  tasks: AgentTask[];
};

type AgentTask = {
  id: string;
  agentId: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  result: any;
  createdAt: string;
  updatedAt: string;
};

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // 에이전트 상세 정보 로드
  const fetchAgentDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/${params.id}`);
      
      if (!response.ok) {
        throw new Error('에이전트 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setAgent(data);
    } catch (error) {
      console.error('에이전트 상세 조회 오류:', error);
      toast({
        title: '오류',
        description: '에이전트 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentDetails();
  }, [params.id]);

  // 에이전트 상태 변경 처리
  const updateAgentStatus = async (status: string) => {
    try {
      const response = await fetch(`/api/agents/${params.id}`, {
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

      // 상태 변경 성공 시 에이전트 정보 새로고침
      fetchAgentDetails();
      
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

  // 작업 색상 매핑
  const getTaskStatusColor = (status: string) => {
    return {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }[status] || 'bg-gray-100 text-gray-800';
  };

  // 새 작업 생성
  const createTask = async (data: any) => {
    try {
      const response = await fetch('/api/agents/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: params.id,
          type: 'data_processing', // 기본 작업 유형
          data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '작업 생성에 실패했습니다.');
      }

      toast({
        title: '작업 생성됨',
        description: '새 작업이 성공적으로 생성되었습니다.',
      });
      
      // 작업 생성 후 에이전트 정보 새로고침
      fetchAgentDetails();
    } catch (error) {
      console.error('작업 생성 오류:', error);
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '작업 생성에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 테스트 작업 생성 - 실제로는 제대로 된 양식을 만들어야 함
  const createTestTask = () => {
    createTask({
      message: '테스트 작업',
      timestamp: new Date().toISOString(),
    });
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
            <p className="mt-4 text-lg text-muted-foreground">에이전트 정보 로딩 중...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (!agent) {
    return (
      <Container>
        <div className="py-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로 가기
          </Button>
        </div>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center">
            <p className="text-xl font-semibold">에이전트를 찾을 수 없습니다.</p>
            <p className="mt-2 text-muted-foreground">요청하신 에이전트가 존재하지 않거나 삭제되었습니다.</p>
            <Button className="mt-4" onClick={() => router.push('/agents')}>
              에이전트 목록으로 돌아가기
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex items-center justify-between py-6">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로 가기
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <p className="text-muted-foreground">
              {agent.type === 'task' ? '작업 에이전트' : 
               agent.type === 'base' ? '기본 에이전트' : '커스텀 에이전트'}
              {' · '}
              {agent.status === 'running' ? '실행 중' : 
               agent.status === 'paused' ? '일시 정지됨' : 
               agent.status === 'initialized' ? '초기화됨' : 
               agent.status === 'error' ? '오류 상태' : '중지됨'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={fetchAgentDetails}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          
          {agent.status === 'initialized' || agent.status === 'paused' || agent.status === 'error' ? (
            <Button onClick={() => updateAgentStatus('running')} variant="default">
              <PlayCircle className="mr-2 h-4 w-4" />
              시작
            </Button>
          ) : agent.status === 'running' ? (
            <Button onClick={() => updateAgentStatus('paused')} variant="secondary">
              <PlayCircle className="mr-2 h-4 w-4" />
              일시정지
            </Button>
          ) : null}
          
          {agent.type === 'task' && (
            <Button onClick={createTestTask}>
              <ClipboardList className="mr-2 h-4 w-4" />
              테스트 작업 생성
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="tasks">작업 ({agent.tasks.length})</TabsTrigger>
          <TabsTrigger value="messages">메시지</TabsTrigger>
          <TabsTrigger value="logs">로그</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>에이전트 정보</CardTitle>
                <CardDescription>에이전트의 기본 정보입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y">
                  <div className="py-3 grid grid-cols-3">
                    <dt className="font-medium text-gray-500">ID</dt>
                    <dd className="col-span-2">{agent.id}</dd>
                  </div>
                  <div className="py-3 grid grid-cols-3">
                    <dt className="font-medium text-gray-500">이름</dt>
                    <dd className="col-span-2">{agent.name}</dd>
                  </div>
                  <div className="py-3 grid grid-cols-3">
                    <dt className="font-medium text-gray-500">유형</dt>
                    <dd className="col-span-2">
                      {agent.type === 'task' ? '작업 에이전트' : 
                       agent.type === 'base' ? '기본 에이전트' : '커스텀 에이전트'}
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3">
                    <dt className="font-medium text-gray-500">상태</dt>
                    <dd className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === 'running' ? 'bg-green-100 text-green-800' :
                        agent.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        agent.status === 'error' ? 'bg-red-100 text-red-800' :
                        agent.status === 'initialized' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {agent.status === 'running' ? '실행 중' : 
                         agent.status === 'paused' ? '일시 정지됨' : 
                         agent.status === 'initialized' ? '초기화됨' : 
                         agent.status === 'error' ? '오류 상태' : '중지됨'}
                      </span>
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3">
                    <dt className="font-medium text-gray-500">생성일</dt>
                    <dd className="col-span-2">{new Date(agent.createdAt).toLocaleString()}</dd>
                  </div>
                  <div className="py-3 grid grid-cols-3">
                    <dt className="font-medium text-gray-500">최근 업데이트</dt>
                    <dd className="col-span-2">{new Date(agent.updatedAt).toLocaleString()}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>메타데이터</CardTitle>
                <CardDescription>에이전트의 추가 설정 정보입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                {agent.type === 'task' ? (
                  <dl className="divide-y">
                    <div className="py-3 grid grid-cols-3">
                      <dt className="font-medium text-gray-500">최대 작업 수</dt>
                      <dd className="col-span-2">{agent.metadata.maxTasks || 3}</dd>
                    </div>
                    <div className="py-3 grid grid-cols-3">
                      <dt className="font-medium text-gray-500">현재 작업 수</dt>
                      <dd className="col-span-2">
                        {agent.tasks.filter(t => t.status === 'pending' || t.status === 'processing').length}
                      </dd>
                    </div>
                    <div className="py-3 grid grid-cols-3">
                      <dt className="font-medium text-gray-500">완료된 작업</dt>
                      <dd className="col-span-2">
                        {agent.tasks.filter(t => t.status === 'completed').length}
                      </dd>
                    </div>
                    <div className="py-3 grid grid-cols-3">
                      <dt className="font-medium text-gray-500">실패한 작업</dt>
                      <dd className="col-span-2">
                        {agent.tasks.filter(t => t.status === 'failed').length}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-muted-foreground">이 에이전트 유형에 대한 추가 메타데이터가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>에이전트 작업 목록</CardTitle>
              <CardDescription>
                에이전트에 할당된 작업 목록입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agent.tasks.length === 0 ? (
                <div className="text-center py-10">
                  <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">할당된 작업이 없습니다.</p>
                  {agent.type === 'task' && (
                    <Button onClick={createTestTask} className="mt-4" variant="outline">
                      테스트 작업 생성
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left font-medium">ID</th>
                        <th className="px-4 py-2 text-left font-medium">유형</th>
                        <th className="px-4 py-2 text-left font-medium">상태</th>
                        <th className="px-4 py-2 text-left font-medium">생성일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agent.tasks.map((task) => (
                        <tr key={task.id} className="border-b">
                          <td className="px-4 py-2 text-sm">{task.id.substring(0, 8)}...</td>
                          <td className="px-4 py-2 text-sm">{task.type}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                              {task.status === 'pending' ? '대기 중' :
                               task.status === 'processing' ? '처리 중' :
                               task.status === 'completed' ? '완료됨' : '실패'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">{new Date(task.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>메시지</CardTitle>
              <CardDescription>에이전트와 주고받은 메시지입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">메시지 기능은 개발 중입니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>로그</CardTitle>
              <CardDescription>에이전트 활동 로그입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">로그 기능은 개발 중입니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
} 