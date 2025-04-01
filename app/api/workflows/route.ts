import { NextResponse } from 'next/server'
import { createWorkflow, validateWorkflow } from '@/lib/workflows/definitions'
import { WorkflowStorage } from '@/lib/workflows/storage'

const storage = new WorkflowStorage()

// GET /api/workflows
export async function GET() {
  try {
    const workflows = await storage.findAll()
    return NextResponse.json(workflows)
  } catch (error) {
    return NextResponse.json(
      { error: '워크플로우 목록을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/workflows
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, createdBy } = body

    if (!name || !createdBy) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    const workflow = createWorkflow(name, description, createdBy)
    const validation = validateWorkflow(workflow)

    if (!validation.isValid) {
      return NextResponse.json(
        { error: '워크플로우 유효성 검사 실패', details: validation.errors },
        { status: 400 }
      )
    }

    const savedWorkflow = await storage.create(workflow)
    return NextResponse.json(savedWorkflow, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: '워크플로우를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 