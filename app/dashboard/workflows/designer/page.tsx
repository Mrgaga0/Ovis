import { WorkflowCanvas } from "@/components/workflows/workflow-canvas"
import { NodeLibrary } from "@/components/workflows/node-library"
import { NodeSettings } from "@/components/workflows/node-settings"
import { ExecutionLog } from "@/components/workflows/execution-log"
import { Button } from "@/components/ui/button"
import { Square, Play, Save } from "lucide-react"

// 목업 데이터
const mockNodes = [
  {
    id: "start",
    name: "시작",
    description: "워크플로우의 시작점",
    category: "flow",
    icon: "Play"
  },
  {
    id: "condition",
    name: "조건",
    description: "조건에 따른 분기 처리",
    category: "logic",
    icon: "GitBranch"
  },
  {
    id: "action",
    name: "액션",
    description: "작업 실행",
    category: "action",
    icon: "Activity"
  },
  {
    id: "end",
    name: "종료",
    description: "워크플로우의 종료점",
    category: "flow",
    icon: "Square"
  }
]

const mockLogs = [
  {
    timestamp: "2024-03-20T10:00:00Z",
    level: "info",
    message: "워크플로우 시작",
    nodeId: "start",
    nodeName: "시작"
  },
  {
    timestamp: "2024-03-20T10:00:01Z",
    level: "info",
    message: "조건 검사 중",
    nodeId: "condition",
    nodeName: "조건"
  },
  {
    timestamp: "2024-03-20T10:00:02Z",
    level: "success",
    message: "액션 실행 완료",
    nodeId: "action",
    nodeName: "액션"
  }
]

export default function WorkflowDesignerPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">워크플로우 디자이너</h1>
          <p className="text-muted-foreground">워크플로우를 시각적으로 설계하세요</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Square className="h-4 w-4 mr-2" />
            중지
          </Button>
          <Button>
            <Play className="h-4 w-4 mr-2" />
            실행
          </Button>
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <NodeLibrary nodes={mockNodes} />
        </div>
        <div className="col-span-6">
          <WorkflowCanvas />
        </div>
        <div className="col-span-3 space-y-4">
          <NodeSettings />
          <ExecutionLog logs={mockLogs} />
        </div>
      </div>
    </div>
  )
} 