import { prisma } from "@/lib/prisma"
import {
  Project,
  Room,
  Task,
  ProjectStatus,
  ProgressMetrics,
  ResourceVisualization,
  BottleneckAnalysis,
  Timeframe,
  Report
} from "./types"

export class ProjectManager {
  async createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        ...data,
        progress: {
          overall: 0,
          completedTasks: 0,
          totalTasks: 0,
          lastUpdated: new Date()
        }
      }
    })

    // 감사 로그 기록
    await this.logAudit("project_created", {
      projectId: project.id,
      userId: data.team.owner,
      details: { name: project.name }
    })

    return project
  }

  async addRoomToProject(
    projectId: string,
    roomData: Omit<Room, "id" | "projectId" | "createdAt" | "updatedAt" | "tasks" | "documents" | "discussions">
  ): Promise<Room> {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      throw new Error("프로젝트를 찾을 수 없습니다.")
    }

    const room = await prisma.room.create({
      data: {
        ...roomData,
        projectId,
        tasks: [],
        documents: [],
        discussions: []
      }
    })

    // 감사 로그 기록
    await this.logAudit("room_created", {
      projectId,
      roomId: room.id,
      userId: roomData.createdBy,
      details: { name: room.name }
    })

    return room
  }

  async assignTaskToRoom(
    roomId: string,
    taskData: Omit<Task, "id" | "roomId" | "createdAt" | "updatedAt" | "attachments" | "comments">
  ): Promise<Task> {
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    })

    if (!room) {
      throw new Error("룸을 찾을 수 없습니다.")
    }

    const task = await prisma.task.create({
      data: {
        ...taskData,
        roomId,
        attachments: [],
        comments: []
      }
    })

    // 프로젝트 진행률 업데이트
    await this.updateProjectProgress(room.projectId)

    // 감사 로그 기록
    await this.logAudit("task_created", {
      projectId: room.projectId,
      roomId,
      taskId: task.id,
      userId: taskData.assignee || "system",
      details: { title: task.title }
    })

    return task
  }

  async updateProjectStatus(
    projectId: string,
    status: ProjectStatus
  ): Promise<Project> {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      throw new Error("프로젝트를 찾을 수 없습니다.")
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { status }
    })

    // 감사 로그 기록
    await this.logAudit("project_status_updated", {
      projectId,
      userId: "system",
      details: { oldStatus: project.status, newStatus: status }
    })

    return updatedProject
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    const rooms = await prisma.room.findMany({
      where: { projectId },
      include: { tasks: true }
    })

    const totalTasks = rooms.reduce((sum, room) => sum + room.tasks.length, 0)
    const completedTasks = rooms.reduce(
      (sum, room) =>
        sum + room.tasks.filter(task => task.status === "completed").length,
      0
    )

    const overall = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    await prisma.project.update({
      where: { id: projectId },
      data: {
        progress: {
          overall,
          completedTasks,
          totalTasks,
          lastUpdated: new Date()
        }
      }
    })
  }

  private async logAudit(
    action: string,
    data: {
      projectId: string
      roomId?: string
      taskId?: string
      userId: string
      details: Record<string, any>
    }
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action,
        ...data,
        timestamp: new Date()
      }
    })
  }
} 