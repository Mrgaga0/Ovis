'use client';

import React, { useState, useEffect } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Grid } from '@/components/responsive/Grid';
import { Task, useTasks } from '@/hooks/use-tasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Plus, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TaskForm } from '@/components/tasks/TaskForm';

export default function TasksPage() {
  const { tasks, isLoading, error, fetchTasks, processTask, deleteTask } = useTasks({ autoLoad: true });
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 태스크 필터링
  useEffect(() => {
    let result = [...tasks];
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.type.toLowerCase().includes(query) || 
        (task.data && JSON.stringify(task.data).toLowerCase().includes(query))
      );
    }
    
    // 상태 필터링
    if (statusFilter.length > 0) {
      result = result.filter(task => statusFilter.includes(task.status));
    }
    
    setFilteredTasks(result);
  }, [tasks, searchQuery, statusFilter]);

  // 태스크 처리 핸들러
  const handleProcessTask = async (taskId: string) => {
    await processTask(taskId);
  };

  // 태스크 삭제 핸들러
  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  // 태스크 생성 완료 핸들러
  const handleTaskCreated = () => {
    setIsDialogOpen(false);
    fetchTasks();
  };

  // 상태별 태스크 수 계산
  const getPendingTasks = () => filteredTasks.filter(t => t.status === 'pending').length;
  const getProcessingTasks = () => filteredTasks.filter(t => t.status === 'processing').length;
  const getCompletedTasks = () => filteredTasks.filter(t => t.status === 'completed').length;
  const getFailedTasks = () => filteredTasks.filter(t => t.status === 'failed').length;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">태스크 관리</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 태스크
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>새 태스크 생성</DialogTitle>
              <DialogDescription>
                에이전트에게 요청할 태스크의 세부 정보를 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <TaskForm onSuccess={handleTaskCreated} />
          </DialogContent>
        </Dialog>
      </div>

      {/* 상태 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-medium">대기 중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{isLoading ? '...' : getPendingTasks()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-medium">처리 중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{isLoading ? '...' : getProcessingTasks()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-medium">완료됨</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{isLoading ? '...' : getCompletedTasks()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-medium">실패</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{isLoading ? '...' : getFailedTasks()}</p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="태스크 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                상태 필터
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('pending')}
                onCheckedChange={(checked) => {
                  setStatusFilter(prev => 
                    checked 
                      ? [...prev, 'pending'] 
                      : prev.filter(status => status !== 'pending')
                  );
                }}
              >
                대기 중
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('processing')}
                onCheckedChange={(checked) => {
                  setStatusFilter(prev => 
                    checked 
                      ? [...prev, 'processing'] 
                      : prev.filter(status => status !== 'processing')
                  );
                }}
              >
                처리 중
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('completed')}
                onCheckedChange={(checked) => {
                  setStatusFilter(prev => 
                    checked 
                      ? [...prev, 'completed'] 
                      : prev.filter(status => status !== 'completed')
                  );
                }}
              >
                완료됨
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('failed')}
                onCheckedChange={(checked) => {
                  setStatusFilter(prev => 
                    checked 
                      ? [...prev, 'failed'] 
                      : prev.filter(status => status !== 'failed')
                  );
                }}
              >
                실패
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 태스크 목록 */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="pending">대기 중</TabsTrigger>
          <TabsTrigger value="processing">처리 중</TabsTrigger>
          <TabsTrigger value="completed">완료됨</TabsTrigger>
          <TabsTrigger value="failed">실패</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {renderTaskList(filteredTasks)}
        </TabsContent>
        
        <TabsContent value="pending">
          {renderTaskList(filteredTasks.filter(task => task.status === 'pending'))}
        </TabsContent>
        
        <TabsContent value="processing">
          {renderTaskList(filteredTasks.filter(task => task.status === 'processing'))}
        </TabsContent>
        
        <TabsContent value="completed">
          {renderTaskList(filteredTasks.filter(task => task.status === 'completed'))}
        </TabsContent>
        
        <TabsContent value="failed">
          {renderTaskList(filteredTasks.filter(task => task.status === 'failed'))}
        </TabsContent>
      </Tabs>
    </div>
  );

  // 태스크 목록 렌더링 함수
  function renderTaskList(taskList: Task[]) {
    if (isLoading) {
      return (
        <Grid cols={{ xs: 1, sm: 1, md: 2, lg: 3 }} gap={6}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-[200px]">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </Grid>
      );
    }

    if (error) {
      return (
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          {error}
        </div>
      );
    }

    if (taskList.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">표시할 태스크가 없습니다.</p>
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            태스크 생성하기
          </Button>
        </div>
      );
    }

    return (
      <Grid cols={{ xs: 1, sm: 1, md: 2, lg: 3 }} gap={6}>
        {taskList.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onProcess={handleProcessTask}
            onDelete={handleDeleteTask}
          />
        ))}
      </Grid>
    );
  }
} 