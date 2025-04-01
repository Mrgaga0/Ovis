import { StepDefinition } from '../definitions'
import { ExecutionContext } from '../engine'

interface VariableSetConfig {
  name: string
  value: any
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
}

export class VariableSetStep {
  async execute(step: StepDefinition, context: ExecutionContext): Promise<any> {
    const config = step.config as VariableSetConfig

    if (!config.name) {
      throw new Error('변수 이름이 필요합니다.')
    }

    if (config.value === undefined) {
      throw new Error('변수 값이 필요합니다.')
    }

    const value = this.validateAndTransformValue(config.value, config.type)
    context.variables[config.name] = value

    return value
  }

  private validateAndTransformValue(value: any, type?: string): any {
    if (!type) {
      return value
    }

    switch (type) {
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      case 'boolean':
        return Boolean(value)
      case 'array':
        return Array.isArray(value) ? value : [value]
      case 'object':
        return typeof value === 'object' ? value : { value }
      default:
        throw new Error(`지원되지 않는 변수 타입입니다: ${type}`)
    }
  }
} 