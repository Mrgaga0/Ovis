import { Card, CardContent } from "@/components/ui/card"

export function ActivityFeed() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">새 프로젝트 생성</p>
          <p className="text-sm text-muted-foreground">마케팅 콘텐츠 생성 프로젝트가 생성되었습니다.</p>
        </div>
        <div className="text-sm text-muted-foreground">2시간 전</div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">작업 완료</p>
          <p className="text-sm text-muted-foreground">제품 설명서 작성이 완료되었습니다.</p>
        </div>
        <div className="text-sm text-muted-foreground">4시간 전</div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">작업 진행</p>
          <p className="text-sm text-muted-foreground">소셜 미디어 캠페인 작업이 진행 중입니다.</p>
        </div>
        <div className="text-sm text-muted-foreground">6시간 전</div>
      </div>
    </div>
  )
} 