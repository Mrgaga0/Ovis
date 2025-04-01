import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NodeType {
  id: string
  name: string
  description: string
  category: string
  icon: string
}

interface NodeLibraryProps {
  nodes: NodeType[]
}

export function NodeLibrary({ nodes }: NodeLibraryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>노드 라이브러리</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">검색</Label>
            <Input
              id="search"
              placeholder="노드 검색..."
            />
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium">기본 노드</h3>
                <div className="grid gap-2">
                  {nodes
                    .filter((node) => node.category === "basic")
                    .map((node) => (
                      <div
                        key={node.id}
                        className="flex cursor-pointer items-center space-x-2 rounded-md border p-2 hover:bg-accent"
                      >
                        <span className="text-sm">{node.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{node.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">조건 노드</h3>
                <div className="grid gap-2">
                  {nodes
                    .filter((node) => node.category === "condition")
                    .map((node) => (
                      <div
                        key={node.id}
                        className="flex cursor-pointer items-center space-x-2 rounded-md border p-2 hover:bg-accent"
                      >
                        <span className="text-sm">{node.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{node.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">액션 노드</h3>
                <div className="grid gap-2">
                  {nodes
                    .filter((node) => node.category === "action")
                    .map((node) => (
                      <div
                        key={node.id}
                        className="flex cursor-pointer items-center space-x-2 rounded-md border p-2 hover:bg-accent"
                      >
                        <span className="text-sm">{node.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{node.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
} 