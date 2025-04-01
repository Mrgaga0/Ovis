import { NextResponse } from 'next/server'
import { ContentAgent } from '@/lib/agents/specialized/content-agent'
import { IAgentConfig } from '@/lib/agents/base-agent'

// 콘텐츠 에이전트 인스턴스 생성
const contentAgentConfig: IAgentConfig = {
  id: 'content-optimizer',
  type: 'content',
  name: 'Ovis Content Optimizer',
  description: '콘텐츠 최적화를 위한 에이전트',
  capabilities: [
    'content_creation',
    'content_editing',
    'content_optimization',
    'keyword_research',
    'seo_optimization',
    'headline_generation',
    'content_structure'
  ],
}

const contentAgent = new ContentAgent(contentAgentConfig)

// 초기화
contentAgent.initialize().catch(err => {
  console.error('콘텐츠 에이전트 초기화 오류:', err)
})

// POST /api/content/optimize - 콘텐츠 최적화
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { specId, contentId, optimizationGoals } = body
    
    if (!specId || !contentId) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다. specId 및 contentId가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const optimizedContent = await contentAgent.optimizeContent({
      specId,
      contentId,
      optimizationGoals
    })
    
    return NextResponse.json(optimizedContent)
  } catch (error) {
    console.error('콘텐츠 최적화 오류:', error)
    return NextResponse.json(
      { error: '콘텐츠를 최적화하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 