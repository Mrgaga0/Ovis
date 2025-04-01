import { NextResponse } from 'next/server'
import { DesignAgent } from '@/lib/agents/specialized/design-agent'
import { IAgentConfig } from '@/lib/agents/base-agent'

// 디자인 에이전트 인스턴스 생성
const designAgentConfig: IAgentConfig = {
  id: 'design-agent',
  type: 'design',
  name: 'Ovis Design Agent',
  description: '디자인 분석 및 생성을 위한 에이전트',
  capabilities: [
    'design_analysis',
    'style_generation',
    'layout_planning',
    'color_scheme',
    'typography',
    'component_design'
  ],
}

const designAgent = new DesignAgent(designAgentConfig)

// 초기화
designAgent.initialize().catch(err => {
  console.error('디자인 에이전트 초기화 오류:', err)
})

// GET /api/design - 디자인 에이전트 정보 및 기능 조회
export async function GET() {
  try {
    const capabilities = designAgent.getCapabilities()
    const agentInfo = {
      id: designAgent.getId(),
      name: designAgent.getName(),
      capabilities,
      status: 'active', // 기본값으로 설정
    }
    
    return NextResponse.json(agentInfo)
  } catch (error) {
    console.error('디자인 에이전트 정보 조회 오류:', error)
    return NextResponse.json(
      { error: '디자인 에이전트 정보를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/design - 새로운 디자인 스펙 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, requirements, context } = body
    
    if (!type || !requirements) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다. type 및 requirements가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const designSpec = await designAgent['createDesignSpec']({
      type,
      requirements,
      ...(context && { context })
    })
    
    return NextResponse.json(designSpec, { status: 201 })
  } catch (error) {
    console.error('디자인 스펙 생성 오류:', error)
    return NextResponse.json(
      { error: '디자인 스펙을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 