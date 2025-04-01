import { Button } from "@/components/ui/button"

interface ContentHistoryProps {
  workspaceId: string
}

export function ContentHistory({ workspaceId }: ContentHistoryProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium">이전 버전 1</h3>
          <Button variant="outline" size="sm">복원</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          이전에 생성된 콘텐츠가 여기에 표시됩니다.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium">이전 버전 2</h3>
          <Button variant="outline" size="sm">복원</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          이전에 생성된 콘텐츠가 여기에 표시됩니다.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium">이전 버전 3</h3>
          <Button variant="outline" size="sm">복원</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          이전에 생성된 콘텐츠가 여기에 표시됩니다.
        </p>
      </div>
    </div>
  )
} 