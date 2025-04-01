import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Task {
  id: string;
  agentId: string;
  type: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskCardProps {
  task: Task;
  onProcess?: (taskId: string) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

export function TaskCard({ task, onProcess, onDelete }: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // 태스크 처리 핸들러
  const handleProcess = async () => {
    if (!onProcess) return;
    
    try {
      setIsProcessing(true);
      await onProcess(task.id);
    } catch (error) {
      console.error('태스크 처리 오류:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 태스크 삭제 핸들러
  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete(task.id);
    } catch (error) {
      console.error('태스크 삭제 오류:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // 상태에 따른 배지 가져오기
  const getStatusBadge = () => {
    switch (task.status) {
      case 'pending':
        return <Badge variant="outline">대기 중</Badge>;
      case 'processing':
        return <Badge variant="secondary">처리 중</Badge>;
      case 'completed':
        return <Badge variant="default">완료됨</Badge>;
      case 'failed':
        return <Badge variant="destructive">실패</Badge>;
      default:
        return <Badge variant="outline">알 수 없음</Badge>;
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      return dateString;
    }
  };

  // 데이터 문자열 포맷팅
  const formatData = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg mb-1 line-clamp-1">
              {task.type}
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>우선순위: {task.priority}</span>
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="text-sm text-muted-foreground mb-3">
          <div>생성: {formatDate(task.createdAt)}</div>
          <div>수정: {formatDate(task.updatedAt)}</div>
        </div>

        {/* 상세 정보 (접고 펼치기) */}
        {showDetails && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {task.data && (
              <div>
                <h4 className="text-sm font-medium mb-1">데이터:</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[150px]">
                  {formatData(task.data)}
                </pre>
              </div>
            )}
            
            {task.result && (
              <div>
                <h4 className="text-sm font-medium mb-1">결과:</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[150px]">
                  {formatData(task.result)}
                </pre>
              </div>
            )}
            
            {task.error && (
              <div>
                <h4 className="text-sm font-medium mb-1 text-destructive">오류:</h4>
                <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded overflow-auto max-h-[150px]">
                  {task.error}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs"
        >
          {showDetails ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              접기
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              자세히
            </>
          )}
        </Button>

        <div className="flex space-x-2">
          {task.status === 'pending' && onProcess && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleProcess}
              disabled={isProcessing}
              className="text-xs"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  처리 중
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-1" />
                  처리
                </>
              )}
            </Button>
          )}

          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  className="text-xs"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      삭제 중
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>태스크 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 태스크를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 