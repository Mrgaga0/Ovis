import { NextResponse } from 'next/server'
import { WorkflowEngine } from '@/lib/workflows/engine'
import { WorkflowStorage } from '@/lib/workflows/storage'

const storage = new WorkflowStorage()

// POST /api/workflows/[id]/execute
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { variables } = body

    const workflow = await storage.findById(id)
    if (!workflow) {
      return NextResponse.json(
        { error: '워크플로우를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 실행 기록 생성
    const execution = await storage.createExecution(id, variables)

    // 워크플로우 실행
    const engine = new WorkflowEngine(workflow)
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        engine.setVariable(key, value)
      })
    }

    const result = await engine.execute()

    // 실행 결과 저장
    await storage.updateExecution(
      execution.id,
      result.context.stepResults,
      result.error?.message
    )

    // 워크플로우 상태 업데이트
    await storage.updateStatus(
      id,
      result.success ? 'completed' : 'failed',
      null
    )

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: '워크플로우 실행 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 