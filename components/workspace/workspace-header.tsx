import { Button } from "@/components/ui/button"
import { Save, RefreshCw } from "lucide-react"

interface WorkspaceHeaderProps {
  workspaceId: string
}

export function WorkspaceHeader({ workspaceId }: WorkspaceHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold">콘텐츠 생성</h1>
        <p className="text-muted-foreground">작업 ID: {workspaceId}</p>
      </div>
      <div className="space-x-2">
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          저장
        </Button>
      </div>
    </div>
  )
} 