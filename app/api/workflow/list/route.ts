import { NextRequest, NextResponse } from 'next/server';
import { useWorkflowStore } from '@/lib/workflow/store';

// 워크플로우 목록 조회 API (GET)
export async function GET(request: NextRequest) {
  try {
    const workflowStore = useWorkflowStore.getState();
    const workflows = workflowStore.workflows;
    
    // 객체를 배열로 변환하고 추가 정보 계산
    const workflowList = Object.values(workflows).map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      stepsCount: workflow.steps.length,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      lastRun: workflow.lastRun
    }));
    
    // 생성일 기준 최신순 정렬
    workflowList.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json({ 
      workflows: workflowList,
      count: workflowList.length
    });
  } catch (error) {
    console.error('워크플로우 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '워크플로우 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 