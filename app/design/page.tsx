'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

// 디자인 스펙 인터페이스
interface DesignSpec {
  id: string
  type: 'layout' | 'color' | 'typography' | 'component'
  requirements: {
    style?: string
    theme?: string
    constraints?: string[]
    preferences?: string[]
  }
  context?: {
    targetPlatform?: string
    userPreferences?: string[]
    accessibility?: boolean
  }
}

// 디자인 결과 인터페이스
interface DesignResult {
  id: string
  specId: string
  type: string
  content: any
  metadata: {
    generatedAt: number
    version: number
    confidence: number
  }
}

// 분석 결과 인터페이스
interface AnalysisResult {
  specId: string
  designId: string
  analysis: {
    accessibility: {
      score: number
      issues: string[]
      recommendations: string[]
    }
    performance: {
      score: number
      issues: string[]
      recommendations: string[]
    }
    consistency: {
      score: number
      issues: string[]
      recommendations: string[]
    }
    recommendations: string[]
  }
}

export default function DesignPage() {
  const [activeTab, setActiveTab] = useState('create')
  const [designType, setDesignType] = useState<'layout' | 'color' | 'typography' | 'component'>('color')
  const [designStyle, setDesignStyle] = useState('modern')
  const [designTheme, setDesignTheme] = useState('#3B82F6')
  const [currentSpec, setCurrentSpec] = useState<DesignSpec | null>(null)
  const [currentDesign, setCurrentDesign] = useState<DesignResult | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 디자인 스펙 생성
  const createDesignSpec = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: designType,
          requirements: {
            style: designStyle,
            theme: designTheme,
            constraints: ['responsive'],
          },
          context: {
            targetPlatform: 'web',
            accessibility: true,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('디자인 스펙 생성에 실패했습니다.')
      }

      const data = await response.json()
      setCurrentSpec(data)
      setActiveTab('generate')
    } catch (err) {
      setError(err instanceof Error ? err.message : '디자인 스펙 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 디자인 생성
  const generateDesign = async () => {
    if (!currentSpec) return
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/design/generate', {
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
        throw new Error('디자인 생성에 실패했습니다.')
      }

      const data = await response.json()
      setCurrentDesign(data)
      setActiveTab('analyze')
    } catch (err) {
      setError(err instanceof Error ? err.message : '디자인 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 디자인 분석
  const analyzeDesign = async () => {
    if (!currentSpec || !currentDesign) return
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/design/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specId: currentSpec.id,
          designId: currentDesign.id,
        }),
      })

      if (!response.ok) {
        throw new Error('디자인 분석에 실패했습니다.')
      }

      const data = await response.json()
      setAnalysisResult(data)
      setActiveTab('optimize')
    } catch (err) {
      setError(err instanceof Error ? err.message : '디자인 분석 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 디자인 최적화
  const optimizeDesign = async () => {
    if (!currentSpec || !currentDesign) return
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/design/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specId: currentSpec.id,
          designId: currentDesign.id,
        }),
      })

      if (!response.ok) {
        throw new Error('디자인 최적화에 실패했습니다.')
      }

      const data = await response.json()
      setCurrentDesign(data)
      // 최적화된 디자인 분석 다시 수행
      await analyzeDesign()
    } catch (err) {
      setError(err instanceof Error ? err.message : '디자인 최적화 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 색상 시각화를 위한 컴포넌트
  const ColorSchemePreview = ({ colors }: { colors: any }) => {
    if (!colors) return null
    
    return (
      <div className="grid grid-cols-5 gap-4 my-4">
        <div className="flex flex-col items-center">
          <div 
            className="w-16 h-16 rounded-full mb-2" 
            style={{ backgroundColor: colors.primary }}
          />
          <span className="text-sm">Primary</span>
          <span className="text-xs">{colors.primary}</span>
        </div>
        <div className="flex flex-col items-center">
          <div 
            className="w-16 h-16 rounded-full mb-2" 
            style={{ backgroundColor: colors.secondary }}
          />
          <span className="text-sm">Secondary</span>
          <span className="text-xs">{colors.secondary}</span>
        </div>
        <div className="flex flex-col items-center">
          <div 
            className="w-16 h-16 rounded-full mb-2" 
            style={{ backgroundColor: colors.accent }}
          />
          <span className="text-sm">Accent</span>
          <span className="text-xs">{colors.accent}</span>
        </div>
        <div className="flex flex-col items-center">
          <div 
            className="w-16 h-16 rounded-full mb-2" 
            style={{ backgroundColor: colors.background }}
          />
          <span className="text-sm">Background</span>
          <span className="text-xs">{colors.background}</span>
        </div>
        <div className="flex flex-col items-center">
          <div 
            className="w-16 h-16 rounded-full mb-2" 
            style={{ backgroundColor: colors.text }}
          />
          <span className="text-sm">Text</span>
          <span className="text-xs">{colors.text}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-8">Ovis 디자인 에이전트</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="create">1. 스펙 생성</TabsTrigger>
          <TabsTrigger value="generate" disabled={!currentSpec}>2. 디자인 생성</TabsTrigger>
          <TabsTrigger value="analyze" disabled={!currentDesign}>3. 디자인 분석</TabsTrigger>
          <TabsTrigger value="optimize" disabled={!analysisResult}>4. 디자인 최적화</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>디자인 스펙 생성</CardTitle>
              <CardDescription>디자인 요구사항을 정의하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">디자인 유형</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={designType}
                  onChange={(e) => setDesignType(e.target.value as any)}
                >
                  <option value="color">색상 스키마</option>
                  <option value="typography">타이포그래피</option>
                  <option value="layout">레이아웃</option>
                  <option value="component">컴포넌트</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">스타일</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={designStyle}
                  onChange={(e) => setDesignStyle(e.target.value)}
                >
                  <option value="modern">모던</option>
                  <option value="minimal">미니멀</option>
                  <option value="retro">레트로</option>
                  <option value="corporate">기업형</option>
                  <option value="playful">경쾌한</option>
                </select>
              </div>
              
              {designType === 'color' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">기본 색상</label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={designTheme}
                      onChange={(e) => setDesignTheme(e.target.value)}
                      className="w-12 h-10"
                    />
                    <input
                      type="text"
                      value={designTheme}
                      onChange={(e) => setDesignTheme(e.target.value)}
                      className="flex-1 p-2 border rounded-md"
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={createDesignSpec} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? '처리 중...' : '디자인 스펙 생성'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>디자인 생성</CardTitle>
              <CardDescription>디자인 스펙을 기반으로 디자인을 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentSpec && (
                <div className="p-4 bg-gray-100 rounded-md">
                  <h3 className="font-medium mb-2">스펙 정보</h3>
                  <p><span className="font-medium">ID:</span> {currentSpec.id}</p>
                  <p><span className="font-medium">유형:</span> {currentSpec.type}</p>
                  <p><span className="font-medium">스타일:</span> {currentSpec.requirements.style}</p>
                  {currentSpec.requirements.theme && (
                    <p><span className="font-medium">테마:</span> {currentSpec.requirements.theme}</p>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={generateDesign} 
                disabled={isLoading || !currentSpec}
                className="w-full"
              >
                {isLoading ? '처리 중...' : '디자인 생성'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="analyze">
          <Card>
            <CardHeader>
              <CardTitle>디자인 분석</CardTitle>
              <CardDescription>생성된 디자인을 분석합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentDesign && (
                <div>
                  <h3 className="font-medium mb-2">디자인 미리보기</h3>
                  {currentDesign.type === 'color' && (
                    <ColorSchemePreview colors={currentDesign.content} />
                  )}
                  {currentDesign.type !== 'color' && (
                    <div className="p-4 bg-gray-100 rounded-md">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(currentDesign.content, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={analyzeDesign} 
                disabled={isLoading || !currentDesign}
                className="w-full"
              >
                {isLoading ? '처리 중...' : '디자인 분석'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="optimize">
          <Card>
            <CardHeader>
              <CardTitle>디자인 최적화</CardTitle>
              <CardDescription>분석 결과를 기반으로 디자인을 최적화합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysisResult && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-100 rounded-md">
                    <h3 className="font-medium mb-2">분석 결과</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="font-medium">접근성</p>
                        <p className="text-2xl font-bold">{analysisResult.analysis.accessibility.score}/100</p>
                        {analysisResult.analysis.accessibility.issues.length > 0 && (
                          <ul className="list-disc list-inside text-sm mt-2">
                            {analysisResult.analysis.accessibility.issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">성능</p>
                        <p className="text-2xl font-bold">{analysisResult.analysis.performance.score}/100</p>
                        {analysisResult.analysis.performance.issues.length > 0 && (
                          <ul className="list-disc list-inside text-sm mt-2">
                            {analysisResult.analysis.performance.issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">일관성</p>
                        <p className="text-2xl font-bold">{analysisResult.analysis.consistency.score}/100</p>
                        {analysisResult.analysis.consistency.issues.length > 0 && (
                          <ul className="list-disc list-inside text-sm mt-2">
                            {analysisResult.analysis.consistency.issues.map((issue, i) => (
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
                onClick={optimizeDesign} 
                disabled={isLoading || !analysisResult}
                className="w-full"
              >
                {isLoading ? '처리 중...' : '디자인 최적화'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 