'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

// 콘텐츠 스펙 인터페이스
interface ContentSpec {
  id: string
  type: 'article' | 'blog' | 'social' | 'script' | 'newsletter'
  title?: string
  keywords?: string[]
  targetAudience?: string
  tone?: string
  length?: 'short' | 'medium' | 'long'
  structure?: {
    sections?: string[]
    includeSummary?: boolean
    includeHeadings?: boolean
    includeKeyPoints?: boolean
  }
  references?: {
    urls?: string[]
    citations?: string[]
  }
}

// 콘텐츠 결과 인터페이스
interface ContentResult {
  id: string
  specId: string
  type: string
  content: {
    title: string
    sections: {
      heading?: string
      content: string
      type: 'introduction' | 'body' | 'conclusion' | 'summary' | 'key_points'
    }[]
    metadata: {
      wordCount: number
      readingTime: number
      keywords: string[]
      seoScore?: number
    }
  }
  metadata: {
    generatedAt: number
    version: number
    confidence: number
  }
}

// 분석 결과 인터페이스
interface ContentAnalysis {
  specId: string
  contentId: string
  analysis: {
    clarity: {
      score: number
      issues: string[]
      recommendations: string[]
    }
    engagement: {
      score: number
      issues: string[]
      recommendations: string[]
    }
    seo: {
      score: number
      issues: string[]
      recommendations: string[]
    }
    recommendations: string[]
  }
}

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('create')
  
  // 콘텐츠 스펙 상태
  const [contentType, setContentType] = useState<'article' | 'blog' | 'social' | 'script' | 'newsletter'>('blog')
  const [title, setTitle] = useState('')
  const [keywords, setKeywords] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [tone, setTone] = useState('informative')
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
  
  // 결과 상태
  const [currentSpec, setCurrentSpec] = useState<ContentSpec | null>(null)
  const [currentContent, setCurrentContent] = useState<ContentResult | null>(null)
  const [analysisResult, setAnalysisResult] = useState<ContentAnalysis | null>(null)
  const [headlines, setHeadlines] = useState<string[]>([])
  
  // UI 상태
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topic, setTopic] = useState('')

  // 콘텐츠 스펙 생성
  const createContentSpec = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
      
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: contentType,
          title,
          keywords: keywordsArray,
          targetAudience,
          tone,
          length,
          structure: {
            includeSummary: true,
            includeHeadings: true,
            includeKeyPoints: contentType === 'article' || contentType === 'blog',
          }
        }),
      })

      if (!response.ok) {
        throw new Error('콘텐츠 스펙 생성에 실패했습니다.')
      }

      const data = await response.json()
      setCurrentSpec(data)
      setActiveTab('generate')
    } catch (err) {
      setError(err instanceof Error ? err.message : '콘텐츠 스펙 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 콘텐츠 생성
  const generateContent = async () => {
    if (!currentSpec) return
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specId: currentSpec.id,
          type: currentSpec.type,
        }),
      })

      if (!response.ok) {
        throw new Error('콘텐츠 생성에 실패했습니다.')
      }

      const data = await response.json()
      setCurrentContent(data)
      setActiveTab('analyze')
    } catch (err) {
      setError(err instanceof Error ? err.message : '콘텐츠 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 콘텐츠 분석
  const analyzeContent = async () => {
    if (!currentSpec || !currentContent) return
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/content/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specId: currentSpec.id,
          contentId: currentContent.id,
        }),
      })

      if (!response.ok) {
        throw new Error('콘텐츠 분석에 실패했습니다.')
      }

      const data = await response.json()
      setAnalysisResult(data)
      setActiveTab('optimize')
    } catch (err) {
      setError(err instanceof Error ? err.message : '콘텐츠 분석 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 콘텐츠 최적화
  const optimizeContent = async () => {
    if (!currentSpec || !currentContent) return
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/content/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specId: currentSpec.id,
          contentId: currentContent.id,
          optimizationGoals: ['clarity', 'engagement', 'seo'],
        }),
      })

      if (!response.ok) {
        throw new Error('콘텐츠 최적화에 실패했습니다.')
      }

      const data = await response.json()
      setCurrentContent(data)
      // 최적화된 콘텐츠 분석 다시 수행
      await analyzeContent()
    } catch (err) {
      setError(err instanceof Error ? err.message : '콘텐츠 최적화 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 헤드라인 생성
  const generateHeadlines = async () => {
    if (!topic) return
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/content/headlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          count: 5,
        }),
      })

      if (!response.ok) {
        throw new Error('헤드라인 생성에 실패했습니다.')
      }

      const data = await response.json()
      setHeadlines(data.headlines)
    } catch (err) {
      setError(err instanceof Error ? err.message : '헤드라인 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-8">Ovis 콘텐츠 에이전트</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="create">1. 콘텐츠 스펙 생성</TabsTrigger>
          <TabsTrigger value="headlines">헤드라인 생성</TabsTrigger>
          <TabsTrigger value="generate" disabled={!currentSpec}>2. 콘텐츠 생성</TabsTrigger>
          <TabsTrigger value="analyze" disabled={!currentContent}>3. 콘텐츠 분석</TabsTrigger>
          <TabsTrigger value="optimize" disabled={!analysisResult}>4. 콘텐츠 최적화</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>콘텐츠 스펙 생성</CardTitle>
              <CardDescription>콘텐츠 요구사항을 정의하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">콘텐츠 유형</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as any)}
                >
                  <option value="blog">블로그 포스트</option>
                  <option value="article">기사</option>
                  <option value="social">소셜 미디어 포스트</option>
                  <option value="script">스크립트</option>
                  <option value="newsletter">뉴스레터</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">제목</label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="콘텐츠 제목"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">키워드 (콤마로 구분)</label>
                <Input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="키워드1, 키워드2, 키워드3"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">대상 독자</label>
                <Input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="대상 독자층 (예: 초보 개발자, 마케팅 담당자 등)"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">어조</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  <option value="informative">정보 제공적</option>
                  <option value="casual">가볍고 친근한</option>
                  <option value="formal">공식적이고 격식있는</option>
                  <option value="persuasive">설득력 있는</option>
                  <option value="humorous">유머러스한</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">길이</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={length}
                  onChange={(e) => setLength(e.target.value as any)}
                >
                  <option value="short">짧게 (500 단어 이하)</option>
                  <option value="medium">중간 (500-1500 단어)</option>
                  <option value="long">길게 (1500 단어 이상)</option>
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={createContentSpec} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? '처리 중...' : '콘텐츠 스펙 생성'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="headlines">
          <Card>
            <CardHeader>
              <CardTitle>헤드라인 생성</CardTitle>
              <CardDescription>주제에 맞는 헤드라인을 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">주제</label>
                <Input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="헤드라인을 생성할 주제 (예: 인공지능, 건강, 마케팅 등)"
                />
              </div>

              {headlines.length > 0 && (
                <div className="p-4 bg-gray-100 rounded-md mt-4">
                  <h3 className="font-medium mb-2">생성된 헤드라인</h3>
                  <ul className="list-disc list-inside space-y-2">
                    {headlines.map((headline, index) => (
                      <li key={index} className="text-blue-700 hover:underline cursor-pointer">{headline}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={generateHeadlines} 
                disabled={isLoading || !topic}
                className="w-full"
              >
                {isLoading ? '처리 중...' : '헤드라인 생성'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>콘텐츠 생성</CardTitle>
              <CardDescription>스펙을 기반으로 콘텐츠를 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentSpec && (
                <div className="p-4 bg-gray-100 rounded-md">
                  <h3 className="font-medium mb-2">스펙 정보</h3>
                  <p><span className="font-medium">ID:</span> {currentSpec.id}</p>
                  <p><span className="font-medium">유형:</span> {currentSpec.type}</p>
                  <p><span className="font-medium">제목:</span> {currentSpec.title}</p>
                  <p><span className="font-medium">키워드:</span> {currentSpec.keywords?.join(', ')}</p>
                  <p><span className="font-medium">대상:</span> {currentSpec.targetAudience}</p>
                  <p><span className="font-medium">어조:</span> {currentSpec.tone}</p>
                  <p><span className="font-medium">길이:</span> {currentSpec.length}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={generateContent} 
                disabled={isLoading || !currentSpec}
                className="w-full"
              >
                {isLoading ? '처리 중...' : '콘텐츠 생성'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="analyze">
          <Card>
            <CardHeader>
              <CardTitle>콘텐츠 분석</CardTitle>
              <CardDescription>생성된 콘텐츠를 분석합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentContent && (
                <div>
                  <h3 className="font-medium mb-2">생성된 콘텐츠</h3>
                  <div className="p-4 bg-white border rounded-md">
                    <h2 className="text-xl font-bold mb-4">{currentContent.content.title}</h2>
                    
                    {currentContent.content.sections.map((section, index) => (
                      <div key={index} className="mb-4">
                        {section.heading && <h3 className="text-lg font-semibold mb-2">{section.heading}</h3>}
                        <div className="whitespace-pre-wrap text-gray-700">{section.content}</div>
                      </div>
                    ))}
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                      <p>단어 수: {currentContent.content.metadata.wordCount} | 읽는 시간: {currentContent.content.metadata.readingTime}분</p>
                      <p>키워드: {currentContent.content.metadata.keywords.join(', ')}</p>
                      {currentContent.content.metadata.seoScore && <p>SEO 점수: {currentContent.content.metadata.seoScore}/100</p>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={analyzeContent} 
                disabled={isLoading || !currentContent}
                className="w-full"
              >
                {isLoading ? '처리 중...' : '콘텐츠 분석'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="optimize">
          <Card>
            <CardHeader>
              <CardTitle>콘텐츠 최적화</CardTitle>
              <CardDescription>분석 결과를 기반으로 콘텐츠를 최적화합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysisResult && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-100 rounded-md">
                    <h3 className="font-medium mb-2">분석 결과</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="font-medium">가독성</p>
                        <p className="text-2xl font-bold">{analysisResult.analysis.clarity.score}/100</p>
                        {analysisResult.analysis.clarity.issues.length > 0 && (
                          <ul className="list-disc list-inside text-sm mt-2">
                            {analysisResult.analysis.clarity.issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">참여도</p>
                        <p className="text-2xl font-bold">{analysisResult.analysis.engagement.score}/100</p>
                        {analysisResult.analysis.engagement.issues.length > 0 && (
                          <ul className="list-disc list-inside text-sm mt-2">
                            {analysisResult.analysis.engagement.issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">SEO</p>
                        <p className="text-2xl font-bold">{analysisResult.analysis.seo.score}/100</p>
                        {analysisResult.analysis.seo.issues.length > 0 && (
                          <ul className="list-disc list-inside text-sm mt-2">
                            {analysisResult.analysis.seo.issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {analysisResult.analysis.recommendations.length > 0 && (
                    <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
                      <h3 className="font-medium mb-2">개선 추천사항</h3>
                      <ul className="list-disc list-inside text-sm">
                        {analysisResult.analysis.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={optimizeContent} 
                disabled={isLoading || !analysisResult}
                className="w-full"
              >
                {isLoading ? '처리 중...' : '콘텐츠 최적화'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 