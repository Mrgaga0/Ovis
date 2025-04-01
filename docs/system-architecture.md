# Ovis AI Agent 시스템 아키텍처

## 1. 개요

Ovis AI Agent는 Gemini 2.0 Flash 모델을 기반으로 한 AI 어시스턴트 시스템입니다. 이 문서는 시스템의 주요 구성 요소와 구현 방법을 설명합니다.

## 2. 시스템 구성

### 2.1 AI 서비스 레이어 (`/services/ai/gemini.ts`)

- Gemini API와의 통신을 담당
- 응답 생성 및 스트리밍 처리
- 에러 처리 및 재시도 로직
- 설정 관리

### 2.2 컨텍스트 관리 시스템 (`/lib/context-manager/index.ts`)

- 대화 컨텍스트 관리
- 메시지 히스토리 유지
- 토큰 사용량 추적
- 컨텍스트 정리 및 최적화

### 2.3 프롬프트 엔지니어링 시스템 (`/lib/prompts/index.ts`)

- 프롬프트 템플릿 관리
- 동적 프롬프트 생성
- 프롬프트 최적화
- 유효성 검사

### 2.4 프롬프트 템플릿 (`/lib/prompts/templates/`)

- 기본 대화 템플릿
- 코드 생성 템플릿
- 문제 해결 템플릿

## 3. 구현 세부사항

### 3.1 API 키 설정

1. 환경 변수 설정
```env
GEMINI_API_KEY=your_api_key_here
```

2. API 키 검증
- API 키 유효성 검사
- 키 만료 관리
- 보안 처리

### 3.2 프롬프트 엔지니어링 전략

1. 시스템 프롬프트
- 역할 정의
- 응답 지침
- 제약 조건

2. 사용자 프롬프트
- 변수 치환
- 컨텍스트 통합
- 최적화

### 3.3 응답 처리

1. 스트리밍 응답
- 청크 단위 처리
- 진행률 표시
- 에러 처리

2. 응답 포맷팅
- 마크다운 변환
- 코드 하이라이팅
- 이미지 처리

### 3.4 성능 최적화

1. 컨텍스트 관리
- 메시지 제한
- 토큰 제한
- 캐싱

2. 프롬프트 최적화
- 불필요한 공백 제거
- 중복 제거
- 길이 제한

### 3.5 컨텍스트 관리

1. 메시지 저장
- 구조화된 데이터
- 타임스탬프
- 메타데이터

2. 컨텍스트 정리
- 오래된 메시지 제거
- 토큰 사용량 관리
- 메모리 최적화

## 4. 사용 방법

### 4.1 기본 사용

```typescript
import { GeminiService } from '@/services/ai/gemini';
import { ContextManager } from '@/lib/context-manager';
import { PromptEngineer } from '@/lib/prompts';

// 서비스 초기화
const geminiService = GeminiService.getInstance();
const contextManager = ContextManager.getInstance();
const promptEngineer = PromptEngineer.getInstance();

// 컨텍스트 생성
const context = contextManager.createContext('gemini-2.0-flash');

// 프롬프트 생성
const prompt = promptEngineer.generatePrompt(
  promptEngineer.getTemplate('default'),
  context.messages,
  { userInput: '안녕하세요!' }
);

// 응답 생성
const response = await geminiService.generateResponse(prompt);
```

### 4.2 스트리밍 사용

```typescript
const stream = await geminiService.generateStreamResponse(prompt);

for await (const chunk of stream) {
  // 청크 처리
  console.log(chunk);
}
```

## 5. 에러 처리

### 5.1 API 에러

- 네트워크 오류
- 인증 오류
- 할당량 초과

### 5.2 프롬프트 에러

- 유효성 검사 실패
- 길이 초과
- 위험한 콘텐츠

### 5.3 컨텍스트 에러

- 메모리 부족
- 토큰 초과
- 데이터 손상

## 6. 보안 고려사항

1. API 키 보안
- 환경 변수 사용
- 키 로테이션
- 접근 제한

2. 데이터 보안
- 민감 정보 필터링
- 로그 관리
- 백업 정책

## 7. 모니터링 및 로깅

1. 성능 모니터링
- 응답 시간
- 토큰 사용량
- 에러율

2. 로깅
- 요청/응답 로그
- 에러 로그
- 성능 메트릭

## 8. 확장성

1. 새로운 템플릿 추가
2. 커스텀 프롬프트 엔지니어링
3. 다른 AI 모델 통합 