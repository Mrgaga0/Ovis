import { WorkflowDefinition, StepDefinition } from './definitions'
import { StepExecutor } from './steps/executor'

export interface ExecutionContext {
  workflowId: string
  variables: Record<string, any>
  stepResults: Record<string, any>
  currentStepId?: string
  error?: Error
}

export interface ExecutionResult {
  success: boolean
  context: ExecutionContext
  error?: Error
}

export class WorkflowEngine {
  private context: ExecutionContext
  private stepExecutor: StepExecutor

  constructor(workflow: WorkflowDefinition) {
    this.context = {
      workflowId: workflow.id,
      variables: { ...workflow.variables },
      stepResults: {}
    }
    this.stepExecutor = new StepExecutor()
  }

  async execute(): Promise<ExecutionResult> {
    try {
      const startStep = this.getStartStep()
      if (!startStep) {
        throw new Error('시작 단계를 찾을 수 없습니다.')
      }

      await this.executeStep(startStep)
      return {
        success: true,
        context: this.context
      }
    } catch (error) {
      return {
        success: false,
        context: this.context,
        error: error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다.')
      }
    }
  }

  private getStartStep(): StepDefinition | undefined {
    // 시작 단계는 다른 단계에서 참조되지 않는 첫 번째 단계
    const referencedSteps = new Set<string>()
    
    for (const step of this.context.workflow.steps) {
      if (step.next) {
        step.next.forEach(nextId => referencedSteps.add(nextId))
      }
    }

    return this.context.workflow.steps.find(step => !referencedSteps.has(step.id))
  }

  private async executeStep(step: StepDefinition): Promise<void> {
    this.context.currentStepId = step.id

    try {
      const result = await this.stepExecutor.execute(step, this.context)
      this.context.stepResults[step.id] = result

      if (step.next) {
        for (const nextStepId of step.next) {
          const nextStep = this.context.workflow.steps.find(s => s.id === nextStepId)
          if (nextStep) {
            await this.executeStep(nextStep)
          }
        }
      }
    } catch (error) {
      step.error = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      throw error
    }
  }

  getContext(): ExecutionContext {
    return { ...this.context }
  }

  getStepResult(stepId: string): any {
    return this.context.stepResults[stepId]
  }

  getVariable(name: string): any {
    return this.context.variables[name]
  }

  setVariable(name: string, value: any): void {
    this.context.variables[name] = value
  }
} 