import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send } from "lucide-react"

interface ContentEditorProps {
  workspaceId: string
}

export function ContentEditor({ workspaceId }: ContentEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">콘텐츠 유형</label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="콘텐츠 유형 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blog">블로그 포스트</SelectItem>
            <SelectItem value="social">소셜 미디어</SelectItem>
            <SelectItem value="email">이메일</SelectItem>
            <SelectItem value="product">제품 설명</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">주제</label>
        <Input placeholder="주제를 입력하세요" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">프롬프트</label>
        <Textarea
          placeholder="프롬프트를 입력하세요"
          className="min-h-[200px]"
        />
      </div>

      <Button className="w-full">
        <Send className="mr-2 h-4 w-4" />
        생성 시작
      </Button>
    </div>
  )
} 