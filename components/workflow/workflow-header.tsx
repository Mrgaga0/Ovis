import { Button } from "@/components/ui/button"
import { Save, Play, Settings } from "lucide-react"

interface WorkflowHeaderProps {
  workflowId: string
}

export function WorkflowHeader({ workflowId }: WorkflowHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h1 className="text-2xl font-bold">워크플로우 디자인</h1>
        <p className="text-sm text-muted-foreground">워크플로우 ID: {workflowId}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          설정
        </Button>
        <Button variant="outline" size="sm">
          <Play className="w-4 h-4 mr-2" />
          실행
        </Button>
        <Button size="sm">
          <Save className="w-4 h-4 mr-2" />
          저장
        </Button>
      </div>
    </div>
  )
} 