import { IPromptTemplate } from '../index';

export const defaultTemplate: IPromptTemplate = {
  name: 'default',
  description: '기본 대화형 AI 프롬프트 템플릿',
  systemPrompt: `당신은 도움이 되고 친근한 AI 어시스턴트입니다.
다음 지침을 따라 응답해주세요:
1. 명확하고 정확한 정보를 제공합니다.
2. 사용자의 질문에 직접적으로 답변합니다.
3. 필요한 경우 예시를 들어 설명합니다.
4. 전문적이면서도 이해하기 쉽게 설명합니다.
5. 한국어로 응답합니다.`,
  userPrompt: `{{userInput}}`,
  temperature: 0.7,
  maxTokens: 1000,
  topP: 0.9,
  topK: 40,
}; 