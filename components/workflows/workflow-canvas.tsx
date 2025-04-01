import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface WorkflowNode {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  data: Record<string, any>
}

interface WorkflowConnection {
  id: string
  source: string
  target: string
  type: string
}

interface WorkflowCanvasProps {
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
}

export function WorkflowCanvas({ nodes, connections }: WorkflowCanvasProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>워크플로우 디자이너</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline">미리보기</Button>
              <Button>저장</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">워크플로우 이름</Label>
                <Input id="workflow-name" placeholder="워크플로우 이름을 입력하세요" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-description">설명</Label>
                <Input id="workflow-description" placeholder="워크플로우 설명을 입력하세요" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>자동 실행</Label>
                <p className="text-sm text-muted-foreground">
                  조건이 충족되면 자동으로 워크플로우를 실행합니다.
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>워크플로우 캔버스</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="design" className="space-y-4">
            <TabsList>
              <TabsTrigger value="design">디자인</TabsTrigger>
              <TabsTrigger value="test">테스트</TabsTrigger>
              <TabsTrigger value="monitor">모니터링</TabsTrigger>
            </TabsList>
            <TabsContent value="design" className="space-y-4">
              <div className="h-[600px] rounded-md border bg-muted">
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    노드를 드래그하여 워크플로우를 디자인하세요.
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="test">
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    워크플로우를 테스트하려면 먼저 디자인을 완료하세요.
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="monitor">
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    워크플로우 실행 현황을 모니터링하려면 먼저 워크플로우를 저장하세요.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 