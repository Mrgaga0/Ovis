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

// 임시 데이터 저장소 (실제 구현에서는 데이터베이스를 사용해야 함)
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
      },
      {
        id: 'step-3',
        type: 'analysis',
        name: 'SEO 분석',
        config: {
          checkKeywords: true,
          checkReadability: true
        },
        dependencies: ['step-2']
      },
      {
        id: 'step-4',
        type: 'content',
        name: '콘텐츠 최적화',
        config: {
          optimizationGoals: ['seo', 'engagement']
        },
        dependencies: ['step-2', 'step-3']
      }
    ],
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    lastRun: Date.now() - 1 * 24 * 60 * 60 * 1000,
    status: 'completed'
  },
  {
    id: 'wf-2',
    name: '디자인 시스템 생성 워크플로우',
    description: '브랜드 가이드라인에 맞는 디자인 시스템을 생성합니다.',
    steps: [
      {
        id: 'step-1',
        type: 'design',
        name: '색상 팔레트 생성',
        config: {
          baseColor: '#3498db',
          scheme: 'analogous'
        },
        dependencies: []
      },
      {
        id: 'step-2',
        type: 'design',
        name: '타이포그래피 생성',
        config: {
          heading: 'sans-serif',
          body: 'serif'
        },
        dependencies: []
      },
      {
        id: 'step-3',
        type: 'design',
        name: '컴포넌트 디자인',
        config: {
          components: ['button', 'card', 'input']
        },
        dependencies: ['step-1', 'step-2']
      }
    ],
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    status: 'idle'
  }
]

// 모든 워크플로우 가져오기
export async function GET() {
  return NextResponse.json(workflows)
}

// 새 워크플로우 생성
export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // 필수 필드 확인
    if (!data.name) {
      return NextResponse.json(
        { error: '워크플로우 이름은 필수입니다.' },
        { status: 400 }
      )
    }
    
    // 새 워크플로우 생성
    const newWorkflow: Workflow = {
      id: `wf-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      steps: data.steps || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'idle'
    }
    
    workflows.push(newWorkflow)
    
    return NextResponse.json(newWorkflow, { status: 201 })
  } catch (error) {
    console.error('워크플로우 생성 오류:', error)
    return NextResponse.json(
      { error: '워크플로우를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 