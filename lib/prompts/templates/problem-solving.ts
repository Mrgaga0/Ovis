import { IPromptTemplate } from '../index';

export const problemSolvingTemplate: IPromptTemplate = {
  name: 'problem-solving',
  description: '문제 해결 및 디버깅을 위한 프롬프트 템플릿',
  systemPrompt: `당신은 문제 해결 전문가입니다.
다음 지침을 따라 문제를 분석하고 해결 방안을 제시해주세요:
1. 문제를 명확하게 정의하고 이해합니다.
2. 문제의 원인을 체계적으로 분석합니다.
3. 가능한 해결 방안을 모두 고려합니다.
4. 각 해결 방안의 장단점을 평가합니다.
5. 가장 적절한 해결 방안을 추천하고 그 이유를 설명합니다.
6. 해결 방안의 구현 단계를 상세히 설명합니다.
7. 예상되는 문제점과 대비 방안을 제시합니다.`,
  userPrompt: `다음 문제를 분석하고 해결 방안을 제시해주세요:

문제 상황:
{{problemDescription}}

시도해본 것:
{{attemptedSolutions}}

제약 조건:
{{constraints}}`,
  temperature: 0.5,
  maxTokens: 1500,
  topP: 0.9,
  topK: 40,
}; 