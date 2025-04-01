'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid } from '@/components/responsive/Grid';
import { useToast } from '@/hooks/use-toast';
import { Plus, Play, Pause, Edit, Trash2, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { WorkflowDesigner, IWorkflow } from '@/components/workflow/workflow-designer';

export default function WorkflowsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<IWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState<boolean>(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<IWorkflow | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 실제 API 호출로 대체할 수 있음
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 샘플 데이터
      const mockWorkflows: IWorkflow[] = [
        {
          id: 'workflow-1',
          name: '이메일 알림 워크플로우',
          description: '새 작업이 생성되면 이메일 알림을 보냅니다.',
          status: 'active',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              label: '작업 생성',
              position: { x: 100, y: 100 },
              data: { type: 'task_created' }
            },
            {
              id: 'condition-1',
              type: 'condition',
              label: '우선순위 확인',
              position: { x: 300, y: 100 },
              data: { condition: 'priority > 5' }
            },
            {
              id: 'notification-1',
              type: 'notification',
              label: '이메일 알림',
              position: { x: 500, y: 50 },
              data: { channel: 'email' }
            },
            {
              id: 'action-1',
              type: 'action',
              label: '작업 할당',
              position: { x: 500, y: 150 },
              data: { action: 'assign_task' }
            }
          ],
          connections: [
            {
              id: 'conn-1',
              source: 'trigger-1',
              target: 'condition-1'
            },
            {
              id: 'conn-2',
              source: 'condition-1',
              target: 'notification-1'
            },
            {
              id: 'conn-3',
              source: 'condition-1',
              target: 'action-1'
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'workflow-2',
          name: '기한 체크 워크플로우',
          description: '작업 기한이 지나면 알림을 보냅니다.',
          status: 'paused',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              label: '스케줄',
              position: { x: 100, y: 100 },
              data: { type: 'schedule' }
            },
            {
              id: 'action-1',
              type: 'action',
              label: '기한 검사',
              position: { x: 300, y: 100 },
              data: { action: 'check_deadlines' }
            },
            {
              id: 'notification-1',
              type: 'notification',
              label: '슬랙 알림',
              position: { x: 500, y: 100 },
              data: { channel: 'slack' }
            }
          ],
          connections: [
            {
              id: 'conn-1',
              source: 'trigger-1',
              target: 'action-1'
            },
            {
              id: 'conn-2',
              source: 'action-1',
              target: 'notification-1'
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      setWorkflows(mockWorkflows);
    } catch (err) {
      console.error('워크플로우 로딩 오류:', err);
      setError('워크플로우를 불러오는 중 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: '워크플로우를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = () => {
    setShowCreateWorkflow(true);
  };

  const handleSaveWorkflow = async (workflow: IWorkflow) => {
    try {
      // 실제 API 호출로 대체할 수 있음
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (selectedWorkflow) {
        // 기존 워크플로우 업데이트
        setWorkflows(prev => 
          prev.map(wf => wf.id === workflow.id ? workflow : wf)
        );
        
        toast({
          title: '워크플로우 업데이트',
          description: '워크플로우가 성공적으로 업데이트되었습니다.'
        });
      } else {
        // 새 워크플로우 추가
        setWorkflows(prev => [...prev, workflow]);
        
        toast({
          title: '워크플로우 생성',
          description: '워크플로우가 성공적으로 생성되었습니다.'
        });
      }

      setShowCreateWorkflow(false);
      setSelectedWorkflow(null);
    } catch (error) {
      console.error('워크플로우 저장 오류:', error);
      toast({
        title: '저장 실패',
        description: '워크플로우를 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleEditWorkflow = (workflow: IWorkflow) => {
    setSelectedWorkflow(workflow);
    setShowCreateWorkflow(true);
  };

  const handleRunWorkflow = async (workflowId: string) => {
    try {
      // 실제 API 호출로 대체할 수 있음
      await new Promise(resolve => setTimeout(resolve, 1000));

      setWorkflows(prev => 
        prev.map(wf => wf.id === workflowId ? { ...wf, status: 'active' } : wf)
      );
      
      toast({
        title: '워크플로우 실행',
        description: '워크플로우가 성공적으로 실행되었습니다.'
      });
    } catch (error) {
      console.error('워크플로우 실행 오류:', error);
      toast({
        title: '실행 실패',
        description: '워크플로우를 실행하는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handlePauseWorkflow = async (workflowId: string) => {
    try {
      // 실제 API 호출로 대체할 수 있음
      await new Promise(resolve => setTimeout(resolve, 1000));

      setWorkflows(prev => 
        prev.map(wf => wf.id === workflowId ? { ...wf, status: 'paused' } : wf)
      );
      
      toast({
        title: '워크플로우 일시 중지',
        description: '워크플로우가 일시 중지되었습니다.'
      });
    } catch (error) {
      console.error('워크플로우 일시 중지 오류:', error);
      toast({
        title: '일시 중지 실패',
        description: '워크플로우를 일시 중지하는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      // 실제 API 호출로 대체할 수 있음
      await new Promise(resolve => setTimeout(resolve, 1000));

      setWorkflows(prev => prev.filter(wf => wf.id !== workflowId));
      
      toast({
        title: '워크플로우 삭제',
        description: '워크플로우가 성공적으로 삭제되었습니다.'
      });
    } catch (error) {
      console.error('워크플로우 삭제 오류:', error);
      toast({
        title: '삭제 실패',
        description: '워크플로우를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleCloseDesigner = () => {
    setShowCreateWorkflow(false);
    setSelectedWorkflow(null);
  };

  // 상태 배지 렌더링
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">초안</Badge>;
      case 'active':
        return <Badge variant="default">활성</Badge>;
      case 'paused':
        return <Badge variant="secondary">일시 중지</Badge>;
      case 'archived':
        return <Badge variant="destructive">보관됨</Badge>;
      default:
        return <Badge variant="outline">알 수 없음</Badge>;
    }
  };

  if (showCreateWorkflow) {
    return (
      <div className="container mx-auto p-4 h-[calc(100vh-5rem)]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            {selectedWorkflow ? '워크플로우 수정' : '새 워크플로우'}
          </h1>
          <Button variant="outline" onClick={handleCloseDesigner}>
            목록으로 돌아가기
          </Button>
        </div>
        
        <div className="border rounded-lg h-[calc(100%-3rem)]">
          <WorkflowDesigner
            workflow={selectedWorkflow || undefined}
            onSave={handleSaveWorkflow}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">워크플로우</h1>
        <Button onClick={handleCreateWorkflow}>
          <Plus className="mr-2 h-4 w-4" />
          새 워크플로우
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          {error}
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">생성된 워크플로우가 없습니다.</p>
          <Button onClick={handleCreateWorkflow}>
            <Plus className="mr-2 h-4 w-4" />
            워크플로우 생성하기
          </Button>
        </div>
      ) : (
        <Grid cols={{ xs: 1, sm: 1, md: 2, lg: 3 }} gap={6}>
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="mr-2">{workflow.name}</span>
                  {renderStatusBadge(workflow.status)}
                </CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {workflow.description || '설명 없음'}
                </p>
              </CardHeader>
              
              <CardContent className="flex-1">
                <div className="text-sm">
                  <p>노드: {workflow.nodes.length}</p>
                  <p>연결: {workflow.connections.length}</p>
                  <p>생성: {new Date(workflow.createdAt).toLocaleDateString()}</p>
                  <p>수정: {new Date(workflow.updatedAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
              
              <CardFooter className="border-t pt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditWorkflow(workflow)}
                >
                  <Edit className="mr-1 h-4 w-4" />
                  편집
                </Button>
                
                {workflow.status === 'active' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePauseWorkflow(workflow.id)}
                  >
                    <Pause className="mr-1 h-4 w-4" />
                    일시정지
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleRunWorkflow(workflow.id)}
                  >
                    <Play className="mr-1 h-4 w-4" />
                    실행
                  </Button>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-1 h-4 w-4" />
                      삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>워크플로우 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        정말 이 워크플로우를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteWorkflow(workflow.id)}>
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}
    </div>
  );
}