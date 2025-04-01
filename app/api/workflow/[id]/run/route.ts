import { NextRequest, NextResponse } from 'next/server';
import { useWorkflowStore } from '@/lib/workflow/store';
import { WorkflowAgentIntegration } from '@/lib/workflow/integration';
import { WorkflowExecutor, Workflow } from '@/lib/workflow/executor';

// 워크플로우 실행 API (POST)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const workflowStore = useWorkflowStore.getState();
    const workflow = workflowStore.workflows[workflowId];
    
    if (!workflow) {
      return NextResponse.json(
        { error: '워크플로우를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 워크플로우가 이미 실행 중인지 확인
    const executionStatus = workflowStore.executionStatus[workflowId];
    if (executionStatus && executionStatus.status === 'running') {
      return NextResponse.json(
        { error: '워크플로우가 이미 실행 중입니다.' },
        { status: 400 }
      );
    }
    
    // 워크플로우 상태 초기화
    workflowStore.initExecution(workflowId);
    
    // 워크플로우 실행기 생성
    const executor = new WorkflowExecutor();
    
    // 백그라운드에서 워크플로우 실행
    setTimeout(async () => {
      try {
        // 워크플로우 실행
        await executor.execute(workflow);
        
        // 실행 완료 후 워크플로우 업데이트
        const updatedWorkflow = {
          ...workflow,
          updatedAt: new Date().toISOString(),
          lastRun: new Date().toISOString()
        };
        
        workflowStore.updateWorkflow(workflowId, updatedWorkflow);
      } catch (error) {
        console.error('워크플로우 실행 오류:', error);
        workflowStore.updateExecutionStatus(workflowId, { 
          status: 'failed',
          progress: 0,
          currentStep: ''
        });
        
        // 오류를 로그에 추가
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        workflowStore.addExecutionLog(
          workflowId, 
          `워크플로우 실행 중 오류 발생: ${errorMessage}`, 
          'error'
        );
        
        // 실행 완료 처리
        workflowStore.finishExecution(workflowId, 'failed', errorMessage);
      }
    }, 0);
    
    // 클라이언트에게 즉시 응답
    return NextResponse.json({ 
      message: '워크플로우가 시작되었습니다.', 
      workflowId 
    });
  } catch (error) {
    console.error('워크플로우 실행 요청 중 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 워크플로우 상태 조회 API (GET)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const workflowStore = useWorkflowStore.getState();
    const workflow = workflowStore.workflows[workflowId];
    
    if (!workflow) {
      return NextResponse.json(
        { error: '워크플로우를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 워크플로우 스토어에서 실행 상태 조회
    const executionStatus = workflowStore.executionStatus[workflowId] || {
      status: 'idle',
      progress: 0,
      currentStep: '',
      logs: []
    };
    
    // 실행 로그 조회
    const executionHistory = workflowStore.executionHistory[workflowId] || [];
    
    // 상태 정보 반환
    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      status: executionStatus.status,
      progress: executionStatus.progress,
      currentStep: executionStatus.currentStep,
      lastRun: workflow.lastRun,
      logs: executionStatus.logs,
      executionHistory
    });
  } catch (error) {
    console.error('워크플로우 상태 조회 중 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 