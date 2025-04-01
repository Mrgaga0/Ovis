import { NextResponse } from 'next/server'
import { ContentAgent } from '@/lib/agents/specialized/content-agent'
import { IAgentConfig } from '@/lib/agents/base-agent'

// 콘텐츠 에이전트 인스턴스 생성
const contentAgentConfig: IAgentConfig = {
  id: 'content-agent',
  type: 'content',
  name: 'Ovis Content Agent',
  description: '콘텐츠 생성 및 최적화를 위한 에이전트',
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

// GET /api/content - 콘텐츠 에이전트 정보 및 기능 조회
export async function GET() {
  try {
    const capabilities = contentAgent.getCapabilities()
    const agentInfo = {
      id: contentAgent.getId(),
      name: contentAgent.getName(),
      capabilities,
      status: 'active',
    }
    
    return NextResponse.json(agentInfo)
  } catch (error) {
    console.error('콘텐츠 에이전트 정보 조회 오류:', error)
    return NextResponse.json(
      { error: '콘텐츠 에이전트 정보를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/content - 새로운 콘텐츠 스펙 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, title, keywords, targetAudience, tone, length, structure, references } = body
    
    if (!type) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다. type이 필요합니다.' },
        { status: 400 }
      )
    }
    
    const contentSpec = await contentAgent.createContentSpec({
      type,
      title,
      keywords,
      targetAudience,
      tone,
      length,
      structure,
      references
    })
    
    return NextResponse.json(contentSpec, { status: 201 })
  } catch (error) {
    console.error('콘텐츠 스펙 생성 오류:', error)
    return NextResponse.json(
      { error: '콘텐츠 스펙을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 