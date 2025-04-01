import { NextResponse } from 'next/server'

// 워크플로우 단계 타입 정의
type StepType = 'content' | 'design' | 'analysis' | 'deployment' | 'notification'

// 워크플로우 단계 인터페이스
interface WorkflowStep {
  id: string
  type: StepType
  name: string
  config: Record<string, any>
  dependencies: string[]
}

// 워크플로우 인터페이스
interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  createdAt: number
  updatedAt: number
  lastRun?: number
  status?: 'idle' | 'running' | 'completed' | 'failed'
}

// 실행 결과 인터페이스
interface StepResult {
  stepId: string
  success: boolean
  output: any
  error?: string
  startTime: number
  endTime: number
}

// 워크플로우 실행 결과 인터페이스
interface WorkflowExecutionResult {
  workflowId: string
  startTime: number
  endTime: number
  status: 'completed' | 'failed'
  steps: StepResult[]
}

// 임시 데이터 저장소 (실제 구현에서는 데이터베이스를 사용해야 함)
// 참고: 실제 구현에서는 같은 인스턴스를 워크플로우 API와 공유하도록 해야 함
let workflows: Workflow[] = [
  {
    id: 'wf-1',
    name: '블로그 콘텐츠 자동화 워크플로우',
    description: '주제를 기반으로 블로그 콘텐츠를 생성하고 최적화합니다.',
    steps: [
      {
        id: 'step-1',
        type: 'content',
        name: '주제 생성',
        config: {
          inputType: 'keyword',
          outputCount: 5
        },
        dependencies: []
      },
      {
        id: 'step-2',
        type: 'content',
        name: '콘텐츠 생성',
        config: {
          type: 'blog',
          length: 'medium',
          tone: 'informative'
        },
        dependencies: ['step-1']
      }
    ],
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    lastRun: Date.now() - 1 * 24 * 60 * 60 * 1000,
    status: 'completed'
  }
]

// 결과 저장소 (실제 구현에서는 데이터베이스를 사용해야 함)
let executionResults: Record<string, WorkflowExecutionResult> = {}

// 워크플로우 시스템 상태 조회
export async function GET() {
  try {
    // 워크플로우 카운트
    const totalWorkflows = workflows.length
    const runningWorkflows = workflows.filter(wf => wf.status === 'running').length
    const completedWorkflows = workflows.filter(wf => wf.status === 'completed').length
    const failedWorkflows = workflows.filter(wf => wf.status === 'failed').length
    
    // 에이전트 타입별 단계 카운트
    const stepCounts = {
      content: 0,
      design: 0,
      analysis: 0,
      deployment: 0,
      notification: 0
    }
    
    // 모든 워크플로우의 단계 카운트
    workflows.forEach(workflow => {
      workflow.steps.forEach(step => {
        stepCounts[step.type] = (stepCounts[step.type] || 0) + 1
      })
    })
    
    // 최근 실행 결과
    const recentResults = Object.values(executionResults)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 5)
      .map(result => ({
        workflowId: result.workflowId,
        status: result.status,
        startTime: result.startTime,
        endTime: result.endTime,
        duration: result.endTime - result.startTime,
        stepCount: result.steps.length,
        failedSteps: result.steps.filter(step => !step.success).length
      }))
    
    // 시스템 상태 반환
    return NextResponse.json({
      timestamp: Date.now(),
      system: {
        status: 'operational',
        version: '1.0.0',
        uptime: process.uptime()
      },
      workflows: {
        total: totalWorkflows,
        running: runningWorkflows,
        completed: completedWorkflows,
        failed: failedWorkflows
      },
      steps: stepCounts,
      recentExecutions: recentResults
    })
  } catch (error) {
    console.error('워크플로우 상태 조회 오류:', error)
    return NextResponse.json(
      { error: '워크플로우 상태를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 