import { Room } from "@/lib/projects/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RoomListProps {
  projectId: string
}

export function RoomList({ projectId }: RoomListProps) {
  // TODO: 실제 데이터로 교체
  const rooms: Room[] = [
    {
      id: "1",
      name: "기획",
      description: "프로젝트 기획 및 요구사항 정의",
      projectId,
      tasks: [],
      documents: [],
      discussions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
    },
    {
      id: "2",
      name: "디자인",
      description: "UI/UX 디자인 및 프로토타입",
      projectId,
      tasks: [],
      documents: [],
      discussions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
    },
    {
      id: "3",
      name: "개발",
      description: "프론트엔드 및 백엔드 개발",
      projectId,
      tasks: [],
      documents: [],
      discussions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
    },
  ]

  return (
    <>
      {rooms.map((room) => (
        <Card key={room.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">{room.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>수정</DropdownMenuItem>
                <DropdownMenuItem>삭제</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {room.description}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>작업</span>
                <span>{room.tasks.length}개</span>
              </div>
              <Progress value={0} />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>문서</span>
                <span>{room.documents.length}개</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
} 