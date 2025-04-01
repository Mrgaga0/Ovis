import { IContextMessage } from '../context-manager';

export interface IPromptTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface IPromptEngineer {
  generatePrompt(
    template: IPromptTemplate,
    context: IContextMessage[],
    variables?: Record<string, string>
  ): string;
  validatePrompt(prompt: string): boolean;
  optimizePrompt(prompt: string): string;
}

export class PromptEngineer implements IPromptEngineer {
  private static instance: PromptEngineer;
  private templates: Map<string, IPromptTemplate>;

  private constructor() {
    this.templates = new Map();
  }

  public static getInstance(): PromptEngineer {
    if (!PromptEngineer.instance) {
      PromptEngineer.instance = new PromptEngineer();
    }
    return PromptEngineer.instance;
  }

  public registerTemplate(template: IPromptTemplate): void {
    this.templates.set(template.name, template);
  }

  public getTemplate(name: string): IPromptTemplate | null {
    return this.templates.get(name) || null;
  }

  public generatePrompt(
    template: IPromptTemplate,
    context: IContextMessage[],
    variables: Record<string, string> = {}
  ): string {
    let prompt = template.systemPrompt + '\n\n';

    // 컨텍스트 메시지 추가
    if (context.length > 0) {
      prompt += 'Previous conversation:\n';
      context.forEach(msg => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    // 사용자 프롬프트 추가
    let userPrompt = template.userPrompt;
    Object.entries(variables).forEach(([key, value]) => {
      userPrompt = userPrompt.replace(`{{${key}}}`, value);
    });
    prompt += userPrompt;

    return this.optimizePrompt(prompt);
  }

  public validatePrompt(prompt: string): boolean {
    // 기본적인 유효성 검사
    if (!prompt || prompt.trim().length === 0) {
      return false;
    }

    // 최대 길이 검사 (예: 8000 토큰)
    if (prompt.length > 8000) {
      return false;
    }

    // 위험한 문자열 검사
    const dangerousPatterns = [
      /<script>/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(prompt));
  }

  public optimizePrompt(prompt: string): string {
    if (!this.validatePrompt(prompt)) {
      throw new Error('Invalid prompt');
    }

    // 불필요한 공백 제거
    prompt = prompt.replace(/\s+/g, ' ').trim();

    // 중복된 줄바꿈 제거
    prompt = prompt.replace(/\n{3,}/g, '\n\n');

    // 마지막 줄바꿈 제거
    prompt = prompt.replace(/\n$/, '');

    return prompt;
  }

  public listTemplates(): IPromptTemplate[] {
    return Array.from(this.templates.values());
  }

  public deleteTemplate(name: string): boolean {
    return this.templates.delete(name);
  }

  public updateTemplate(name: string, template: Partial<IPromptTemplate>): void {
    const existingTemplate = this.templates.get(name);
    if (!existingTemplate) {
      throw new Error(`Template not found: ${name}`);
    }

    this.templates.set(name, {
      ...existingTemplate,
      ...template,
    });
  }
} 