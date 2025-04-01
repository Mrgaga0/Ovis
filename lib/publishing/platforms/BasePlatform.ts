import { Article, ContentTransformOptions, PublishingPlatform, PublishResult, TransformedContent } from '../types';

/**
 * 모든 발행 플랫폼 구현체의 기본이 되는 추상 클래스
 */
export abstract class BasePlatform {
  protected platform: PublishingPlatform;
  
  constructor(platform: PublishingPlatform) {
    this.platform = platform;
  }
  
  /**
   * 플랫폼 연결 테스트
   * @returns 연결 성공 여부와 메시지
   */
  abstract testConnection(): Promise<{ success: boolean; message?: string }>;
  
  /**
   * 아티클 발행
   * @param article 원본 아티클
   * @param transformedContent 변환된 콘텐츠
   * @param options 변환 옵션
   * @returns 발행 결과
   */
  abstract publish(
    article: Article,
    transformedContent: TransformedContent,
    options: ContentTransformOptions
  ): Promise<PublishResult>;
  
  /**
   * 플랫폼 ID 반환
   * @returns 플랫폼 ID
   */
  getPlatformId(): string {
    return this.platform.id;
  }
  
  /**
   * 플랫폼 타입 반환
   * @returns 플랫폼 타입
   */
  getPlatformType(): string {
    return this.platform.type;
  }
  
  /**
   * 플랫폼 이름 반환
   * @returns 플랫폼 이름
   */
  getPlatformName(): string {
    return this.platform.name;
  }
  
  /**
   * 플랫폼 URL 반환
   * @returns 플랫폼 URL
   */
  getPlatformUrl(): string {
    return this.platform.url;
  }
  
  /**
   * 플랫폼 연결 상태 반환
   * @returns 연결 상태
   */
  getStatus(): string {
    return this.platform.status;
  }
  
  /**
   * 플랫폼 설정 값 반환
   * @param key 설정 키
   * @param defaultValue 기본값
   * @returns 설정 값
   */
  getSetting<T>(key: string, defaultValue?: T): T | undefined {
    return this.platform.settings?.[key] as T ?? defaultValue;
  }
  
  /**
   * 발행 실패 결과 생성
   * @param articleId 아티클 ID
   * @param scheduleId 스케줄 ID
   * @param error 에러 객체
   * @returns 실패 결과
   */
  protected createFailureResult(articleId: string, scheduleId: string, error: unknown): PublishResult {
    let errorMessage = '알 수 없는 오류';
    let errorCode = 'UNKNOWN';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      const anyError = error as any;
      errorMessage = anyError.message || anyError.error || errorMessage;
      errorCode = anyError.code || anyError.status || errorCode;
    }
    
    return {
      platformId: this.platform.id,
      scheduleId,
      articleId,
      status: 'failed',
      errorMessage,
      errorCode: String(errorCode)
    };
  }
  
  /**
   * 발행 성공 결과 생성
   * @param articleId 아티클 ID
   * @param scheduleId 스케줄 ID
   * @param publishedUrl 발행된 URL
   * @param platformSpecificData 플랫폼별 데이터
   * @returns 성공 결과
   */
  protected createSuccessResult(
    articleId: string,
    scheduleId: string,
    publishedUrl: string,
    platformSpecificData?: Record<string, any>
  ): PublishResult {
    return {
      platformId: this.platform.id,
      scheduleId,
      articleId,
      status: 'success',
      publishedUrl,
      publishedAt: new Date(),
      platformData: platformSpecificData
    };
  }
} 