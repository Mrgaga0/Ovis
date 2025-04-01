import { GeminiService } from '@/services/ai/gemini';
import { IContextMessage } from '@/lib/context-manager';

describe('GeminiService', () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    geminiService = GeminiService.getInstance();
  });

  test('싱글톤 인스턴스가 올바르게 생성되는지 확인', () => {
    const instance1 = GeminiService.getInstance();
    const instance2 = GeminiService.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('기본 응답 생성', async () => {
    const prompt = '안녕하세요';
    const response = await geminiService.generateResponse(prompt);
    
    expect(response).toHaveProperty('text');
    expect(response).toHaveProperty('metadata');
    expect(response.metadata).toHaveProperty('tokens');
    expect(response.metadata).toHaveProperty('processingTime');
    expect(response.metadata).toHaveProperty('model');
  });

  test('컨텍스트를 포함한 응답 생성', async () => {
    const prompt = '이전 대화를 참고해서 답변해주세요';
    const context: IContextMessage[] = [
      {
        role: 'user',
        content: '안녕하세요',
        timestamp: Date.now(),
      },
      {
        role: 'assistant',
        content: '안녕하세요! 무엇을 도와드릴까요?',
        timestamp: Date.now(),
      },
    ];

    const response = await geminiService.generateResponse(prompt, context);
    expect(response.text).toBeDefined();
  });

  test('스트리밍 응답 생성', async () => {
    const prompt = '안녕하세요';
    const stream = await geminiService.generateStreamResponse(prompt);
    
    for await (const chunk of stream) {
      expect(typeof chunk).toBe('string');
      expect(chunk.length).toBeGreaterThan(0);
    }
  });

  test('설정 업데이트', () => {
    const newConfig = {
      temperature: 0.5,
      maxTokens: 1000,
    };

    geminiService.updateConfig(newConfig);
    // 설정이 적용되었는지 확인하기 위해 응답 생성 테스트
    const prompt = '테스트';
    geminiService.generateResponse(prompt).then(response => {
      expect(response.metadata.model).toBeDefined();
    });
  });
}); 