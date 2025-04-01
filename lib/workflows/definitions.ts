export type StepType = 
  | 'text_generation'
  | 'image_generation'
  | 'condition'
  | 'loop'
  | 'variable_set'
  | 'api_call'
  | 'data_transform'

export interface StepDefinition {
  id: string
  type: StepType
  name: string
  description?: string
  config: Record<string, any>
  next?: string[]
  error?: string
}

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  version: string
  steps: StepDefinition[]
  variables: Record<string, any>
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string
  }
}

export interface WorkflowValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateWorkflow(workflow: WorkflowDefinition): WorkflowValidationResult {
  const errors: string[] = []

  // 기본 유효성 검사
  if (!workflow.id) errors.push('워크플로우 ID가 필요합니다.')
  if (!workflow.name) errors.push('워크플로우 이름이 필요합니다.')
  if (!workflow.version) errors.push('워크플로우 버전이 필요합니다.')
  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('최소 하나의 단계가 필요합니다.')
  }

  // 단계 유효성 검사
  workflow.steps.forEach((step, index) => {
    if (!step.id) errors.push(`단계 ${index + 1}: ID가 필요합니다.`)
    if (!step.type) errors.push(`단계 ${index + 1}: 유형이 필요합니다.`)
    if (!step.name) errors.push(`단계 ${index + 1}: 이름이 필요합니다.`)
  })

  // 순환 참조 검사
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function checkCycle(stepId: string): boolean {
    if (recursionStack.has(stepId)) return true
    if (visited.has(stepId)) return false

    visited.add(stepId)
    recursionStack.add(stepId)

    const step = workflow.steps.find(s => s.id === stepId)
    if (!step) return false

    if (step.next) {
      for (const nextId of step.next) {
        if (checkCycle(nextId)) {
          errors.push(`순환 참조가 발견되었습니다: ${stepId} -> ${nextId}`)
          return true
        }
      }
    }

    recursionStack.delete(stepId)
    return false
  }

  // 시작 단계에서 순환 검사 시작
  const startStep = workflow.steps[0]
  if (startStep) {
    checkCycle(startStep.id)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function createWorkflow(
  name: string,
  description?: string,
  createdBy: string
): WorkflowDefinition {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    version: '1.0.0',
    steps: [],
    variables: {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy
    }
  }
}

export function addStep(
  workflow: WorkflowDefinition,
  type: StepType,
  name: string,
  config: Record<string, any>,
  description?: string
): WorkflowDefinition {
  const newStep: StepDefinition = {
    id: crypto.randomUUID(),
    type,
    name,
    description,
    config
  }

  return {
    ...workflow,
    steps: [...workflow.steps, newStep],
    metadata: {
      ...workflow.metadata,
      updatedAt: new Date().toISOString()
    }
  }
}

export function connectSteps(
  workflow: WorkflowDefinition,
  fromStepId: string,
  toStepId: string
): WorkflowDefinition {
  const steps = workflow.steps.map(step => {
    if (step.id === fromStepId) {
      return {
        ...step,
        next: [...(step.next || []), toStepId]
      }
    }
    return step
  })

  return {
    ...workflow,
    steps,
    metadata: {
      ...workflow.metadata,
      updatedAt: new Date().toISOString()
    }
  }
} 