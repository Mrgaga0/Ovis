import { NextResponse } from 'next/server'
import { DesignAgent } from '@/lib/agents/specialized/design-agent'
import { IAgentConfig } from '@/lib/agents/base-agent'

// 디자인 에이전트 인스턴스 생성
const designAgentConfig: IAgentConfig = {
  id: 'design-agent',
  type: 'design',
  name: 'Ovis Design Agent',
  description: '디자인 생성을 위한 에이전트',
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

// POST /api/design/generate - 디자인 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { specId, type } = body
    
    if (!specId || !type) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다. specId 및 type이 필요합니다.' },
        { status: 400 }
      )
    }
    
    const design = await designAgent['generateDesign']({
      specId,
      type
    })
    
    return NextResponse.json(design)
  } catch (error) {
    console.error('디자인 생성 오류:', error)
    return NextResponse.json(
      { error: '디자인을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 