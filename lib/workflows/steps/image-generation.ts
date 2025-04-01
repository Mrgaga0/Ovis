import { StepDefinition } from '../definitions'
import { ExecutionContext } from '../engine'

interface ImageGenerationConfig {
  prompt: string
  width?: number
  height?: number
  model?: string
  style?: string
}

export class ImageGenerationStep {
  async execute(step: StepDefinition, context: ExecutionContext): Promise<string> {
    const config = step.config as ImageGenerationConfig

    if (!config.prompt) {
      throw new Error('프롬프트가 필요합니다.')
    }

    // TODO: 실제 이미지 생성 AI 모델 연동
    // 현재는 더미 URL 반환
    return `https://example.com/generated-image-${Date.now()}.png`
  }
} 