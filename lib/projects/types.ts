export type ProjectStatus = "planning" | "active" | "paused" | "completed"

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  startDate: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
  metadata: {
    priority: "low" | "medium" | "high"
    category: string
    tags: string[]
    budget?: number
    client?: string
  }
  progress: {
    overall: number
    completedTasks: number
    totalTasks: number
    lastUpdated: Date
  }
  team: {
    owner: string
    members: string[]
    roles: Record<string, string[]>
  }
}

export interface Room {
  id: string
  projectId: string
  name: string
  description: string
  type: "development" | "design" | "marketing" | "documentation" | "custom"
  theme: {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
  }
  settings: {
    isPrivate: boolean
    allowComments: boolean
    enableNotifications: boolean
    autoSave: boolean
  }
  tasks: Task[]
  documents: Document[]
  discussions: Discussion[]
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: string
  roomId: string
  title: string
  description: string
  status: "todo" | "in_progress" | "review" | "completed"
  priority: "low" | "medium" | "high"
  assignee?: string
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  dependencies: string[]
  tags: string[]
  attachments: Attachment[]
  comments: Comment[]
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  roomId: string
  title: string
  content: string
  type: "text" | "image" | "file" | "link"
  url?: string
  fileSize?: number
  mimeType?: string
  version: number
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Discussion {
  id: string
  roomId: string
  title: string
  content: string
  createdBy: string
  participants: string[]
  messages: Message[]
  isResolved: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  discussionId: string
  content: string
  createdBy: string
  attachments: Attachment[]
  reactions: Record<string, string[]>
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  id: string
  taskId: string
  content: string
  createdBy: string
  attachments: Attachment[]
  createdAt: Date
  updatedAt: Date
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedBy: string
  createdAt: Date
}

export interface ProgressMetrics {
  overall: number
  byRoom: Record<string, number>
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  byAssignee: Record<string, number>
  timeline: {
    date: Date
    completed: number
    total: number
  }[]
}

export interface ResourceVisualization {
  byTeam: {
    member: string
    tasks: number
    hours: number
    workload: number
  }[]
  byTime: {
    date: Date
    tasks: number
    hours: number
  }[]
  byRoom: {
    room: string
    tasks: number
    hours: number
  }[]
}

export interface BottleneckAnalysis {
  criticalPaths: {
    tasks: string[]
    duration: number
    slack: number
  }[]
  blockers: {
    task: string
    reason: string
    impact: string
  }[]
  recommendations: {
    type: "optimize" | "reassign" | "delegate" | "automate"
    description: string
    impact: string
  }[]
}

export interface Timeframe {
  start: Date
  end: Date
  interval: "day" | "week" | "month" | "quarter"
}

export interface Report {
  timeframe: Timeframe
  metrics: ProgressMetrics
  resources: ResourceVisualization
  bottlenecks: BottleneckAnalysis
  recommendations: string[]
  generatedAt: Date
} 