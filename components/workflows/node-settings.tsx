import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface NodeSettingsProps {
  node: {
    id: string
    name: string
    description: string
    type: string
    enabled: boolean
    config: {
      [key: string]: any
    }
  }
  onUpdate: (nodeId: string, updates: any) => void
}

export function NodeSettings({ node, onUpdate }: NodeSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>노드 설정</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={node.name}
              onChange={(e) =>
                onUpdate(node.id, { name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={node.description}
              onChange={(e) =>
                onUpdate(node.id, { description: e.target.value })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">활성화</Label>
            <Switch
              id="enabled"
              checked={node.enabled}
              onCheckedChange={(checked) =>
                onUpdate(node.id, { enabled: checked })
              }
            />
          </div>
          {node.type === "condition" && (
            <div className="space-y-2">
              <Label htmlFor="condition">조건</Label>
              <Input
                id="condition"
                value={node.config.condition || ""}
                onChange={(e) =>
                  onUpdate(node.id, {
                    config: { ...node.config, condition: e.target.value },
                  })
                }
              />
            </div>
          )}
          {node.type === "action" && (
            <div className="space-y-2">
              <Label htmlFor="action">액션</Label>
              <Input
                id="action"
                value={node.config.action || ""}
                onChange={(e) =>
                  onUpdate(node.id, {
                    config: { ...node.config, action: e.target.value },
                  })
                }
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 