import { NextResponse } from 'next/server'
import { WorkflowStorage } from '@/lib/workflows/storage'

const storage = new WorkflowStorage()

// GET /api/workflows/[id]/status
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

    return NextResponse.json(workflow.status)
  } catch (error) {
    return NextResponse.json(
      { error: '워크플로우 상태를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/workflows/[id]/status
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, schedule } = body

    const updatedStatus = await storage.updateStatus(id, status, schedule)
    return NextResponse.json(updatedStatus)
  } catch (error) {
    return NextResponse.json(
      { error: '워크플로우 상태를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 