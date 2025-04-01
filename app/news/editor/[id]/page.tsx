"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, Send, CheckCircle, AlertCircle } from "lucide-react"

interface Article {
  id: string
  title: string
  content: string
  sections: Array<{
    name: string
    content: string
    type: string
  }>
  metadata: {
    keywords: string[]
    readingTime: number
    wordCount: number
  }
  status: "draft" | "review" | "published"
}

interface Feedback {
  id: string
  userId: string
  content: string
  timestamp: Date
  status: "pending" | "resolved"
}

export default function ArticleEditor() {
  const params = useParams()
  const [article, setArticle] = useState<Article | null>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [newFeedback, setNewFeedback] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadArticle()
    loadFeedbacks()
  }, [params.id])

  const loadArticle = async () => {
    try {
      const response = await fetch(`/api/articles/${params.id}`)
      const data = await response.json()
      setArticle(data)
    } catch (error) {
      console.error("기사 로드 실패:", error)
    }
  }

  const loadFeedbacks = async () => {
    try {
      const response = await fetch(`/api/articles/${params.id}/feedbacks`)
      const data = await response.json()
      setFeedbacks(data)
    } catch (error) {
      console.error("피드백 로드 실패:", error)
    }
  }

  const handleSave = async () => {
    if (!article) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/articles/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(article)
      })

      if (!response.ok) {
        throw new Error("저장 실패")
      }

      // 성공 메시지 표시
    } catch (error) {
      console.error("저장 실패:", error)
      // 에러 메시지 표시
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendForReview = async () => {
    if (!article) return

    try {
      const response = await fetch(`/api/articles/${params.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: "review" })
      })

      if (!response.ok) {
        throw new Error("검토 요청 실패")
      }

      setArticle(prev => prev ? { ...prev, status: "review" } : null)
    } catch (error) {
      console.error("검토 요청 실패:", error)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!newFeedback.trim()) return

    try {
      const response = await fetch(`/api/articles/${params.id}/feedbacks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content: newFeedback })
      })

      if (!response.ok) {
        throw new Error("피드백 제출 실패")
      }

      const feedback = await response.json()
      setFeedbacks(prev => [...prev, feedback])
      setNewFeedback("")
    } catch (error) {
      console.error("피드백 제출 실패:", error)
    }
  }

  if (!article) {
    return <div>로딩 중...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">기사 편집</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            저장
          </Button>
          {article.status === "draft" && (
            <Button onClick={handleSendForReview}>
              <Send className="w-4 h-4 mr-2" />
              검토 요청
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">내용</TabsTrigger>
          <TabsTrigger value="metadata">메타데이터</TabsTrigger>
          <TabsTrigger value="feedback">피드백</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <Card className="p-4">
            <div className="space-y-4">
              <Input
                value={article.title}
                onChange={e =>
                  setArticle(prev =>
                    prev ? { ...prev, title: e.target.value } : null
                  )
                }
                placeholder="제목"
              />

              {article.sections.map((section, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="font-medium">{section.name}</h3>
                  <Textarea
                    value={section.content}
                    onChange={e => {
                      const newSections = [...article.sections]
                      newSections[index] = {
                        ...section,
                        content: e.target.value
                      }
                      setArticle(prev =>
                        prev ? { ...prev, sections: newSections } : null
                      )
                    }}
                    placeholder="섹션 내용"
                  />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="metadata">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">키워드</h3>
                <div className="flex flex-wrap gap-2">
                  {article.metadata.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary/10 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">읽기 시간</h3>
                  <p className="text-sm text-muted-foreground">
                    {article.metadata.readingTime}분
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">단어 수</h3>
                  <p className="text-sm text-muted-foreground">
                    {article.metadata.wordCount}단어
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  value={newFeedback}
                  onChange={e => setNewFeedback(e.target.value)}
                  placeholder="피드백을 입력하세요..."
                />
                <Button onClick={handleSubmitFeedback}>
                  제출
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {feedbacks.map(feedback => (
                    <div
                      key={feedback.id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        {feedback.status === "resolved" ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(feedback.timestamp).toLocaleString()}
                          </p>
                          <p className="mt-1">{feedback.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 