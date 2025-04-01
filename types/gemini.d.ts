declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(config: { model: string; generationConfig?: GenerationConfig }): GenerativeModel;
  }

  export interface GenerationConfig {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
  }

  export class GenerativeModel {
    generateContent(prompt: string): Promise<GenerateContentResult>;
    generateContentStream(prompt: string): AsyncGenerator<string>;
  }

  export interface GenerateContentResult {
    response: {
      text(): string;
    };
  }
} 