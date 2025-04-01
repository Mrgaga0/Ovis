import { EventEmitter } from 'events';
import { 
  Article, 
  ContentTransformOptions, 
  PublishingEventType, 
  PublishingManagerOptions, 
  PublishingPlatform, 
  PublishingPlatformType, 
  PublishResult, 
  PublishSchedule,
  PublishStatus,
  PublishProgressUpdate,
  TransformedContent 
} from './types';
import { BasePlatform } from './platforms/BasePlatform';
import { WordPress } from './platforms/WordPress';
import { ContentTransformer } from './transforms/ContentTransformer';
import { ImageTransformer } from './transforms/ImageTransformer';

/**
 * 퍼블리싱 관리자 클래스
 * 플랫폼 관리, 발행 스케줄 관리, 발행 실행 기능 담당
 */
export class PublishingManager extends EventEmitter {
  private platforms: Map<string, BasePlatform> = new Map();
  private schedules: Map<string, PublishSchedule> = new Map();
  private contentTransformer: ContentTransformer;
  private imageTransformer: ImageTransformer;
  private options: PublishingManagerOptions;
  private isRunning: boolean = false;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private activeJobs: Set<string> = new Set();
  
  /**
   * 퍼블리싱 관리자 생성자
   * @param options 관리자 옵션
   */
  constructor(options: PublishingManagerOptions = {}) {
    super();
    
    // 옵션 설정 (기본값 적용)
    this.options = {
      maxConcurrentJobs: options.maxConcurrentJobs || 3,
      retryDelay: options.retryDelay || 5 * 60 * 1000, // 5분
      maxRetries: options.maxRetries || 3,
      schedulingInterval: options.schedulingInterval || 60 * 1000, // 1분
      defaultTransformOptions: options.defaultTransformOptions || {},
      analyticsRefreshInterval: options.analyticsRefreshInterval || 12 * 60 * 60 * 1000, // 12시간
      enableNotifications: options.enableNotifications !== undefined ? options.enableNotifications : true,
      errorHandling: options.errorHandling || 'lenient',
      debugMode: options.debugMode || false
    };
    
    // 변환기 초기화
    this.imageTransformer = new ImageTransformer();
    this.contentTransformer = new ContentTransformer(this.imageTransformer);
    
    // 디버그 모드일 경우 추가 로깅
    if (this.options.debugMode) {
      this.on(PublishingEventType.PUBLISH_STARTED, (data) => {
        console.log(`[Publishing] 발행 시작: ${data.articleId} -> ${data.platformId}`);
      });
      
      this.on(PublishingEventType.PUBLISH_COMPLETED, (data) => {
        console.log(`[Publishing] 발행 완료: ${data.articleId} -> ${data.platformId}, URL: ${data.publishedUrl}`);
      });
      
      this.on(PublishingEventType.PUBLISH_FAILED, (data) => {
        console.log(`[Publishing] 발행 실패: ${data.articleId} -> ${data.platformId}, 오류: ${data.errorMessage}`);
      });
    }
  }
  
  /**
   * 플랫폼 등록 및 관리
   */
  
  /**
   * 새 플랫폼 추가
   * @param platform 플랫폼 정보
   * @returns 추가된 플랫폼 ID
   */
  addPlatform(platform: PublishingPlatform): string {
    const platformInstance = this.createPlatformInstance(platform);
    this.platforms.set(platform.id, platformInstance);
    return platform.id;
  }
  
  /**
   * 플랫폼 가져오기
   * @param platformId 플랫폼 ID
   * @returns 플랫폼 인스턴스
   */
  getPlatform(platformId: string): BasePlatform | undefined {
    return this.platforms.get(platformId);
  }
  
  /**
   * 플랫폼 목록 가져오기
   * @returns 등록된 모든 플랫폼 인스턴스
   */
  getPlatforms(): BasePlatform[] {
    return Array.from(this.platforms.values());
  }
  
  /**
   * 플랫폼 업데이트
   * @param platform 갱신할 플랫폼 정보
   * @returns 성공 여부
   */
  updatePlatform(platform: PublishingPlatform): boolean {
    if (!this.platforms.has(platform.id)) {
      return false;
    }
    
    // 새 인스턴스 생성 후 교체
    const platformInstance = this.createPlatformInstance(platform);
    this.platforms.set(platform.id, platformInstance);
    return true;
  }
  
  /**
   * 플랫폼 제거
   * @param platformId 플랫폼 ID
   * @returns 성공 여부
   */
  removePlatform(platformId: string): boolean {
    return this.platforms.delete(platformId);
  }
  
  /**
   * 플랫폼 연결 테스트
   * @param platformId 플랫폼 ID
   * @returns 연결 테스트 결과
   */
  async testPlatformConnection(platformId: string): Promise<{ success: boolean; message?: string }> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      return { success: false, message: '플랫폼을 찾을 수 없습니다' };
    }
    
    try {
      return await platform.testConnection();
    } catch (error: any) {
      return { 
        success: false, 
        message: `연결 테스트 중 오류 발생: ${error.message || '알 수 없는 오류'}`
      };
    }
  }
  
  /**
   * 스케줄 관리
   */
  
  /**
   * 발행 스케줄 추가
   * @param schedule 스케줄 정보
   * @returns 추가된 스케줄 ID
   */
  addSchedule(schedule: PublishSchedule): string {
    // 누락된 필드 추가
    const newSchedule: PublishSchedule = {
      ...schedule,
      status: schedule.status || 'pending',
      createdAt: schedule.createdAt || new Date(),
      updatedAt: schedule.updatedAt || new Date(),
      retryCount: schedule.retryCount || 0,
      maxRetries: schedule.maxRetries || this.options.maxRetries
    };
    
    this.schedules.set(newSchedule.id, newSchedule);
    
    // 이벤트 발생
    this.emit(PublishingEventType.SCHEDULE_CREATED, newSchedule);
    
    return newSchedule.id;
  }
  
  /**
   * 스케줄 가져오기
   * @param scheduleId 스케줄 ID
   * @returns 스케줄 정보
   */
  getSchedule(scheduleId: string): PublishSchedule | undefined {
    return this.schedules.get(scheduleId);
  }
  
  /**
   * 모든 스케줄 가져오기
   * @returns 모든 스케줄 목록
   */
  getAllSchedules(): PublishSchedule[] {
    return Array.from(this.schedules.values());
  }
  
  /**
   * 필터링된 스케줄 가져오기
   * @param filter 필터 조건
   * @returns 필터링된 스케줄 목록
   */
  getSchedulesByFilter(filter: Partial<PublishSchedule>): PublishSchedule[] {
    return Array.from(this.schedules.values()).filter(schedule => {
      return Object.entries(filter).every(([key, value]) => {
        return (schedule as any)[key] === value;
      });
    });
  }
  
  /**
   * 스케줄 업데이트
   * @param scheduleId 스케줄 ID
   * @param updates 업데이트할 필드
   * @returns 성공 여부
   */
  updateSchedule(scheduleId: string, updates: Partial<PublishSchedule>): boolean {
    const existingSchedule = this.schedules.get(scheduleId);
    if (!existingSchedule) {
      return false;
    }
    
    const updatedSchedule: PublishSchedule = {
      ...existingSchedule,
      ...updates,
      updatedAt: new Date()
    };
    
    this.schedules.set(scheduleId, updatedSchedule);
    
    // 이벤트 발생
    this.emit(PublishingEventType.SCHEDULE_UPDATED, updatedSchedule);
    
    return true;
  }
  
  /**
   * 스케줄 삭제
   * @param scheduleId 스케줄 ID
   * @returns 성공 여부
   */
  removeSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      return false;
    }
    
    const success = this.schedules.delete(scheduleId);
    
    if (success) {
      // 이벤트 발생
      this.emit(PublishingEventType.SCHEDULE_DELETED, schedule);
    }
    
    return success;
  }
  
  /**
   * 스케줄러 시작
   */
  startScheduler(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // 즉시 한번 실행 후 주기적으로 실행
    this.processSchedules();
    
    this.schedulerInterval = setInterval(() => {
      this.processSchedules();
    }, this.options.schedulingInterval);
  }
  
  /**
   * 스케줄러 중지
   */
  stopScheduler(): void {
    if (!this.isRunning || !this.schedulerInterval) {
      return;
    }
    
    clearInterval(this.schedulerInterval);
    this.schedulerInterval = null;
    this.isRunning = false;
  }
  
  /**
   * 예약된 스케줄 처리
   */
  private async processSchedules(): Promise<void> {
    const now = new Date();
    const pendingSchedules = Array.from(this.schedules.values()).filter(schedule => {
      // 대기 상태이고 예약 시간이 현재 시간보다 이전인 스케줄만 처리
      return (
        schedule.status === 'pending' && 
        new Date(schedule.scheduledAt) <= now &&
        !this.activeJobs.has(schedule.id)
      );
    });
    
    if (pendingSchedules.length === 0) {
      return;
    }
    
    // 동시 처리 수 제한
    const availableSlots = Math.max(0, this.options.maxConcurrentJobs! - this.activeJobs.size);
    const schedulesToProcess = pendingSchedules.slice(0, availableSlots);
    
    // 각 스케줄 비동기 처리
    for (const schedule of schedulesToProcess) {
      this.executeSchedule(schedule);
    }
  }
  
  /**
   * 스케줄 즉시 실행
   * @param scheduleId 스케줄 ID
   * @returns 성공 여부
   */
  async executeScheduleNow(scheduleId: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || this.activeJobs.has(scheduleId)) {
      return false;
    }
    
    // 상태가 pending이 아니면 pending으로 변경
    if (schedule.status !== 'pending') {
      this.updateSchedule(scheduleId, { status: 'pending' });
    }
    
    // 실행
    this.executeSchedule(schedule);
    return true;
  }
  
  /**
   * 스케줄 실행
   * @param schedule 실행할 스케줄
   */
  private async executeSchedule(schedule: PublishSchedule): Promise<void> {
    this.activeJobs.add(schedule.id);
    
    // 스케줄 상태 업데이트
    this.updateSchedule(schedule.id, { status: 'processing' });
    
    try {
      // 아티클 가져오기
      const article = await this.getArticle(schedule.articleId);
      if (!article) {
        throw new Error(`아티클을 찾을 수 없습니다: ${schedule.articleId}`);
      }
      
      // 발행 결과 배열 준비
      const results: PublishResult[] = [];
      
      // 각 플랫폼에 발행
      for (const platformId of schedule.platformIds) {
        const platform = this.platforms.get(platformId);
        if (!platform) {
          results.push({
            platformId,
            scheduleId: schedule.id,
            articleId: schedule.articleId,
            status: 'failed',
            errorMessage: `등록된 플랫폼을 찾을 수 없습니다: ${platformId}`,
            errorCode: 'PLATFORM_NOT_FOUND'
          });
          continue;
        }
        
        try {
          // 발행 시작 이벤트
          this.emit(PublishingEventType.PUBLISH_STARTED, {
            scheduleId: schedule.id,
            articleId: article.id,
            platformId
          });
          
          // 진행 상태 업데이트 - 변환 준비
          this.updateProgress(schedule.id, platformId, 10, 'preparing', '콘텐츠 준비 중...');
          
          // 콘텐츠 변환
          this.updateProgress(schedule.id, platformId, 30, 'transforming', '콘텐츠 변환 중...');
          const transformedContent = await this.transformContent(
            article, 
            platform, 
            schedule.transformOptions
          );
          
          // 발행 실행
          this.updateProgress(schedule.id, platformId, 60, 'publishing', '플랫폼에 발행 중...');
          const result = await platform.publish(article, transformedContent, {
            platform: platform['platform'], // BasePlatform에서 protected field 접근
            ...this.options.defaultTransformOptions,
            ...schedule.transformOptions
          });
          
          // 발행 결과 저장 및 이벤트 발생
          result.scheduleId = schedule.id;
          results.push(result);
          
          if (result.status === 'success') {
            this.updateProgress(schedule.id, platformId, 100, 'verifying', '발행 완료!');
            this.emit(PublishingEventType.PUBLISH_COMPLETED, {
              scheduleId: schedule.id,
              articleId: article.id,
              platformId,
              publishedUrl: result.publishedUrl,
              platform: platform['platform'] // BasePlatform에서 protected field 접근
            });
          } else {
            this.emit(PublishingEventType.PUBLISH_FAILED, {
              scheduleId: schedule.id,
              articleId: article.id,
              platformId,
              errorMessage: result.errorMessage,
              errorCode: result.errorCode,
              platform: platform['platform'] // BasePlatform에서 protected field 접근
            });
          }
        } catch (error: any) {
          // 플랫폼별 발행 중 오류 발생
          const errorMessage = error.message || '알 수 없는 오류';
          
          results.push({
            platformId,
            scheduleId: schedule.id,
            articleId: schedule.articleId,
            status: 'failed',
            errorMessage,
            errorCode: 'PUBLISH_ERROR'
          });
          
          this.emit(PublishingEventType.PUBLISH_FAILED, {
            scheduleId: schedule.id,
            articleId: article.id,
            platformId,
            errorMessage,
            errorCode: 'PUBLISH_ERROR',
            platform: platform['platform'] // BasePlatform에서 protected field 접근
          });
        }
      }
      
      // 모든 플랫폼 발행 완료 후 전체 스케줄 상태 업데이트
      const allSuccess = results.every(result => result.status === 'success');
      const allFailed = results.every(result => result.status === 'failed');
      
      let finalStatus: PublishStatus = 'completed';
      if (allFailed) {
        finalStatus = 'failed';
      } else if (!allSuccess) {
        // 일부 실패인 경우, 재시도 가능 여부 확인
        const canRetry = schedule.retryCount! < schedule.maxRetries!;
        if (canRetry) {
          // 일정 시간 후 재시도하도록 스케줄 업데이트
          const nextRetryAt = new Date(Date.now() + this.options.retryDelay!);
          this.updateSchedule(schedule.id, {
            status: 'pending',
            retryCount: (schedule.retryCount || 0) + 1,
            scheduledAt: nextRetryAt,
            results
          });
          
          // 스케줄 처리 완료
          this.activeJobs.delete(schedule.id);
          return;
        } else {
          finalStatus = 'failed';
        }
      }
      
      // 최종 상태 업데이트
      this.updateSchedule(schedule.id, {
        status: finalStatus,
        completedAt: new Date(),
        results
      });
      
    } catch (error: any) {
      // 전체 스케줄 처리 중 오류
      console.error(`스케줄 실행 중 오류 발생 (ID: ${schedule.id}):`, error);
      
      this.updateSchedule(schedule.id, {
        status: 'failed',
        results: [{
          platformId: 'system',
          scheduleId: schedule.id,
          articleId: schedule.articleId,
          status: 'failed',
          errorMessage: error.message || '알 수 없는 오류',
          errorCode: 'SCHEDULE_ERROR'
        }]
      });
    } finally {
      // 작업 완료 표시
      this.activeJobs.delete(schedule.id);
    }
  }
  
  /**
   * 콘텐츠 변환
   * @param article 아티클
   * @param platform 플랫폼
   * @param options 변환 옵션
   * @returns 변환된 콘텐츠
   */
  private async transformContent(
    article: Article,
    platform: BasePlatform,
    options?: ContentTransformOptions
  ): Promise<TransformedContent> {
    // 플랫폼 정보 가져오기 (protected 필드 접근을 위한 트릭)
    const platformInfo = (platform as any).platform as PublishingPlatform;
    
    // 변환 옵션 준비
    const transformOptions: ContentTransformOptions = {
      platform: platformInfo,
      ...this.options.defaultTransformOptions,
      ...options
    };
    
    // 콘텐츠 변환 실행
    return this.contentTransformer.transform(article, transformOptions);
  }
  
  /**
   * 플랫폼별 발행 진행 상태 업데이트
   */
  private updateProgress(
    scheduleId: string,
    platformId: string,
    progress: number,
    stage: PublishProgressUpdate['stage'],
    message?: string
  ): void {
    const update: PublishProgressUpdate = {
      scheduleId,
      platformId,
      progress,
      stage,
      message
    };
    
    // 이벤트 발생
    this.emit(PublishingEventType.PUBLISH_PROGRESS, update);
  }
  
  /**
   * 아티클 가져오기 (실제 구현에서는 DB 또는 API에서 가져옴)
   * @param articleId 아티클 ID
   * @returns 아티클 정보
   */
  private async getArticle(articleId: string): Promise<Article | null> {
    // 실제 구현에서는 DB 또는 API에서 아티클 정보를 가져옴
    // 여기서는 임시 목업 구현
    
    // 실제 프로젝트에서는 이 부분을 교체해야 함
    return {
      id: articleId,
      title: '샘플 아티클',
      content: '<p>이것은 테스트 콘텐츠입니다.</p>',
      author: {
        id: 'user1',
        name: '테스트 사용자'
      },
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * 플랫폼 타입에 맞는 인스턴스 생성
   * @param platform 플랫폼 정보
   * @returns 플랫폼 구현체 인스턴스
   */
  private createPlatformInstance(platform: PublishingPlatform): BasePlatform {
    switch (platform.type) {
      case 'wordpress':
        return new WordPress(platform);
      
      // 다른 플랫폼들은 실제 구현 시 추가
      // case 'medium':
      //   return new Medium(platform);
      
      // case 'dev.to':
      //   return new DevTo(platform);
      
      // case 'hashnode':
      //   return new Hashnode(platform);
      
      default:
        // 기본적으로 WordPress로 처리 (실제 구현에서는 CustomPlatform 등으로 처리)
        return new WordPress(platform);
    }
  }
} 