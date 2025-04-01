'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RotateCw, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed';

interface StepResult {
  success: boolean;
  result: any;
  error?: string;
  startTime: number;
  endTime: number;
}

interface WorkflowExecutionStatus {
  workflowId: string;
  status: WorkflowStatus;
  progress: number;
  currentStep?: string;
  stepResults: Record<string, StepResult>;
  startTime: number;
  endTime?: number;
  error?: string;
}

interface WorkflowMonitorProps {
  workflowId: string;
  onRefresh?: () => void;
}

export default function WorkflowMonitor({ workflowId, onRefresh }: WorkflowMonitorProps) {
  const [status, setStatus] = useState<WorkflowExecutionStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  // WebSocket 연결 설정
  useEffect(() => {
    // WebSocket 연결
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/workflow/socket`;
      
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        console.log('WebSocket 연결 성공');
        setIsConnected(true);
        setError(null);

        // 구독 메시지 전송
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'subscribe' }));
        }
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'workflow_update' && data.data.workflowId === workflowId) {
            setStatus(data.data);
          } else if (data.type === 'error') {
            setError(data.message);
          }
        } catch (error) {
          console.error('메시지 처리 중 오류:', error);
        }
      };
      
      ws.current.onerror = (event) => {
        console.error('WebSocket 오류:', event);
        setError('WebSocket 연결 오류가 발생했습니다.');
        setIsConnected(false);
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket 연결이 종료되었습니다.');
        setIsConnected(false);
        
        // 3초 후 재연결 시도
        setTimeout(connectWebSocket, 3000);
      };
    };
    
    connectWebSocket();
    
    // 초기 워크플로우 상태 조회
    fetchWorkflowStatus();
    
    // 정리 함수
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [workflowId]);

  // 워크플로우 상태 조회
  const fetchWorkflowStatus = async () => {
    try {
      const response = await fetch(`/api/workflow/${workflowId}/run`);
      if (!response.ok) {
        throw new Error('워크플로우 상태 조회 실패');
      }
      
      const data = await response.json();
      // API 응답 형식에 맞게 상태 업데이트
      if (data.status) {
        // 실행 중인 워크플로우의 경우 WebSocket으로 업데이트 수신
        if (data.status !== 'idle') {
          // 실행 중인 워크플로우의 초기 상태 설정
          setStatus(prev => ({
            ...prev,
            workflowId,
            status: data.status,
            lastRun: data.lastRun
          } as WorkflowExecutionStatus));
        }
      }
    } catch (error) {
      console.error('워크플로우 상태 조회 오류:', error);
      setError('워크플로우 상태를 조회하는 중 오류가 발생했습니다.');
    }
  };

  // 워크플로우 실행 시작
  const startWorkflow = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/workflow/${workflowId}/run`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '워크플로우 실행 실패');
      }
      
      const data = await response.json();
      console.log('워크플로우 실행 시작:', data);
      
      // 상태 업데이트는 WebSocket을 통해 받을 예정
    } catch (error) {
      console.error('워크플로우 실행 오류:', error);
      setError(error instanceof Error ? error.message : '워크플로우 실행 중 오류가 발생했습니다.');
    }
  };

  // 새로고침
  const handleRefresh = () => {
    fetchWorkflowStatus();
    if (onRefresh) {
      onRefresh();
    }
  };

  // 상태에 따른 배지 색상 및 아이콘
  const getStatusBadge = () => {
    if (!status) return null;
    
    switch (status.status) {
      case 'idle':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> 대기 중</Badge>;
      case 'running':
        return <Badge variant="secondary" className="flex items-center gap-1"><RotateCw className="h-3 w-3 animate-spin" /> 실행 중</Badge>;
      case 'completed':
        return <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> 완료됨</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> 실패</Badge>;
      default:
        return <Badge variant="outline">알 수 없음</Badge>;
    }
  };

  // 단계 진행 상태 렌더링
  const renderSteps = () => {
    if (!status || !status.stepResults) return null;
    
    return (
      <div className="space-y-2 mt-4">
        <h4 className="text-sm font-medium">실행 단계</h4>
        <div className="space-y-2">
          {Object.entries(status.stepResults).map(([stepId, result]) => (
            <div key={stepId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {result.success ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <XCircle className="h-4 w-4 text-red-500" />
                }
                <span>{stepId}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(result.endTime).toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {status.currentStep && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <RotateCw className="h-4 w-4 animate-spin text-blue-500" />
                <span>{status.currentStep}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                진행 중...
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">워크플로우 모니터</CardTitle>
            <CardDescription>ID: {workflowId}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {isConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">연결됨</Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">연결 끊김</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          {/* 진행률 표시 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">진행률</span>
              <span className="text-sm">{status?.progress || 0}%</span>
            </div>
            <Progress value={status?.progress || 0} className="h-2" />
          </div>
          
          {/* 실행 정보 */}
          {status && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">시작 시간</p>
                <p>{new Date(status.startTime).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">종료 시간</p>
                <p>{status.endTime ? new Date(status.endTime).toLocaleString() : '-'}</p>
              </div>
            </div>
          )}
          
          {/* 단계 목록 */}
          {renderSteps()}
          
          {/* 오류 메시지 */}
          {status?.error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              <p className="font-medium">오류 발생</p>
              <p>{status.error}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          새로고침
        </Button>
        
        <Button 
          size="sm" 
          onClick={startWorkflow}
          disabled={status?.status === 'running'}
          className="flex items-center gap-1"
        >
          <RotateCw className="h-4 w-4" />
          워크플로우 실행
        </Button>
      </CardFooter>
    </Card>
  );
} 