import { StepDefinition } from '../definitions'
import { ExecutionContext } from '../engine'

interface LoopConfig {
  type: 'for' | 'while' | 'foreach'
  condition?: string
  maxIterations?: number
  items?: any[]
  stepId: string
}

export class LoopStep {
  async execute(step: StepDefinition, context: ExecutionContext): Promise<any[]> {
    const config = step.config as LoopConfig

    if (!config.stepId) {
      throw new Error('반복할 단계 ID가 필요합니다.')
    }

    const results: any[] = []
    let iterations = 0

    while (this.shouldContinue(config, iterations, context)) {
      // TODO: 실제 반복 단계 실행 로직 구현
      // 현재는 더미 실행
      results.push(`반복 ${iterations + 1}`)
      iterations++
    }

    return results
  }

  private shouldContinue(
    config: LoopConfig,
    iterations: number,
    context: ExecutionContext
  ): boolean {
    if (config.maxIterations && iterations >= config.maxIterations) {
      return false
    }

    switch (config.type) {
      case 'for':
        return iterations < (config.maxIterations || 10)
      case 'while':
        // TODO: 실제 조건 평가 로직 구현
        return true
      case 'foreach':
        return iterations < (config.items?.length || 0)
      default:
        return false
    }
  }
} 