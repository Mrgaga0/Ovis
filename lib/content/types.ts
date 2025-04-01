export interface Entity {
  id: string
  type: string
  name: string
  attributes: Record<string, any>
  confidence: number
}

export interface Concept {
  id: string
  name: string
  description: string
  relevance: number
  relatedEntities: string[]
}

export interface Relationship {
  id: string
  sourceId: string
  targetId: string
  type: string
  attributes: Record<string, any>
  confidence: number
}

export interface KnowledgeGraph {
  entities: Entity[]
  relationships: Relationship[]
  concepts: Concept[]
}

export interface ContentInput {
  type: string
  topic: string
  requirements: Record<string, any>
  metadata: Record<string, any>
}

export interface ContentOutput {
  id: string
  content: any
  metadata: Record<string, any>
  version: string
  stages: PipelineStage[]
}

export interface PipelineStage {
  id: string
  type: StageType
  status: StageStatus
  input: any
  output: any
  metadata: Record<string, any>
  createdAt: Date
  completedAt?: Date
}

export type StageType = 
  | "research"
  | "outline"
  | "draft"
  | "edit"
  | "format"
  | "review"

export enum StageStatus {
  pending = "pending",
  in_progress = "in_progress",
  completed = "completed",
  failed = "failed"
}

export interface ContentTemplate {
  id: string
  name: string
  type: string
  structure: Record<string, any>
  variables: string[]
  rules: Record<string, any>
}

export interface Version {
  id: string
  contentId: string
  version: string
  content: any
  metadata: Record<string, any>
  createdAt: Date
  createdBy: string
}

export interface VersionDiff {
  added: any[]
  removed: any[]
  modified: any[]
  metadata: Record<string, any>
}

export interface PublicationStyle {
  id: string
  name: string
  rules: Record<string, any>
  templates: Record<string, any>
}

export interface StyleGuide {
  id: string
  name: string
  rules: Record<string, any>
  examples: Record<string, any>
}

export interface Content {
  id: string
  type: string
  content: any
  metadata: Record<string, any>
  version: string
  status: string
  createdAt: Date
  updatedAt: Date
} 