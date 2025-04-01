import { NextRequest, NextResponse } from 'next/server';
import { useWorkflowStore } from '@/lib/workflow/store';
import { Workflow } from '@/lib/workflow/executor';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const workflowStore = useWorkflowStore.getState();
    
    // 워크플로우 존재 확인
    const existingWorkflow = workflowStore.workflows[workflowId];
    
    if (!existingWorkflow) {
      return NextResponse.json(
        { error: '해당 ID의 워크플로우를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 실행 중인 워크플로우는 수정 불가
    if (existingWorkflow.status === 'running') {
      return NextResponse.json(
        { error: '실행 중인 워크플로우는 수정할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    // 요청 본문 파싱
    const body = await request.json();
    const { name, description, steps } = body;
    
    // 업데이트할 필드 유효성 검사
    if (name === undefined || name === '') {
      return NextResponse.json(
        { error: '워크플로우 이름은 필수 항목입니다.' },
        { status: 400 }
      );
    }
    
    // 워크플로우 업데이트
    const updates: Partial<Workflow> = {
      name,
      description,
      updatedAt: new Date().toISOString()
    };
    
    // 단계가 제공된 경우 업데이트
    if (steps !== undefined) {
      updates.steps = steps;
    }
    
    // 워크플로우 스토어에 업데이트
    workflowStore.updateWorkflow(workflowId, updates);
    
    // 업데이트된 워크플로우 반환
    const updatedWorkflow = workflowStore.workflows[workflowId];
    
    return NextResponse.json({ 
      success: true,
      workflow: updatedWorkflow,
      message: '워크플로우가 성공적으로 업데이트되었습니다.' 
    });
  } catch (error) {
    console.error('워크플로우 수정 오류:', error);
    return NextResponse.json(
      { error: '워크플로우 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 