'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Grid } from '@/components/responsive/Grid';
import { PlusIcon } from 'lucide-react';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTasks } from '@/hooks/use-tasks';
import { useAgents } from '@/hooks/use-agents';
import { useToast } from '@/hooks/use-toast';

export default function TasksPage() {
  const { toast } = useToast();
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  
  // 에이전트 목록 가져오기
  const { 
    agents, 
    isLoading: agentsLoading, 
    error: agentsError 
  } = useAgents({ autoLoad: true });
  
  // 태스크 관련 훅 사용
  const { 
    tasks, 
    isLoading, 
    error, 
    createTask, 
    deleteTask, 
    processTask,
    isSubmitting
  } = useTasks({ autoLoad: true });

  // 새 태스크 생성 폼 토글
  const toggleNewTaskForm = () => {
    setShowNewTaskForm(!showNewTaskForm);
  };

  // 태스크 생성 제출 핸들러
  const handleCreateTask = async (formData: any) => {
    try {
      await createTask(formData);
      setShowNewTaskForm(false);
      toast({
        title: '태스크 생성 완료',
        description: '새 태스크가 성공적으로 생성되었습니다.',
      });
    } catch (error) {
      toast({
        title: '태스크 생성 실패',
        description: '태스크 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 태스크 삭제 핸들러
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast({
        title: '태스크 삭제 완료',
        description: '태스크가 성공적으로 삭제되었습니다.',
      });
    } catch (error) {
      toast({
        title: '태스크 삭제 실패',
        description: '태스크 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 태스크 처리 핸들러
  const handleProcessTask = async (taskId: string, agentId: string) => {
    try {
      await processTask(taskId);
      toast({
        title: '태스크 처리 요청 완료',
        description: '태스크 처리 요청이 성공적으로 전송되었습니다.',
      });
    } catch (error) {
      toast({
        title: '태스크 처리 요청 실패',
        description: '태스크 처리 요청 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 필터링된 태스크 목록
  const filteredTasks = tasks.filter(task => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'pending') return task.status === 'pending';
    if (selectedTab === 'completed') return task.status === 'completed';
    if (selectedTab === 'failed') return task.status === 'failed';
    return true;
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">태스크 관리</h1>
        <Button onClick={toggleNewTaskForm} className="flex items-center">
          <PlusIcon className="mr-2 h-4 w-4" />
          {showNewTaskForm ? '취소' : '새 태스크'}
        </Button>
      </div>

      {/* 새 태스크 생성 폼 */}
      {showNewTaskForm && (
        <Card className="w-full mb-6">
          <CardHeader>
            <CardTitle>새 태스크 생성</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm 
              agents={agents} 
              onSubmit={handleCreateTask} 
              isSubmitting={isSubmitting}
            />
          </CardContent>
        </Card>
      )}

      {/* 태스크 목록 탭 */}
      <Tabs defaultValue="all" onValueChange={(value) => setSelectedTab(value as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">모든 태스크</TabsTrigger>
          <TabsTrigger value="pending">대기 중</TabsTrigger>
          <TabsTrigger value="completed">완료됨</TabsTrigger>
          <TabsTrigger value="failed">실패</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-0">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <p>태스크 목록을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center p-12">
              <p className="text-red-500">태스크를 불러오는데 실패했습니다: {error}</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex justify-center items-center p-12">
              <p>태스크가 없습니다.</p>
            </div>
          ) : (
            <Grid 
              cols={{
                xs: 1,
                sm: 1, 
                md: 2, 
                lg: 3
              }}
              gap={4}
            >
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onProcess={(taskId) => handleProcessTask(taskId, task.agentId)}
                  onDelete={handleDeleteTask}
                />
              ))}
            </Grid>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 