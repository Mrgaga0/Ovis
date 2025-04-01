import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { TaskAgent, AgentRegistry } from '@/services/ai';

// Prisma 클라이언트 인스턴스화
const prisma = new PrismaClient();
const registry = AgentRegistry.getInstance();

// 타입 정의
type AgentWithTasks = {
  id: string;
  name: string;
  type: string;
  status: string;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
  tasks: { id: string }[];
};

export async function GET(request: NextRequest) {
  try {
    // any 타입으로 캐스팅하여 Prisma 클라이언트 접근
    const agents = await (prisma as any).agent.findMany({
      include: {
        tasks: {
          where: {
            status: 'pending'
          },
          select: {
            id: true
          }
        }
      }
    }) as AgentWithTasks[];

    const formattedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      taskCount: agent.tasks.length,
      metadata: JSON.parse(agent.metadata),
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    }));

    return NextResponse.json(formattedAgents);
  } catch (error) {
    console.error('에이전트 조회 오류:', error);
    return NextResponse.json(
      { error: '에이전트 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, maxTasks } = body;

    // 유효성 검사
    if (!name || !type) {
      return NextResponse.json(
        { error: '이름과 유형은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 이름 중복 확인
    const existingAgent = await (prisma as any).agent.findUnique({
      where: {
        name
      }
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: `'${name}' 이름의 에이전트가 이미 존재합니다.` },
        { status: 409 }
      );
    }

    // 메타데이터 준비
    const metadata = type === 'task' 
      ? { maxTasks: maxTasks || 3 }
      : {};

    // 데이터베이스에 에이전트 생성
    const agent = await (prisma as any).agent.create({
      data: {
        name,
        type,
        status: 'initialized',
        metadata: JSON.stringify(metadata)
      }
    });

    // 에이전트 인스턴스 생성 및 등록 (실제 런타임에서 사용)
    if (type === 'task') {
      const taskAgent = new TaskAgent({
        id: agent.id,
        name: agent.name,
        maxConcurrentTasks: maxTasks || 3
      });
      
      await taskAgent.initialize();
      registry.registerAgent(taskAgent);
    }

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('에이전트 생성 오류:', error);
    return NextResponse.json(
      { error: '에이전트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 