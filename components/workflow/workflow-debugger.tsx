import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Pause, StepForward, RefreshCw, Bug } from "lucide-react"

interface WorkflowDebuggerProps {
  workflowId: string
  variables: Record<string, any>
  currentStepId: string | null
  stepResults: Record<string, any>
  onSetVariable: (name: string, value: any) => void
  onStepForward: () => void
  onContinue: () => void
  onPause: () => void
  onReset: () => void
}

export function WorkflowDebugger({
  workflowId,
  variables,
  currentStepId,
  stepResults,
  onSetVariable,
  onStepForward,
  onContinue,
  onPause,
  onReset
}: WorkflowDebuggerProps) {
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const handleVariableSelect = (name: string) => {
    setSelectedVariable(name)
    setEditValue(JSON.stringify(variables[name], null, 2))
  }

  const handleVariableUpdate = () => {
    if (selectedVariable) {
      try {
        const value = JSON.parse(editValue)
        onSetVariable(selectedVariable, value)
      } catch (error) {
        console.error("변수 값 파싱 오류:", error)
      }
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-primary" />
            <h3 className="font-medium">디버거</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onStepForward}>
              <StepForward className="w-4 h-4 mr-2" />
              한 단계 실행
            </Button>
            <Button size="sm" onClick={onContinue}>
              <Play className="w-4 h-4 mr-2" />
              계속 실행
            </Button>
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause className="w-4 h-4 mr-2" />
              일시 중지
            </Button>
            <Button size="sm" variant="outline" onClick={onReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              초기화
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">변수</h4>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              <div className="space-y-2">
                {Object.entries(variables).map(([name, value]) => (
                  <div
                    key={name}
                    className={`p-2 rounded cursor-pointer ${
                      selectedVariable === name
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handleVariableSelect(name)}
                  >
                    <div className="font-mono text-sm">
                      {name}: {JSON.stringify(value)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">변수 편집</h4>
            <div className="space-y-2">
              <Input
                value={selectedVariable || ""}
                readOnly
                placeholder="변수 선택"
              />
              <Textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                placeholder="변수 값"
                className="font-mono"
              />
              <Button
                size="sm"
                onClick={handleVariableUpdate}
                disabled={!selectedVariable}
              >
                업데이트
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">단계 결과</h4>
          <ScrollArea className="h-[200px] border rounded-md p-2">
            <div className="space-y-2">
              {Object.entries(stepResults).map(([stepId, result]) => (
                <div
                  key={stepId}
                  className={`p-2 rounded ${
                    currentStepId === stepId ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="font-mono text-sm">
                    {stepId}: {JSON.stringify(result)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  )
} 