'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ProjectHeader } from '@/components/projects/project-header';
import { ProjectSettings } from '@/components/projects/project-settings';
import { ProjectMembers } from '@/components/projects/project-members';
import { ProjectActivity } from '@/components/projects/project-activity';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Settings } from "lucide-react"
import { notFound } from "next/navigation"
import { ProjectManager } from "@/lib/projects/project-manager"
import { RoomList } from "@/components/projects/room-list"
import { RoomForm } from "@/components/projects/room-form"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Project, Team, Room } from "@prisma/client"

type ProjectWithRelations = Project & {
  team: Team
  rooms: Room[]
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      team: true,
      rooms: true,
    },
  }) as ProjectWithRelations

  if (!project) {
    return <div>프로젝트를 찾을 수 없습니다.</div>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <Button asChild>
          <Link href={`/projects/${project.id}/rooms/new`}>
            <Plus className="mr-2 h-4 w-4" />
            새 룸
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="rooms">룸</TabsTrigger>
          <TabsTrigger value="tasks">작업</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">팀</h3>
                    <p className="text-sm">{project.team.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">상태</h3>
                    <p className="text-sm">{project.status}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">시작일</h3>
                    <p className="text-sm">
                      {project.startDate?.toLocaleDateString() ?? "미정"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">룸 수</h3>
                    <p className="text-sm">{project.rooms.length}개</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.rooms.map((room) => (
              <Card key={room.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{room.name}</CardTitle>
                  <CardDescription>{room.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/projects/${project.id}/rooms/${room.id}`}>
                      룸 보기
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>작업 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">작업 목록이 비어있습니다.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 