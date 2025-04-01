import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface ProjectSettingsProps {
  projectId: string
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>
            프로젝트의 기본 정보를 설정하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">프로젝트명</Label>
            <Input id="name" defaultValue="마케팅 콘텐츠 생성" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              defaultValue="마케팅 콘텐츠 생성을 위한 프로젝트입니다."
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">시작일</Label>
            <Input id="startDate" type="date" defaultValue="2024-03-31" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">종료일</Label>
            <Input id="endDate" type="date" defaultValue="2024-04-30" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
          <CardDescription>
            프로젝트 관련 알림을 설정하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>이메일 알림</Label>
              <p className="text-sm text-muted-foreground">
                프로젝트 업데이트를 이메일로 받습니다.
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>브라우저 알림</Label>
              <p className="text-sm text-muted-foreground">
                브라우저에서 실시간 알림을 받습니다.
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>마감일 알림</Label>
              <p className="text-sm text-muted-foreground">
                작업 마감일이 다가오면 알림을 받습니다.
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>위험 구역</CardTitle>
          <CardDescription>
            프로젝트 삭제와 같은 위험한 작업을 수행할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">프로젝트 삭제</Button>
        </CardContent>
      </Card>

      <Button className="w-full">설정 저장</Button>
    </div>
  )
} 