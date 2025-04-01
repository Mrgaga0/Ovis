import { StepDefinition } from '../definitions'
import { ExecutionContext } from '../engine'
import { TextGenerationStep } from './text-generation'
import { ImageGenerationStep } from './image-generation'
import { ConditionStep } from './condition'
import { LoopStep } from './loop'
import { VariableSetStep } from './variable-set'
import { ApiCallStep } from './api-call'
import { DataTransformStep } from './data-transform'

export class StepExecutor {
  private steps = {
    text_generation: new TextGenerationStep(),
    image_generation: new ImageGenerationStep(),
    condition: new ConditionStep(),
    loop: new LoopStep(),
    variable_set: new VariableSetStep(),
    api_call: new ApiCallStep(),
    data_transform: new DataTransformStep()
  }

  async execute(step: StepDefinition, context: ExecutionContext): Promise<any> {
    const executor = this.steps[step.type]
    if (!executor) {
      throw new Error(`지원되지 않는 단계 유형입니다: ${step.type}`)
    }

    return executor.execute(step, context)
  }
} 