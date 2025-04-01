import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface ContentPreviewProps {
  workspaceId: string
}

export function ContentPreview({ workspaceId }: ContentPreviewProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium mb-2">생성된 콘텐츠</h3>
      <p className="text-sm text-muted-foreground">
        콘텐츠가 여기에 표시됩니다.
      </p>
    </div>
  )
} 