import React from "react"
import { ContentEditor } from "@/components/workspace/content-editor"
import { ContentPreview } from "@/components/workspace/content-preview"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { History, Share2, Save } from "lucide-react"

interface WorkspacePageProps {
  params: {
    id: string
  }
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">콘텐츠 편집</h1>
          <p className="text-muted-foreground">콘텐츠를 작성하고 편집하세요</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <History className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="edit">편집</TabsTrigger>
          <TabsTrigger value="preview">미리보기</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <Card>
            <ContentEditor contentId={params.id} />
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <ContentPreview contentId={params.id} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 