/**
 * 퍼블리싱 시스템에 필요한 타입과 인터페이스 정의
 */

/**
 * 발행 플랫폼 타입
 */
export type PublishingPlatformType = 'wordpress' | 'medium' | 'dev.to' | 'hashnode' | 'custom';

/**
 * 플랫폼 상태
 */
export type PlatformStatus = 'active' | 'inactive' | 'error' | 'connecting';

/**
 * 발행 플랫폼 인터페이스
 */
export interface PublishingPlatform {
  id: string;
  name: string;
  type: PublishingPlatformType;
  url: string;
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  status: PlatformStatus;
  lastConnected?: Date;
  connectionError?: string;
  settings?: Record<string, any>;
  iconUrl?: string;
}

/**
 * 발행 상태
 */
export type PublishStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';

/**
 * 발행 스케줄 인터페이스
 */
export interface PublishSchedule {
  id: string;
  articleId: string;
  platformIds: string[];
  scheduledAt: Date;
  status: PublishStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  userId: string;
  results?: PublishResult[];
  retryCount?: number;
  maxRetries?: number;
  transformOptions?: ContentTransformOptions;
}

/**
 * 발행 결과 인터페이스
 */
export interface PublishResult {
  id?: string;
  scheduleId: string;
  platformId: string;
  articleId: string;
  status: 'success' | 'failed';
  publishedUrl?: string;
  publishedAt?: Date;
  errorMessage?: string;
  errorCode?: string;
  retryCount?: number;
  platformData?: Record<string, any>;
  analytics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    lastUpdated?: Date;
  };
}

/**
 * 콘텐츠 변환 옵션 인터페이스
 */
export interface ContentTransformOptions {
  platform: PublishingPlatform;
  optimizeImages?: boolean;
  imageQuality?: number;
  imageMaxWidth?: number;
  imageMaxHeight?: number;
  transformLinks?: boolean;
  sanitizeHtml?: boolean;
  transformCodeBlocks?: boolean;
  codeTheme?: string;
  addWatermark?: boolean;
  addFooter?: boolean;
  footerTemplate?: string;
  includeCanonicalLink?: boolean;
  seoOptimization?: boolean;
  format?: string;
}

/**
 * 변환된 콘텐츠 인터페이스
 */
export interface TransformedContent {
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  categories?: string[];
  tags?: string[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
  metadata?: Record<string, any>;
  platformSpecific?: Record<string, any>;
}

/**
 * 아티클 인터페이스
 */
export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  author: {
    id: string;
    name: string;
    email?: string;
    profileUrl?: string;
    bio?: string;
  };
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  featuredImage?: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  images?: Array<{
    url: string;
    alt?: string;
    caption?: string;
    width?: number;
    height?: number;
  }>;
  categories?: string[];
  tags?: string[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
  metadata?: Record<string, any>;
  slug?: string;
}

/**
 * 이미지 최적화 옵션 인터페이스
 */
export interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: string;
  addWatermark?: boolean;
  watermarkText?: string;
  watermarkPosition?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';
  compress?: boolean;
  cropMode?: 'fill' | 'fit' | 'crop';
  backgroundColor?: string;
}

/**
 * 변환된 이미지 인터페이스
 */
export interface TransformedImage {
  originalUrl: string;
  transformedUrl: string;
  width: number;
  height: number;
  format?: string;
  size?: number;
}

/**
 * 발행 진행 상태 업데이트 인터페이스
 */
export interface PublishProgressUpdate {
  scheduleId: string;
  platformId: string;
  progress: number; // 0-100
  stage: 'preparing' | 'transforming' | 'uploading' | 'publishing' | 'verifying';
  message?: string;
  timeRemaining?: number; // ms
}

/**
 * 발행 관리자 옵션 인터페이스
 */
export interface PublishingManagerOptions {
  maxConcurrentJobs?: number;
  retryDelay?: number; // ms
  maxRetries?: number;
  schedulingInterval?: number; // ms
  defaultTransformOptions?: Partial<ContentTransformOptions>;
  analyticsRefreshInterval?: number; // ms
  enableNotifications?: boolean;
  errorHandling?: 'strict' | 'lenient';
  debugMode?: boolean;
}

/**
 * 발행 관련 이벤트 타입
 */
export enum PublishingEventType {
  SCHEDULE_CREATED = 'schedule_created',
  SCHEDULE_UPDATED = 'schedule_updated',
  SCHEDULE_DELETED = 'schedule_deleted',
  PUBLISH_STARTED = 'publish_started',
  PUBLISH_COMPLETED = 'publish_completed',
  PUBLISH_FAILED = 'publish_failed',
  PUBLISH_PROGRESS = 'publish_progress',
  PLATFORM_CONNECTED = 'platform_connected',
  PLATFORM_DISCONNECTED = 'platform_disconnected',
  PLATFORM_ERROR = 'platform_error'
} 