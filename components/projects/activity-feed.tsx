import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface ActivityFeedProps {
  projectId: string
}

export function ActivityFeed({ projectId }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>활동 내역</CardTitle>
        <CardDescription>
          프로젝트의 최근 활동 내역입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-8">
            {[
              {
                user: {
                  name: "김철수",
                  avatar: "/avatars/01.png",
                },
                action: "작업 생성",
                target: "메인 페이지 디자인",
                time: "2시간 전",
                type: "task",
              },
              {
                user: {
                  name: "이영희",
                  avatar: "/avatars/02.png",
                },
                action: "댓글 작성",
                target: "메인 페이지 디자인",
                time: "3시간 전",
                type: "comment",
              },
              {
                user: {
                  name: "박지민",
                  avatar: "/avatars/03.png",
                },
                action: "파일 업로드",
                target: "design-system.sketch",
                time: "5시간 전",
                type: "file",
              },
              {
                user: {
                  name: "김철수",
                  avatar: "/avatars/01.png",
                },
                action: "작업 완료",
                target: "로고 디자인",
                time: "1일 전",
                type: "task",
              },
              {
                user: {
                  name: "이영희",
                  avatar: "/avatars/02.png",
                },
                action: "팀원 초대",
                target: "park@example.com",
                time: "2일 전",
                type: "team",
              },
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-4">
                <Avatar>
                  <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                  <AvatarFallback>
                    {activity.user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">{activity.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.action}
                    </p>
                    <p className="text-sm font-medium">{activity.target}</p>
                    <Badge variant="secondary" className="ml-auto">
                      {activity.time}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        activity.type === "task"
                          ? "default"
                          : activity.type === "comment"
                          ? "secondary"
                          : activity.type === "file"
                          ? "outline"
                          : "default"
                      }
                    >
                      {activity.type === "task"
                        ? "작업"
                        : activity.type === "comment"
                        ? "댓글"
                        : activity.type === "file"
                        ? "파일"
                        : "팀"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 