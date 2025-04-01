import { GoogleGenerativeAI } from '@google/generative-ai';
import { IContextMessage } from '@/lib/context-manager';

export interface IGeminiConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface IGeminiResponse {
  text: string;
  metadata: {
    tokens: number;
    processingTime: number;
    model: string;
  };
}

export class GeminiService {
  private static instance: GeminiService;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private config: IGeminiConfig;

  private constructor() {
    this.config = {
      apiKey: process.env.GEMINI_API_KEY!,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      maxTokens: 8000,
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.config.model });
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  public async generateResponse(
    prompt: string,
    context: IContextMessage[] = []
  ): Promise<IGeminiResponse> {
    try {
      const startTime = Date.now();
      
      // 컨텍스트 메시지를 프롬프트에 통합
      const fullPrompt = this.buildPromptWithContext(prompt, context);
      
      // API 호출
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        metadata: {
          tokens: this.estimateTokens(text),
          processingTime: Date.now() - startTime,
          model: this.config.model,
        },
      };
    } catch (error) {
      console.error('Gemini API 호출 실패:', error);
      throw this.handleApiError(error);
    }
  }

  public async generateStreamResponse(
    prompt: string,
    context: IContextMessage[] = []
  ): Promise<AsyncGenerator<string>> {
    try {
      const fullPrompt = this.buildPromptWithContext(prompt, context);
      const result = await this.model.generateContentStream(fullPrompt);
      return result;
    } catch (error) {
      console.error('Gemini 스트리밍 API 호출 실패:', error);
      throw this.handleApiError(error);
    }
  }

  private buildPromptWithContext(
    prompt: string,
    context: IContextMessage[]
  ): string {
    if (context.length === 0) {
      return prompt;
    }

    const contextMessages = context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `${contextMessages}\n\n${prompt}`;
  }

  private estimateTokens(text: string): number {
    // 간단한 토큰 추정 (실제로는 더 정교한 방법 사용)
    return Math.ceil(text.length / 4);
  }

  private handleApiError(error: any): Error {
    if (error.response) {
      const apiError = error.response.data;
      return new Error(`Gemini API 에러: ${apiError.message}`);
    }
    return error;
  }

  public updateConfig(config: Partial<IGeminiConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    // 모델 재초기화
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        topP: this.config.topP,
        topK: this.config.topK,
      },
    });
  }
} 