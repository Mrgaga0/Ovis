import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { useWorkflowStore } from '@/lib/workflow/store';
import { Workflow } from '@/lib/workflow/executor';

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await request.json();
    const { name, description, steps = [] } = body;
    
    // 필수 필드 유효성 검사
    if (!name) {
      return NextResponse.json(
        { error: '워크플로우 이름은 필수 항목입니다.' },
        { status: 400 }
      );
    }
    
    // 현재 날짜/시간
    const now = new Date().toISOString();
    
    // 워크플로우 ID 생성
    const workflowId = `wf-${uuidv4()}`;
    
    // 새 워크플로우 객체 생성
    const newWorkflow: Workflow = {
      id: workflowId,
      name,
      description: description || '',
      steps: steps.map((step: any) => ({
        ...step,
        id: step.id || `step-${uuidv4()}`
      })),
      createdAt: now,
      updatedAt: now,
      status: 'idle'
    };
    
    // 워크플로우 스토어에 저장
    const workflowStore = useWorkflowStore.getState();
    workflowStore.addWorkflow(newWorkflow);
    
    return NextResponse.json({ 
      success: true, 
      workflow: newWorkflow,
      message: '워크플로우가 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('워크플로우 생성 오류:', error);
    return NextResponse.json(
      { error: '워크플로우 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 워크플로우 템플릿 목록 조회 API (GET)
export async function GET(request: NextRequest) {
  try {
    const workflowStore = useWorkflowStore.getState();
    const workflows = workflowStore.workflows;
    
    // 템플릿만 필터링 (ID가 'template-'로 시작하는 워크플로우)
    const templates = Object.values(workflows).filter(
      workflow => workflow.id.startsWith('template-')
    );
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('템플릿 목록 조회 중 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 