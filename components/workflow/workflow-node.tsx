import { useState } from "react"
import { StepType } from "@/lib/workflows/definitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { X, GripVertical } from "lucide-react"

interface WorkflowNodeProps {
  step: {
    id: string
    type: StepType
    name: string
    description?: string
    config: Record<string, any>
    next?: string[]
    error?: string
  }
  position: { x: number; y: number }
  isSelected: boolean
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: (x: number, y: number) => void
  onSelect: () => void
  onUpdate: (data: any) => void
  onDelete: () => void
}

export function WorkflowNode({
  step,
  position,
  isSelected,
  isDragging,
  onDragStart,
  onDragEnd,
  onSelect,
  onUpdate,
  onDelete
}: WorkflowNodeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: step.name,
    description: step.description || "",
    config: { ...step.config }
  })

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", step.id)
    onDragStart()
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onDragEnd(rect.left, rect.top)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const fromStepId = e.dataTransfer.getData("text/plain")
    if (fromStepId !== step.id) {
      onUpdate({ next: [...(step.next || []), fromStepId] })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleSave = () => {
    onUpdate(editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      name: step.name,
      description: step.description || "",
      config: { ...step.config }
    })
    setIsEditing(false)
  }

  return (
    <div
      className="absolute"
      style={{
        left: position.x,
        top: position.y,
        transform: isDragging ? "scale(1.05)" : "none",
        zIndex: isSelected ? 10 : 1
      }}
    >
      <Card
        className={`w-64 p-4 cursor-move ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={onSelect}
      >
        <div className="flex items-start gap-2">
          <div className="cursor-move">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editData.name}
                  onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="노드 이름"
                />
                <Textarea
                  value={editData.description}
                  onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="설명"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    저장
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-medium">{step.name}</h3>
                {step.description && (
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                )}
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    편집
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onDelete}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
} 