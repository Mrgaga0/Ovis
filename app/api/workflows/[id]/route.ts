import { NextResponse } from 'next/server'
import { validateWorkflow } from '@/lib/workflows/definitions'
import { WorkflowStorage } from '@/lib/workflows/storage'

const storage = new WorkflowStorage()

// GET /api/workflows/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const workflow = await storage.findById(id)

    if (!workflow) {
      return NextResponse.json(
        { error: '워크플로우를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(workflow)
  } catch (error) {
    return NextResponse.json(
      { error: '워크플로우를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/workflows/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const validation = validateWorkflow(body)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: '워크플로우 유효성 검사 실패', details: validation.errors },
        { status: 400 }
      )
    }

    const updatedWorkflow = await storage.update(id, body)
    return NextResponse.json(updatedWorkflow)
  } catch (error) {
    return NextResponse.json(
      { error: '워크플로우를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/workflows/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    await storage.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: '워크플로우를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 