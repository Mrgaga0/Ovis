import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warning" | "error"
  message: string
  nodeId?: string
  nodeName?: string
}

interface ExecutionLogProps {
  logs: LogEntry[]
}

export function ExecutionLog({ logs }: ExecutionLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>실행 로그</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start space-x-2 rounded-md border p-2"
              >
                <span className="text-sm text-muted-foreground">
                  {log.timestamp}
                </span>
                <Badge
                  variant={
                    log.level === "error"
                      ? "destructive"
                      : log.level === "warning"
                      ? "warning"
                      : "default"
                  }
                >
                  {log.level}
                </Badge>
                {log.nodeId && (
                  <Badge variant="outline">
                    {log.nodeName || log.nodeId}
                  </Badge>
                )}
                <p className="text-sm">{log.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 