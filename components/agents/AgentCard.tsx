'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface AgentCardProps {
  id: string;
  name: string;
  type: string;
  status: 'initialized' | 'running' | 'paused' | 'error' | 'shutdown';
  taskCount?: number;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onRestart?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function AgentCard({
  id,
  name,
  type,
  status,
  taskCount = 0,
  onStart,
  onPause,
  onRestart,
  onDelete,
}: AgentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    onDelete?.(id);
    setIsDeleting(false);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'text-green-500';
      case 'paused':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      case 'shutdown':
        return 'text-gray-500';
      default:
        return 'text-blue-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return '실행 중';
      case 'paused':
        return '일시 정지됨';
      case 'error':
        return '오류 상태';
      case 'shutdown':
        return '중지됨';
      default:
        return '초기화됨';
    }
  };

  const getTypeText = () => {
    switch (type) {
      case 'task':
        return '작업 에이전트';
      case 'base':
        return '기본 에이전트';
      default:
        return '커스텀 에이전트';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-muted-foreground">{getTypeText()}</p>
          </div>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            ID: <span className="font-mono">{id.substring(0, 8)}...</span>
          </p>
          {type === 'task' && (
            <p className="text-sm text-muted-foreground">
              대기 작업: {taskCount}개
            </p>
          )}
        </div>
        <Link 
          href={`/agents/${id}`} 
          className="flex items-center justify-between text-sm font-medium text-primary hover:underline"
        >
          상세 정보 보기
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        <div className="flex space-x-2">
          {(status === 'initialized' || status === 'paused' || status === 'error') && onStart && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStart(id)}
              title="시작"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {status === 'running' && onPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPause(id)}
              title="일시정지"
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {onRestart && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRestart(id)}
              title="재시작"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>에이전트 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  정말로 이 에이전트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며,
                  모든 관련 데이터가 손실됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600"
                  disabled={isDeleting}
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
} 