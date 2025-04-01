import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TeamManagementProps {
  projectId: string
}

export function TeamManagement({ projectId }: TeamManagementProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>팀원 초대</CardTitle>
          <CardDescription>
            이메일 주소를 입력하여 팀원을 초대하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" placeholder="team@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">역할</Label>
              <Select>
                <SelectTrigger id="role" className="w-[180px]">
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="editor">편집자</SelectItem>
                  <SelectItem value="viewer">뷰어</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button>초대하기</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>팀원 목록</CardTitle>
          <CardDescription>
            현재 프로젝트에 참여 중인 팀원들입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {[
                {
                  name: "김철수",
                  email: "kim@example.com",
                  role: "관리자",
                  avatar: "/avatars/01.png",
                },
                {
                  name: "이영희",
                  email: "lee@example.com",
                  role: "편집자",
                  avatar: "/avatars/02.png",
                },
                {
                  name: "박지민",
                  email: "park@example.com",
                  role: "뷰어",
                  avatar: "/avatars/03.png",
                },
              ].map((member) => (
                <div
                  key={member.email}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>
                        {member.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{member.role}</Badge>
                    <Button variant="ghost" size="icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 