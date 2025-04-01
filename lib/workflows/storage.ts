import { PrismaClient } from '@prisma/client'
import { WorkflowDefinition } from './definitions'

const prisma = new PrismaClient()

export class WorkflowStorage {
  async create(workflow: WorkflowDefinition) {
    const status = await prisma.workflowStatus.create({
      data: {
        status: 'idle',
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      }
    })

    return prisma.workflow.create({
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        steps: workflow.steps,
        variables: workflow.variables,
        metadata: workflow.metadata,
        statusId: status.id
      }
    })
  }

  async findById(id: string) {
    return prisma.workflow.findUnique({
      where: { id },
      include: {
        status: true,
        executions: {
          include: {
            steps: true
          }
        }
      }
    })
  }

  async findAll() {
    return prisma.workflow.findMany({
      include: {
        status: true
      }
    })
  }

  async update(id: string, workflow: Partial<WorkflowDefinition>) {
    return prisma.workflow.update({
      where: { id },
      data: {
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        steps: workflow.steps,
        variables: workflow.variables,
        metadata: workflow.metadata
      }
    })
  }

  async delete(id: string) {
    return prisma.workflow.delete({
      where: { id }
    })
  }

  async updateStatus(id: string, status: string, schedule?: any) {
    return prisma.workflowStatus.update({
      where: { workflowId: id },
      data: {
        status,
        schedule
      }
    })
  }

  async createExecution(workflowId: string, variables: any) {
    return prisma.workflowExecution.create({
      data: {
        workflowId,
        status: 'running',
        variables,
        results: {}
      }
    })
  }

  async updateExecution(executionId: string, results: any, error?: string) {
    return prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: error ? 'failed' : 'completed',
        results,
        error,
        completedAt: new Date()
      }
    })
  }

  async createExecutionStep(
    executionId: string,
    stepId: string,
    type: string,
    name: string,
    input: any
  ) {
    return prisma.workflowExecutionStep.create({
      data: {
        executionId,
        stepId,
        type,
        name,
        status: 'running',
        input
      }
    })
  }

  async updateExecutionStep(
    stepId: string,
    output?: any,
    error?: string
  ) {
    return prisma.workflowExecutionStep.update({
      where: { id: stepId },
      data: {
        status: error ? 'failed' : 'completed',
        output,
        error,
        completedAt: new Date()
      }
    })
  }
} 