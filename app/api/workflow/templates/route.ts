import { NextRequest, NextResponse } from 'next/server';
import { useWorkflowStore } from '@/lib/workflow/store';

// 템플릿 목록 조회 API (GET)
export async function GET(request: NextRequest) {
  try {
    const workflowStore = useWorkflowStore.getState();
    const workflows = workflowStore.workflows;
    
    // 템플릿만 필터링 (ID가 'template-'로 시작하는 워크플로우)
    const templates = Object.values(workflows)
      .filter(workflow => workflow.id.startsWith('template-'))
      .map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        stepsCount: template.steps.length,
        createdAt: template.createdAt
      }));
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('템플릿 목록 조회 중 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 워크플로우를 템플릿으로 저장 API (POST)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 필수 필드 검증
    if (!data.workflowId) {
      return NextResponse.json({ error: '워크플로우 ID는 필수입니다.' }, { status: 400 });
    }
    
    if (!data.templateName) {
      return NextResponse.json({ error: '템플릿 이름은 필수입니다.' }, { status: 400 });
    }
    
    const workflowStore = useWorkflowStore.getState();
    
    // 워크플로우 존재 확인
    if (!workflowStore.workflows[data.workflowId]) {
      return NextResponse.json({ error: '워크플로우를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 템플릿으로 저장
    const templateId = workflowStore.saveAsTemplate(data.workflowId, data.templateName);
    
    // 오류 처리 방식 수정
    if (templateId === undefined) {
      return NextResponse.json({ error: '템플릿 저장 실패' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: '템플릿이 생성되었습니다.',
      templateId 
    });
  } catch (error) {
    console.error('템플릿 생성 중 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 템플릿으로부터 워크플로우 생성 API (PUT)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 필수 필드 검증
    if (!data.templateId) {
      return NextResponse.json({ error: '템플릿 ID는 필수입니다.' }, { status: 400 });
    }
    
    const workflowStore = useWorkflowStore.getState();
    
    try {
      // 템플릿으로부터 워크플로우 생성
      const workflow = workflowStore.loadFromTemplate(data.templateId);
      
      return NextResponse.json({ 
        message: '워크플로우가 생성되었습니다.',
        workflow 
      });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 404 });
    }
  } catch (error) {
    console.error('템플릿으로부터 워크플로우 생성 중 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 