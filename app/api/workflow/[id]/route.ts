import { NextRequest, NextResponse } from 'next/server';
import { useWorkflowStore } from '@/lib/workflow/store';
import { Workflow, WorkflowStep } from '@/lib/workflow/executor';

// 워크플로우 조회 API (GET)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    
    // 워크플로우 스토어에서 해당 ID의 워크플로우 조회
    const workflowStore = useWorkflowStore.getState();
    const workflow = workflowStore.workflows[workflowId];
    
    if (!workflow) {
      return NextResponse.json(
        { error: '해당 ID의 워크플로우를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('워크플로우 조회 오류:', error);
    return NextResponse.json(
      { error: '워크플로우 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 워크플로우 수정 API (PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const data = await request.json();
    
    const workflowStore = useWorkflowStore.getState();
    const workflow = workflowStore.workflows[workflowId];
    
    if (!workflow) {
      return NextResponse.json(
        { error: '워크플로우를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 실행 중인 워크플로우는 수정 불가
    if (workflow.status === 'running') {
      return NextResponse.json(
        { error: '실행 중인 워크플로우는 수정할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    // 업데이트할 필드
    const updates: Record<string, any> = {};
    
    // 기본 정보 업데이트
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    
    // 단계 업데이트 (전체 대체)
    if (data.steps !== undefined) {
      // 유효성 검사: 모든 단계가 WorkflowStep 형식을 따르는지 확인
      if (!Array.isArray(data.steps)) {
        return NextResponse.json(
          { error: 'steps는 배열이어야 합니다.' },
          { status: 400 }
        );
      }
      
      // 단계 ID 중복 확인
      const stepIds = new Set<string>();
      for (const step of data.steps) {
        if (!step.id || !step.type || !step.name) {
          return NextResponse.json(
            { error: '모든 단계는 id, type, name 필드가 필요합니다.' },
            { status: 400 }
          );
        }
        
        if (stepIds.has(step.id)) {
          return NextResponse.json(
            { error: `중복된 단계 ID: ${step.id}` },
            { status: 400 }
          );
        }
        
        stepIds.add(step.id);
      }
      
      // 의존성 유효성 검사
      for (const step of data.steps) {
        if (step.dependencies) {
          for (const depId of step.dependencies) {
            if (!stepIds.has(depId)) {
              return NextResponse.json(
                { error: `단계 '${step.id}'가 존재하지 않는 단계 '${depId}'에 의존합니다.` },
                { status: 400 }
              );
            }
          }
        }
      }
      
      updates.steps = data.steps as WorkflowStep[];
    }
    
    // 워크플로우 업데이트
    workflowStore.updateWorkflow(workflowId, updates);
    
    // 업데이트된 워크플로우 반환
    return NextResponse.json({
      message: '워크플로우가 업데이트되었습니다.',
      workflow: workflowStore.workflows[workflowId]
    });
  } catch (error) {
    console.error('워크플로우 업데이트 중 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 워크플로우 삭제 API (DELETE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const workflowStore = useWorkflowStore.getState();
    
    // 워크플로우 존재 확인
    const workflow = workflowStore.workflows[workflowId];
    
    if (!workflow) {
      return NextResponse.json(
        { error: '해당 ID의 워크플로우를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 워크플로우가 실행 중인지 확인
    if (workflow.status === 'running') {
      return NextResponse.json(
        { error: '실행 중인 워크플로우는 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    // 워크플로우 삭제
    workflowStore.deleteWorkflow(workflowId);
    
    return NextResponse.json({ 
      success: true,
      message: '워크플로우가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('워크플로우 삭제 오류:', error);
    return NextResponse.json(
      { error: '워크플로우 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 