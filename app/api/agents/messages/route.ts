import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistry } from '@/lib/agents/AgentRegistry';
import { AgentStatus } from '@/lib/agents/BaseAgent';
import { prisma } from '@/lib/prisma';

/**
 * 메시지 저장
 * @param message 저장할 메시지 객체
 */
async function saveMessage(message: any) {
  try {
    // Prisma를 사용하여 메시지 저장
    const savedMessage = await prisma.agentMessage.create({
      data: {
        id: message.id,
        agentId: message.agentId,
        taskId: message.taskId || null,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp,
        metadata: message.metadata || {}
      }
    });
    
    return savedMessage;
  } catch (error) {
    console.error('메시지 저장 중 오류 발생:', error);
    throw error;
  }
}

/**
 * GET 요청 처리 - 메시지 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 쿼리 매개변수 파싱
    const agentId = searchParams.get('agentId');
    const taskId = searchParams.get('taskId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 50;
    
    // 쿼리 조건 구성
    const where: any = {};
    
    if (agentId) {
      where.agentId = agentId;
    }
    
    if (taskId) {
      where.taskId = taskId;
    }
    
    // Prisma를 사용하여 메시지 조회
    const messages = await prisma.agentMessage.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('메시지 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '메시지 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST 요청 처리 - 메시지 전송
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 필수 필드 검증
    if (!body.agentId || !body.content) {
      return NextResponse.json(
        { error: '에이전트 ID와 메시지 내용은 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 에이전트 레지스트리 가져오기
    const registry = AgentRegistry.getInstance();
    
    // 에이전트 존재 확인
    const agent = registry.getAgent(body.agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: `ID가 ${body.agentId}인 에이전트를 찾을 수 없습니다.` },
        { status: 404 }
      );
    }
    
    // 에이전트 활성 상태 확인
    if (agent.getStatus() !== AgentStatus.IDLE && agent.getStatus() !== AgentStatus.RUNNING) {
      return NextResponse.json(
        { 
          error: `에이전트가 메시지를 처리할 수 없는 상태입니다: ${agent.getStatus()}`,
          agentStatus: agent.getStatus()
        },
        { status: 400 }
      );
    }
    
    // 사용자 메시지 생성
    const userMessage = {
      id: uuidv4(),
      agentId: body.agentId,
      taskId: body.taskId || null,
      content: body.content,
      role: body.role || 'user',
      timestamp: new Date(),
      metadata: body.metadata || {}
    };
    
    // 사용자 메시지 저장
    await saveMessage(userMessage);
    
    // 에이전트 메시지 처리 요청
    const result = await agent.run({
      type: 'message',
      message: userMessage.content,
      metadata: {
        messageId: userMessage.id,
        taskId: userMessage.taskId
      }
    });
    
    // 에이전트 응답 메시지 생성
    const agentResponseMessage = {
      id: uuidv4(),
      agentId: body.agentId,
      taskId: body.taskId || null,
      content: result.data?.message || JSON.stringify(result.data) || '응답 없음',
      role: 'agent',
      timestamp: new Date(),
      metadata: {
        ...body.metadata,
        responseData: result.data,
        executionTime: result.executionTime
      }
    };
    
    // 에이전트 응답 메시지 저장
    await saveMessage(agentResponseMessage);
    
    return NextResponse.json(agentResponseMessage);
  } catch (error) {
    console.error('메시지 처리 중 오류 발생:', error);
    
    // 오류 응답
    return NextResponse.json(
      { error: '메시지 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE 요청 처리 - 메시지 삭제
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('id');
    
    if (!messageId) {
      return NextResponse.json(
        { error: '메시지 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // Prisma를 사용하여 메시지 삭제
    await prisma.agentMessage.delete({
      where: {
        id: messageId
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('메시지 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '메시지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 