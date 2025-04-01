import { StepDefinition } from '../definitions'
import { ExecutionContext } from '../engine'

interface TextGenerationConfig {
  prompt: string
  maxTokens?: number
  temperature?: number
  model?: string
}

export class TextGenerationStep {
  async execute(step: StepDefinition, context: ExecutionContext): Promise<string> {
    const config = step.config as TextGenerationConfig

    if (!config.prompt) {
      throw new Error('프롬프트가 필요합니다.')
    }

    // TODO: 실제 AI 모델 연동
    // 현재는 더미 응답 반환
    return `생성된 텍스트: ${config.prompt}`
  }
} 