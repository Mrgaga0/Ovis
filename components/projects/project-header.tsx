import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Plus } from "lucide-react"

interface ProjectHeaderProps {
  projectId: string
}

export function ProjectHeader({ projectId }: ProjectHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold">마케팅 콘텐츠 생성</h1>
        <p className="text-muted-foreground">프로젝트 ID: {projectId}</p>
      </div>
      <div className="space-x-2">
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          설정
        </Button>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          새 작업
        </Button>
      </div>
    </div>
  )
} 