import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface WorkflowSidebarProps {
  workflowId: string
}

export function WorkflowSidebar({ workflowId }: WorkflowSidebarProps) {
  return (
    <div className="w-64 border-l p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">노드 목록</h3>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                텍스트 생성
              </Button>
              <Button variant="outline" className="w-full justify-start">
                이미지 생성
              </Button>
              <Button variant="outline" className="w-full justify-start">
                조건 분기
              </Button>
              <Button variant="outline" className="w-full justify-start">
                반복
              </Button>
              <Button variant="outline" className="w-full justify-start">
                변수 설정
              </Button>
            </div>
          </ScrollArea>
        </div>

        <div>
          <h3 className="font-medium mb-2">워크플로우 설정</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              변수 관리
            </Button>
            <Button variant="outline" className="w-full justify-start">
              실행 설정
            </Button>
            <Button variant="outline" className="w-full justify-start">
              알림 설정
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 