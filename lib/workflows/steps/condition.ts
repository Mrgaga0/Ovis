import { StepDefinition } from '../definitions'
import { ExecutionContext } from '../engine'

interface ConditionConfig {
  expression: string
  trueStepId?: string
  falseStepId?: string
}

export class ConditionStep {
  async execute(step: StepDefinition, context: ExecutionContext): Promise<boolean> {
    const config = step.config as ConditionConfig

    if (!config.expression) {
      throw new Error('조건식이 필요합니다.')
    }

    // TODO: 실제 조건식 평가 로직 구현
    // 현재는 더미 평가
    const result = this.evaluateExpression(config.expression, context)

    // 다음 단계 설정
    if (result) {
      step.next = config.trueStepId ? [config.trueStepId] : []
    } else {
      step.next = config.falseStepId ? [config.falseStepId] : []
    }

    return result
  }

  private evaluateExpression(expression: string, context: ExecutionContext): boolean {
    // TODO: 실제 조건식 평가 로직 구현
    // 현재는 더미 평가
    return true
  }
} 