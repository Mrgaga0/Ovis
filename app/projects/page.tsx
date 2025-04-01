import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Project, Team, Room } from "@prisma/client"

type ProjectWithRelations = Project & {
  team: Team
  rooms: Room[]
}

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
      team: true,
      rooms: true,
    },
  }) as ProjectWithRelations[]

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">프로젝트</h1>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            새 프로젝트
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">팀</span>
                  <span className="text-sm font-medium">{project.team.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">상태</span>
                  <span className="text-sm font-medium">{project.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">룸</span>
                  <span className="text-sm font-medium">{project.rooms.length}개</span>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/projects/${project.id}`}>
                    프로젝트 보기
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 