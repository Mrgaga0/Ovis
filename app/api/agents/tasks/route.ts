import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AgentRegistry } from '@/services/ai';
import { TaskAgent } from '@/services/ai/TaskAgent';

const prisma = new PrismaClient();
const registry = AgentRegistry.getInstance();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, type, data } = body;

    // 데이터 유효성 검사
    if (!agentId || !type || !data) {
      return NextResponse.json(
        { error: 'agentId, type, data는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 에이전트 존재 확인
    const agent = await (prisma as any).agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json(
        { error: '에이전트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작업 생성
    const task = await (prisma as any).agentTask.create({
      data: {
        agentId,
        type,
        status: 'pending',
        data: JSON.stringify(data),
      }
    });

    // 런타임 에이전트에 작업 할당
    const runtimeAgent = registry.getAgent(agentId);
    if (runtimeAgent && runtimeAgent instanceof TaskAgent) {
      // 비동기로 작업 처리 시작
      process.nextTick(async () => {
        try {
          // TaskAgent의 메시지 처리 기능을 사용
          await runtimeAgent.handleMessage({
            type: 'PROCESS_TASK',
            content: {
              taskId: task.id,
            }
          });
          
          // 작업이 정상적으로 큐에 추가되었으므로 DB에 상태 업데이트는 필요 없음
        } catch (error) {
          console.error(`작업 처리 중 오류 발생: ${error}`);
          
          // 작업 상태 업데이트
          await (prisma as any).agentTask.update({
            where: { id: task.id },
            data: {
              status: 'failed',
              result: JSON.stringify({ error: `작업 처리 중 오류 발생: ${error}` })
            }
          });
        }
      });
    } else {
      // 런타임 에이전트가 없거나 TaskAgent가 아닌 경우 작업 상태 업데이트
      await (prisma as any).agentTask.update({
        where: { id: task.id },
        data: {
          status: 'error',
          result: JSON.stringify({ error: '유효한 TaskAgent가 초기화되지 않았습니다.' })
        }
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('작업 생성 오류:', error);
    return NextResponse.json(
      { error: '작업 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // 검색 조건 구성
    const where: any = {};
    
    if (agentId) {
      where.agentId = agentId;
    }
    
    if (status) {
      where.status = status;
    }
    
    // 작업 조회
    const tasks = await (prisma as any).agentTask.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
    
    // 데이터 파싱
    const formattedTasks = tasks.map((task: any) => ({
      ...task,
      data: task.data ? JSON.parse(task.data) : null,
      result: task.result ? JSON.parse(task.result) : null
    }));
    
    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error('작업 조회 오류:', error);
    return NextResponse.json(
      { error: '작업 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 