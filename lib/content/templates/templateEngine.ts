import { ContentTemplate } from '../types'

export class TemplateEngine {
  private template: ContentTemplate

  constructor(template: ContentTemplate) {
    this.template = template
  }

  validateContent(content: any): boolean {
    for (const [key, rule] of Object.entries(this.template.rules)) {
      if (rule.required && !content[key]) {
        return false
      }

      if (content[key]) {
        if (rule.maxLength && content[key].length > rule.maxLength) {
          return false
        }

        if (rule.minLength && content[key].length < rule.minLength) {
          return false
        }

        if (Array.isArray(content[key])) {
          if (rule.maxCount && content[key].length > rule.maxCount) {
            return false
          }

          if (rule.minCount && content[key].length < rule.minCount) {
            return false
          }
        }
      }
    }

    return true
  }

  render(content: any): any {
    if (!this.validateContent(content)) {
      throw new Error('Content validation failed')
    }

    const result = { ...this.template.structure }

    for (const variable of this.template.variables) {
      const value = this.getNestedValue(content, variable)
      if (value !== undefined) {
        this.setNestedValue(result, variable, value)
      }
    }

    return result
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {}
      }
      return current[key]
    }, obj)
    target[lastKey] = value
  }

  getVariables(): string[] {
    return this.template.variables
  }

  getRules(): Record<string, any> {
    return this.template.rules
  }
} 