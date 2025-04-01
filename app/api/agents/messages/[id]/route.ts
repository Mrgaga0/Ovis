import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 메시지 조회
    const message = await (prisma as any).agentMessage.findUnique({
      where: { id }
    });

    if (!message) {
      return NextResponse.json(
        { error: '메시지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 데이터 파싱
    return NextResponse.json({
      ...message,
      content: message.content ? JSON.parse(message.content) : null,
      response: message.response ? JSON.parse(message.response) : null
    });
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    return NextResponse.json(
      { error: '메시지 조회 중 오류가 발생했습니다.' },
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

    // 메시지 존재 확인
    const existingMessage = await (prisma as any).agentMessage.findUnique({
      where: { id }
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: '메시지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 메시지 삭제
    const deletedMessage = await (prisma as any).agentMessage.delete({
      where: { id }
    });

    return NextResponse.json({
      message: '메시지가 성공적으로 삭제되었습니다.',
      deletedMessage: {
        ...deletedMessage,
        content: deletedMessage.content ? JSON.parse(deletedMessage.content) : null,
        response: deletedMessage.response ? JSON.parse(deletedMessage.response) : null
      }
    });
  } catch (error) {
    console.error('메시지 삭제 오류:', error);
    return NextResponse.json(
      { error: '메시지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 