import React from "react"
import { ProjectHeader } from "@/components/projects/project-header"
import { ProjectOverview } from "@/components/projects/project-overview"
import { ProjectSettings } from "@/components/projects/project-settings"
import { TeamManagement } from "@/components/projects/team-management"
import { ActivityFeed } from "@/components/projects/activity-feed"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProjectPageProps {
  params: {
    id: string
  }
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <div className="container mx-auto py-6">
      <ProjectHeader projectId={params.id} />
      
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="team">팀</TabsTrigger>
          <TabsTrigger value="activity">활동</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview projectId={params.id} />
        </TabsContent>

        <TabsContent value="team">
          <TeamManagement projectId={params.id} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed projectId={params.id} />
        </TabsContent>

        <TabsContent value="settings">
          <ProjectSettings projectId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 