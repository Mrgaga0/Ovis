import { useState } from "react"
import { Project } from "@/lib/projects/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface ProjectListProps {
  projects: Project[]
  onProjectClick: (project: Project) => void
  onCreateProject: () => void
}

export function ProjectList({ projects, onProjectClick, onCreateProject }: ProjectListProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    onProjectClick(project)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">프로젝트 목록</h2>
        <Button onClick={onCreateProject}>
          <Plus className="w-4 h-4 mr-2" />
          새 프로젝트
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card
            key={project.id}
            className={`cursor-pointer transition-colors ${
              selectedProject?.id === project.id ? "border-primary" : ""
            }`}
            onClick={() => handleProjectClick(project)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge variant={getStatusVariant(project.status)}>
                  {getStatusText(project.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {project.description}
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>진행률</span>
                  <span>{Math.round(project.progress.overall)}%</span>
                </div>
                <Progress value={project.progress.overall} />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>완료된 작업</span>
                  <span>
                    {project.progress.completedTasks} / {project.progress.totalTasks}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function getStatusVariant(status: Project["status"]): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "planning":
      return "secondary"
    case "active":
      return "default"
    case "paused":
      return "outline"
    case "completed":
      return "default"
  }
}

function getStatusText(status: Project["status"]): string {
  switch (status) {
    case "planning":
      return "계획 중"
    case "active":
      return "진행 중"
    case "paused":
      return "일시 중지"
    case "completed":
      return "완료"
  }
} 