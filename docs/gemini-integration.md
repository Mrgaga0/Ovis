# Gemini API 통합 가이드

## 1. 개요

이 문서는 Google의 Gemini 2.0 Flash 모델을 Ovis AI Agent에 통합하는 방법을 설명합니다.

## 2. API 설정

### 2.1 환경 변수 설정

```env
# .env 파일
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.0-flash
GEMINI_MAX_TOKENS=8000
GEMINI_TEMPERATURE=0.7
```

### 2.2 API 클라이언트 설정

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });
```

## 3. API 호출

### 3.1 기본 응답 생성

```typescript
async function generateResponse(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API 호출 실패:', error);
    throw error;
  }
}
```

### 3.2 스트리밍 응답

```typescript
async function generateStreamResponse(prompt: string) {
  try {
    const result = await model.generateContentStream(prompt);
    return result;
  } catch (error) {
    console.error('Gemini 스트리밍 API 호출 실패:', error);
    throw error;
  }
}
```

## 4. 에러 처리

### 4.1 API 에러

```typescript
interface IGeminiError {
  code: number;
  message: string;
  status: string;
}

function handleApiError(error: any): never {
  if (error.response) {
    const apiError: IGeminiError = error.response.data;
    throw new Error(`Gemini API 에러: ${apiError.message}`);
  }
  throw error;
}
```

### 4.2 재시도 로직

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError!;
}
```

## 5. 응답 처리

### 5.1 응답 포맷팅

```typescript
interface IGeminiResponse {
  text: string;
  metadata: {
    tokens: number;
    processingTime: number;
    model: string;
  };
}

function formatResponse(response: string): IGeminiResponse {
  return {
    text: response,
    metadata: {
      tokens: estimateTokens(response),
      processingTime: Date.now(),
      model: process.env.GEMINI_MODEL!
    }
  };
}
```

### 5.2 토큰 추정

```typescript
function estimateTokens(text: string): number {
  // 간단한 토큰 추정 (실제로는 더 정교한 방법 사용)
  return Math.ceil(text.length / 4);
}
```

## 6. 성능 최적화

### 6.1 요청 배치 처리

```typescript
async function batchGenerateResponses(prompts: string[]) {
  const results = await Promise.all(
    prompts.map(prompt => generateResponse(prompt))
  );
  return results;
}
```

### 6.2 응답 캐싱

```typescript
class ResponseCache {
  private cache: Map<string, IGeminiResponse>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): IGeminiResponse | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: IGeminiResponse): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

## 7. 모니터링

### 7.1 성능 메트릭

```typescript
interface IMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageLatency: number;
  totalTokens: number;
}

class MetricsCollector {
  private metrics: IMetrics;

  constructor() {
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageLatency: 0,
      totalTokens: 0
    };
  }

  recordRequest(latency: number, tokens: number, success: boolean): void {
    this.metrics.requestCount++;
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.requestCount - 1) + latency) 
      / this.metrics.requestCount;
    this.metrics.totalTokens += tokens;
  }
}
```

### 7.2 로깅

```typescript
interface ILogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
}

class Logger {
  private logs: ILogEntry[];

  constructor() {
    this.logs = [];
  }

  log(level: ILogEntry['level'], message: string, metadata?: any): void {
    const entry: ILogEntry = {
      timestamp: Date.now(),
      level,
      message,
      metadata
    };
    this.logs.push(entry);
    console.log(JSON.stringify(entry));
  }
}
```

## 8. 보안

### 8.1 API 키 관리

```typescript
class ApiKeyManager {
  private apiKey: string;
  private rotationInterval: number;

  constructor(rotationInterval: number = 24 * 60 * 60 * 1000) {
    this.apiKey = process.env.GEMINI_API_KEY!;
    this.rotationInterval = rotationInterval;
    this.startRotation();
  }

  private startRotation(): void {
    setInterval(() => {
      this.rotateApiKey();
    }, this.rotationInterval);
  }

  private async rotateApiKey(): Promise<void> {
    // API 키 로테이션 로직
  }

  getApiKey(): string {
    return this.apiKey;
  }
}
```

### 8.2 요청 검증

```typescript
function validateRequest(prompt: string): boolean {
  // 길이 검증
  if (prompt.length > 8000) {
    return false;
  }

  // 위험한 패턴 검증
  const dangerousPatterns = [
    /<script>/i,
    /eval\s*\(/i,
    /Function\s*\(/i
  ];

  return !dangerousPatterns.some(pattern => pattern.test(prompt));
}
```

## 9. 테스트

### 9.1 단위 테스트

```typescript
describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService();
  });

  test('응답 생성', async () => {
    const response = await service.generateResponse('안녕하세요');
    expect(response).toBeDefined();
    expect(response.text).toBeTruthy();
  });

  test('에러 처리', async () => {
    await expect(
      service.generateResponse('')
    ).rejects.toThrow('Invalid prompt');
  });
});
```

### 9.2 성능 테스트

```typescript
async function performanceTest() {
  const service = new GeminiService();
  const startTime = Date.now();
  
  const responses = await Promise.all(
    Array(10).fill('테스트 프롬프트').map(prompt => 
      service.generateResponse(prompt)
    )
  );
  
  const endTime = Date.now();
  const averageLatency = (endTime - startTime) / 10;
  
  console.log(`평균 지연 시간: ${averageLatency}ms`);
}
``` 