import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AgentRegistry } from '@/services/ai';

const prisma = new PrismaClient();
const registry = AgentRegistry.getInstance();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 데이터베이스에서 에이전트 조회
    const agent = await (prisma as any).agent.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: '에이전트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 메타데이터 파싱
    const metadata = JSON.parse(agent.metadata);

    // 응답 데이터 구성
    const response = {
      ...agent,
      metadata,
      // 각 작업의 데이터와 결과 파싱
      tasks: agent.tasks.map((task: any) => ({
        ...task,
        data: task.data ? JSON.parse(task.data) : null,
        result: task.result ? JSON.parse(task.result) : null
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('에이전트 조회 오류:', error);
    return NextResponse.json(
      { error: '에이전트 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    // 유효성 검사
    if (!status) {
      return NextResponse.json(
        { error: '상태는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 유효한 상태 확인
    const validStatuses = ['initialized', 'running', 'paused', 'error', 'shutdown'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태입니다.' },
        { status: 400 }
      );
    }

    // 에이전트 존재 확인
    const existingAgent = await (prisma as any).agent.findUnique({
      where: { id }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { error: '에이전트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 에이전트 상태 업데이트
    const updatedAgent = await (prisma as any).agent.update({
      where: { id },
      data: { status }
    });

    // 런타임 에이전트 상태 업데이트 (필요시)
    const runtimeAgent = registry.getAgent(id);
    if (runtimeAgent) {
      // 상태에 따른 처리
      if (status === 'running') {
        await runtimeAgent.initialize();
      } else if (status === 'shutdown') {
        await runtimeAgent.shutdown();
      }
    }

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error('에이전트 업데이트 오류:', error);
    return NextResponse.json(
      { error: '에이전트 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 에이전트 존재 확인
    const existingAgent = await (prisma as any).agent.findUnique({
      where: { id }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { error: '에이전트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 런타임 에이전트 중지 및 제거
    const runtimeAgent = registry.getAgent(id);
    if (runtimeAgent) {
      await runtimeAgent.shutdown();
      registry.removeAgent(id);
    }

    // 에이전트 및 관련 작업 삭제
    await (prisma as any).agentTask.deleteMany({
      where: { agentId: id }
    });

    await (prisma as any).agentMessage.deleteMany({
      where: { agentId: id }
    });

    const deletedAgent = await (prisma as any).agent.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: '에이전트가 성공적으로 삭제되었습니다.', agent: deletedAgent },
      { status: 200 }
    );
  } catch (error) {
    console.error('에이전트 삭제 오류:', error);
    return NextResponse.json(
      { error: '에이전트 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 