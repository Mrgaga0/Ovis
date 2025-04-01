import { EventEmitter } from 'events';
import { PerformanceMonitor, IPerformanceMetrics, AlertSeverity, PerformanceLogLevel } from './performance';
import { networkMonitor, NetworkMonitor, NetworkEventType, NetworkQuality, INetworkStatus } from './network';
import { defaultMonitoringConfig, IMonitoringConfig } from './config';

/**
 * 모니터링 초기화 옵션
 */
export interface IMonitoringInitOptions {
  enablePerformanceMonitoring?: boolean;
  enableNetworkMonitoring?: boolean;
  performanceLogLevel?: PerformanceLogLevel;
  networkPingEndpoint?: string;
  configOverrides?: Partial<IMonitoringConfig>;
  persistMetrics?: boolean;
}

/**
 * 모니터링 이벤트 타입
 */
export enum MonitoringEventType {
  INITIALIZED = 'monitoring:initialized',
  PERFORMANCE_ALERT = 'monitoring:performance_alert',
  NETWORK_STATUS = 'monitoring:network_status',
  RESOURCE_USAGE = 'monitoring:resource_usage'
}

/**
 * 모니터링 관리자 클래스 - 모든 모니터링 요소를 통합 관리
 */
class MonitoringManager extends EventEmitter {
  private static instance: MonitoringManager;
  private initialized: boolean = false;
  private performanceMonitor: PerformanceMonitor;
  private networkMonitor: NetworkMonitor;
  private options: IMonitoringInitOptions = {};
  
  private constructor() {
    super();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.networkMonitor = NetworkMonitor.getInstance();
  }
  
  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager();
    }
    return MonitoringManager.instance;
  }
  
  /**
   * 모니터링 시스템 초기화
   */
  public initialize(options: IMonitoringInitOptions = {}): void {
    if (this.initialized) return;
    
    this.options = {
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableNetworkMonitoring: options.enableNetworkMonitoring !== false,
      performanceLogLevel: options.performanceLogLevel || PerformanceLogLevel.INFO,
      networkPingEndpoint: options.networkPingEndpoint,
      persistMetrics: options.persistMetrics || false,
      configOverrides: options.configOverrides || {}
    };
    
    // 네트워크 모니터링 설정
    if (this.options.enableNetworkMonitoring) {
      if (this.options.networkPingEndpoint) {
        this.networkMonitor.setPingEndpoint(this.options.networkPingEndpoint);
      }
      
      // 네트워크 이벤트 리스너 연결
      this.networkMonitor.on(NetworkEventType.STATUS_CHANGE, (status) => {
        this.emit(MonitoringEventType.NETWORK_STATUS, status);
      });
      
      // 초기 네트워크 상태 확인
      this.networkMonitor.checkConnectionNow().catch(() => {
        // 에러는 NetworkMonitor 내부에서 처리됨
      });
    }
    
    // 성능 모니터링 설정 (구현 필요)
    if (this.options.enablePerformanceMonitoring) {
      // 이벤트 핸들러 연결 등의 설정
    }
    
    this.initialized = true;
    this.emit(MonitoringEventType.INITIALIZED, { timestamp: Date.now() });
  }
  
  /**
   * 성능 지표 기록
   */
  public recordMetric(metric: Partial<IPerformanceMetrics> & { operation: string }): void {
    if (!this.initialized || !this.options.enablePerformanceMonitoring) return;
    
    const fullMetric: IPerformanceMetrics = {
      timestamp: Date.now(),
      operation: metric.operation,
      duration: metric.duration || 0,
      tokens: metric.tokens || 0,
      success: metric.success !== undefined ? metric.success : true,
      error: metric.error,
      resourceUsage: metric.resourceUsage,
      apiDetails: metric.apiDetails,
      category: metric.category,
      tags: metric.tags
    };
    
    // 내부 구현 필요
  }
  
  /**
   * 현재 네트워크 상태 반환
   */
  public getNetworkStatus(): INetworkStatus {
    return this.networkMonitor.getStatus();
  }
  
  /**
   * 모니터링 자원 정리
   */
  public cleanup(): void {
    if (this.options.enableNetworkMonitoring) {
      this.networkMonitor.dispose();
    }
    
    // 성능 모니터링 자원 정리 (구현 필요)
    
    this.initialized = false;
    this.removeAllListeners();
  }
}

// 싱글톤 인스턴스
export const monitoringManager = MonitoringManager.getInstance();

// 클래스 내보내기
export {
  PerformanceMonitor,
  NetworkMonitor,
  NetworkEventType,
  NetworkQuality,
  AlertSeverity,
  PerformanceLogLevel,
  defaultMonitoringConfig,
};

// 타입 내보내기
export type { 
  IPerformanceMetrics,
  INetworkStatus,
  IMonitoringConfig 
};

// 함수형 API
export const initializeMonitoring = (options?: IMonitoringInitOptions): void => {
  monitoringManager.initialize(options);
};

export const recordPerformanceMetric = (metric: Partial<IPerformanceMetrics> & { operation: string }): void => {
  monitoringManager.recordMetric(metric);
};

export const getNetworkStatus = (): INetworkStatus => {
  return monitoringManager.getNetworkStatus();
};

export const cleanupMonitoring = (): void => {
  monitoringManager.cleanup();
}; 