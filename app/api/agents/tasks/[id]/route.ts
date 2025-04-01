import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 작업 조회
    const task = await (prisma as any).agentTask.findUnique({
      where: { id }
    });

    if (!task) {
      return NextResponse.json(
        { error: '작업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 데이터 파싱
    return NextResponse.json({
      ...task,
      data: task.data ? JSON.parse(task.data) : null,
      result: task.result ? JSON.parse(task.result) : null
    });
  } catch (error) {
    console.error('작업 조회 오류:', error);
    return NextResponse.json(
      { error: '작업 조회 중 오류가 발생했습니다.' },
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
    const { status, result } = body;

    // 작업 존재 확인
    const existingTask = await (prisma as any).agentTask.findUnique({
      where: { id }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: '작업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 업데이트할 데이터 준비
    const updateData: any = {};

    if (status) {
      // 유효한 상태 확인
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: '유효하지 않은 상태입니다.' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (result !== undefined) {
      updateData.result = JSON.stringify(result);
    }

    // 작업 업데이트
    const updatedTask = await (prisma as any).agentTask.update({
      where: { id },
      data: updateData
    });

    // 응답 데이터 파싱
    return NextResponse.json({
      ...updatedTask,
      data: updatedTask.data ? JSON.parse(updatedTask.data) : null,
      result: updatedTask.result ? JSON.parse(updatedTask.result) : null
    });
  } catch (error) {
    console.error('작업 업데이트 오류:', error);
    return NextResponse.json(
      { error: '작업 업데이트 중 오류가 발생했습니다.' },
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

    // 작업 존재 확인
    const existingTask = await (prisma as any).agentTask.findUnique({
      where: { id }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: '작업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작업 삭제
    const deletedTask = await (prisma as any).agentTask.delete({
      where: { id }
    });

    return NextResponse.json({
      message: '작업이 성공적으로 삭제되었습니다.',
      deletedTask: {
        ...deletedTask,
        data: deletedTask.data ? JSON.parse(deletedTask.data) : null,
        result: deletedTask.result ? JSON.parse(deletedTask.result) : null
      }
    });
  } catch (error) {
    console.error('작업 삭제 오류:', error);
    return NextResponse.json(
      { error: '작업 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 