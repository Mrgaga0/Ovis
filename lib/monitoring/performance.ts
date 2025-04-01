import { throttle } from '../utils/throttle';

export interface IPerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  tokens: number;
  success: boolean;
  error?: string;
  resourceUsage?: IResourceUsage;
  apiDetails?: IApiCallDetails;
  category?: string;
  tags?: string[];
}

/**
 * 리소스 사용량 지표
 */
export interface IResourceUsage {
  memoryUsage?: number; // 메모리 사용량 (MB)
  cpuUsage?: number; // CPU 사용량 (%)
  networkBandwidth?: number; // 네트워크 대역폭 사용량 (bytes)
  storageUsed?: number; // 스토리지 사용량 (bytes)
  batteryImpact?: number; // 배터리 영향도 (0-100)
}

/**
 * API 호출 세부 정보
 */
export interface IApiCallDetails {
  endpoint: string; // API 엔드포인트
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | string; // HTTP 메서드
  statusCode?: number; // 응답 상태 코드
  requestSize?: number; // 요청 크기 (bytes)
  responseSize?: number; // 응답 크기 (bytes)
  rateLimit?: { // 속도 제한 정보
    limit: number;
    remaining: number;
    reset: number;
  }
}

/**
 * 성능 알림 설정
 */
export interface IPerformanceAlertConfig {
  maxDuration: number; // 최대 허용 지속 시간 (ms)
  minSuccessRate: number; // 최소 성공률 (0-1)
  maxTokensPerOperation: number; // 작업당 최대 토큰 수
  maxMemoryUsage: number; // 최대 메모리 사용량 (MB)
  maxCpuUsage: number; // 최대 CPU 사용량 (%)
  maxNetworkBandwidth: number; // 최대 네트워크 대역폭 (bytes)
  consecutiveFailuresThreshold: number; // 연속 실패 임계값
}

/**
 * 알림 이벤트 유형
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 성능 알림 인터페이스
 */
export interface IPerformanceAlert {
  id: string;
  timestamp: number;
  operation: string;
  message: string;
  severity: AlertSeverity;
  metrics: IPerformanceMetrics;
  threshold?: number;
  actualValue?: number;
  dismissed: boolean;
}

/**
 * 새로운 성능 분석 로깅 레벨
 */
export enum PerformanceLogLevel {
  NONE = 0,
  ERROR = 1,
  WARNING = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5
}

/**
 * 성능 추적 설정 인터페이스
 */
export interface IPerformanceTrackingConfig {
  enabled: boolean;
  logLevel: PerformanceLogLevel;
  sampleRate: number; // 0.0-1.0 범위 (1.0 = 100% 측정)
  autoMeasureResourceUsage: boolean;
  maxMetricsRetention: number; // 보존할 최대 지표 수
  traceDuration: boolean;
  traceMemoryUsage: boolean;
  traceCpuUsage: boolean;
  traceNetworkUsage: boolean;
  traceApiCalls: boolean;
  exportMetricsUrl?: string; // 원격 측정 엔드포인트
}

/**
 * 성능 분석 세션 인터페이스
 */
export interface IPerformanceAnalysisSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  operations: string[];
  metrics: IPerformanceMetrics[];
  summary?: IPerformanceAnalysisSummary;
}

/**
 * 성능 분석 요약 인터페이스
 */
export interface IPerformanceAnalysisSummary {
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  totalTokens: number;
  peakMemoryUsage: number;
  peakCpuUsage: number;
  totalNetworkTransfer: number;
  apiCallsCount: number;
  apiErrorRate: number;
  alerts: number;
}

/**
 * 성능 벤치마크 결과 인터페이스
 */
export interface IPerformanceBenchmarkResult {
  benchmarkName: string;
  iterations: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  medianDuration: number;
  varianceCoefficient: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: IPerformanceMetrics[];
  private alertConfig: IPerformanceAlertConfig;
  private alerts: IPerformanceAlert[];
  private maxMetrics: number;
  private maxAlerts: number;
  private alertHandlers: ((alert: IPerformanceAlert) => void)[] = [];
  private metricHandlers: ((metric: IPerformanceMetrics) => void)[] = [];
  private consecutiveFailures: Map<string, number> = new Map();
  private operationStartTimes: Map<string, number> = new Map();
  private periodicAggregation: boolean = false;
  private aggregationIntervalId: ReturnType<typeof setInterval> | null = null;
  private aggregationInterval: number = 3600000; // 1시간마다 집계 (ms)
  private hourlyMetrics: Map<string, IPerformanceMetrics[]> = new Map();
  private trackingConfig: IPerformanceTrackingConfig;
  private currentSessions: Map<string, IPerformanceAnalysisSession> = new Map();
  private benchmarkResults: IPerformanceBenchmarkResult[] = [];
  private isCollectingResourceMetrics: boolean = false;
  private resourceCollectionIntervalId: ReturnType<typeof setInterval> | null = null;
  private periodicResourceUsage: IResourceUsage[] = [];
  private slowOperationsThresholdMs: number = 1000; // 1초 이상을 느린 작업으로 간주
  private resourceUsageHistory: { timestamp: number; usage: IResourceUsage }[] = [];
  
  private throttledMeasureResourceUsage = throttle(async () => {
    if (!this.isCollectingResourceMetrics) return;
    
    const usage = await this.measureResourceUsage();
    this.resourceUsageHistory.push({
      timestamp: Date.now(),
      usage
    });
    
    // 최대 100개만 유지
    if (this.resourceUsageHistory.length > 100) {
      this.resourceUsageHistory.shift();
    }
  }, 5000); // 5초마다 측정

  private constructor() {
    this.metrics = [];
    this.alerts = [];
    this.maxMetrics = 1000;
    this.maxAlerts = 100;
    
    // 기본 알림 설정
    this.alertConfig = {
      maxDuration: 5000, // 5초
      minSuccessRate: 0.95, // 95% 성공률
      maxTokensPerOperation: 10000, // 작업당 10K 토큰
      maxMemoryUsage: 500, // 500MB
      maxCpuUsage: 80, // 80% CPU
      maxNetworkBandwidth: 10 * 1024 * 1024, // 10MB
      consecutiveFailuresThreshold: 3 // 연속 3번 실패
    };
    
    // 기본 추적 설정
    this.trackingConfig = {
      enabled: true,
      logLevel: PerformanceLogLevel.INFO,
      sampleRate: 1.0,
      autoMeasureResourceUsage: true,
      maxMetricsRetention: 1000,
      traceDuration: true,
      traceMemoryUsage: true,
      traceCpuUsage: true,
      traceNetworkUsage: true,
      traceApiCalls: true
    };
    
    // 브라우저 환경인 경우
    if (typeof window !== 'undefined') {
      // 페이지 언로드 시 성능 데이터 저장
      window.addEventListener('beforeunload', this.saveMetricsToStorage.bind(this));
      
      // 이전에 저장된 지표 로드
      this.loadMetricsFromStorage();
      
      // 자원 사용량 측정 시작
      if (this.trackingConfig.autoMeasureResourceUsage) {
        this.startResourceUsageCollection();
      }
    }
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 작업 시작 시간 기록
   */
  public startOperation(operationId: string): void {
    this.operationStartTimes.set(operationId, performance.now());
  }

  /**
   * 작업 완료 및 지표 기록
   */
  public endOperation(
    operationId: string, 
    details: {
      operation: string;
      tokens: number;
      success: boolean;
      error?: string;
      resourceUsage?: IResourceUsage;
      apiDetails?: IApiCallDetails;
      category?: string;
      tags?: string[];
    }
  ): IPerformanceMetrics | null {
    const startTime = this.operationStartTimes.get(operationId);
    if (!startTime) {
      console.warn(`작업 ID에 대한 시작 시간을 찾을 수 없습니다: ${operationId}`);
      return null;
    }

    const duration = performance.now() - startTime;
    const metric: IPerformanceMetrics = {
      timestamp: Date.now(),
      duration,
      ...details
    };

    this.recordMetric(metric);
    this.operationStartTimes.delete(operationId);
    return metric;
  }

  /**
   * 성능 지표 기록
   */
  public recordMetric(metric: Omit<IPerformanceMetrics, 'timestamp'>): void {
    // 샘플링 레이트에 따라 측정할지 결정
    if (this.trackingConfig.sampleRate < 1.0 && Math.random() > this.trackingConfig.sampleRate) {
      return;
    }
    
    const fullMetric: IPerformanceMetrics = {
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.push(fullMetric);
    
    // 메트릭 핸들러 호출
    this.metricHandlers.forEach(handler => {
      try {
        handler(fullMetric);
      } catch (error) {
        console.error('메트릭 핸들러 실행 중 오류:', error);
      }
    });
    
    // 시간대별 지표에도 추가
    if (this.periodicAggregation) {
      const hour = new Date(fullMetric.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH 형식
      if (!this.hourlyMetrics.has(hour)) {
        this.hourlyMetrics.set(hour, []);
      }
      this.hourlyMetrics.get(hour)?.push(fullMetric);
    }
    
    // 연속 실패 추적
    if (!fullMetric.success) {
      const currentFailures = (this.consecutiveFailures.get(fullMetric.operation) || 0) + 1;
      this.consecutiveFailures.set(fullMetric.operation, currentFailures);
      
      // 연속 실패 임계값 초과 시 알림
      if (currentFailures >= this.alertConfig.consecutiveFailuresThreshold) {
        this.createAlert({
          operation: fullMetric.operation,
          message: `${fullMetric.operation} 작업이 ${currentFailures}번 연속 실패했습니다`,
          severity: AlertSeverity.ERROR,
          metrics: fullMetric,
          threshold: this.alertConfig.consecutiveFailuresThreshold,
          actualValue: currentFailures
        });
      }
    } else {
      // 성공 시 연속 실패 카운터 리셋
      this.consecutiveFailures.set(fullMetric.operation, 0);
    }
    
    // 지표 기반 알림 확인
    this.checkAlerts(fullMetric);
    
    // 오래된 지표 정리
    this.cleanupOldMetrics();
  }

  /**
   * 지표 기반 알림 확인
   */
  private checkAlerts(metric: IPerformanceMetrics): void {
    // 지속 시간 알림
    if (metric.duration > this.alertConfig.maxDuration) {
      this.createAlert({
        operation: metric.operation,
        message: `${metric.operation} 작업이 성능 임계값을 초과했습니다 (${metric.duration.toFixed(2)}ms)`,
        severity: AlertSeverity.WARNING,
        metrics: metric,
        threshold: this.alertConfig.maxDuration,
        actualValue: metric.duration
      });
    }
    
    // 토큰 사용량 알림
    if (metric.tokens > this.alertConfig.maxTokensPerOperation) {
      this.createAlert({
        operation: metric.operation,
        message: `${metric.operation} 작업이 토큰 사용량 임계값을 초과했습니다 (${metric.tokens} 토큰)`,
        severity: AlertSeverity.WARNING,
        metrics: metric,
        threshold: this.alertConfig.maxTokensPerOperation,
        actualValue: metric.tokens
      });
    }
    
    // 리소스 사용량 알림
    if (metric.resourceUsage) {
      // 메모리 사용량 알림
      if (metric.resourceUsage.memoryUsage && 
          metric.resourceUsage.memoryUsage > this.alertConfig.maxMemoryUsage) {
        this.createAlert({
          operation: metric.operation,
          message: `${metric.operation} 작업이 메모리 사용량 임계값을 초과했습니다 (${metric.resourceUsage.memoryUsage}MB)`,
          severity: AlertSeverity.WARNING,
          metrics: metric,
          threshold: this.alertConfig.maxMemoryUsage,
          actualValue: metric.resourceUsage.memoryUsage
        });
      }
      
      // CPU 사용량 알림
      if (metric.resourceUsage.cpuUsage && 
          metric.resourceUsage.cpuUsage > this.alertConfig.maxCpuUsage) {
        this.createAlert({
          operation: metric.operation,
          message: `${metric.operation} 작업이 CPU 사용량 임계값을 초과했습니다 (${metric.resourceUsage.cpuUsage}%)`,
          severity: AlertSeverity.WARNING,
          metrics: metric,
          threshold: this.alertConfig.maxCpuUsage,
          actualValue: metric.resourceUsage.cpuUsage
        });
      }
      
      // 네트워크 대역폭 알림
      if (metric.resourceUsage.networkBandwidth && 
          metric.resourceUsage.networkBandwidth > this.alertConfig.maxNetworkBandwidth) {
        this.createAlert({
          operation: metric.operation,
          message: `${metric.operation} 작업이 네트워크 대역폭 임계값을 초과했습니다 (${(metric.resourceUsage.networkBandwidth / 1024 / 1024).toFixed(2)}MB)`,
          severity: AlertSeverity.WARNING,
          metrics: metric,
          threshold: this.alertConfig.maxNetworkBandwidth,
          actualValue: metric.resourceUsage.networkBandwidth
        });
      }
    }
    
    // API 호출 알림
    if (metric.apiDetails && metric.apiDetails.statusCode && metric.apiDetails.statusCode >= 400) {
      const severity = metric.apiDetails.statusCode >= 500 ? AlertSeverity.ERROR : AlertSeverity.WARNING;
      this.createAlert({
        operation: metric.operation,
        message: `${metric.operation} API 호출이 ${metric.apiDetails.statusCode} 오류를 반환했습니다 (${metric.apiDetails.endpoint})`,
        severity,
        metrics: metric
      });
    }
  }
  
  /**
   * 알림 생성
   */
  private createAlert(alertInfo: Omit<IPerformanceAlert, 'id' | 'timestamp' | 'dismissed'>): void {
    const alert: IPerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      dismissed: false,
      ...alertInfo
    };
    
    this.alerts.push(alert);
    
    // 알림 핸들러 호출
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        console.error('알림 핸들러 실행 중 오류:', error);
      }
    });
    
    // 오래된 알림 정리
    if (this.alerts.length > this.maxAlerts) {
      // 처리된 알림부터 제거
      const dismissedAlerts = this.alerts.filter(a => a.dismissed);
      if (dismissedAlerts.length > 0) {
        const toRemove = this.alerts.length - this.maxAlerts;
        const dismissedToRemove = Math.min(toRemove, dismissedAlerts.length);
        this.alerts = this.alerts.filter((alert, index) => {
          if (alert.dismissed) {
            return index >= dismissedToRemove;
          }
          return true;
        });
      } else {
        // 처리된 알림이 없으면 가장 오래된 알림 제거
        this.alerts = this.alerts.slice(-this.maxAlerts);
      }
    }
  }

  /**
   * 알림 구독
   */
  public subscribeToAlerts(handler: (alert: IPerformanceAlert) => void): () => void {
    this.alertHandlers.push(handler);
    
    // 구독 취소 함수 반환
    return () => {
      this.alertHandlers = this.alertHandlers.filter(h => h !== handler);
    };
  }
  
  /**
   * 알림 처리 (읽음 표시)
   */
  public dismissAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
    }
  }
  
  /**
   * 모든 알림 처리
   */
  public dismissAllAlerts(): void {
    this.alerts.forEach(alert => {
      alert.dismissed = true;
    });
  }
  
  /**
   * 주기적 지표 집계 시작
   */
  public startPeriodicAggregation(intervalMs: number = 3600000): void {
    if (this.aggregationIntervalId) {
      clearInterval(this.aggregationIntervalId);
    }
    
    this.periodicAggregation = true;
    this.aggregationInterval = intervalMs;
    
    this.aggregationIntervalId = setInterval(() => {
      this.aggregateHourlyMetrics();
    }, intervalMs);
  }
  
  /**
   * 주기적 지표 집계 중지
   */
  public stopPeriodicAggregation(): void {
    if (this.aggregationIntervalId) {
      clearInterval(this.aggregationIntervalId);
      this.aggregationIntervalId = null;
    }
    
    this.periodicAggregation = false;
  }
  
  /**
   * 시간별 지표 집계
   */
  private aggregateHourlyMetrics(): void {
    // 24시간 이상 지난 데이터 제거
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    // 시간별 데이터 정리
    for (const [hour, metrics] of this.hourlyMetrics.entries()) {
      const hourTimestamp = new Date(`${hour}:00:00Z`).getTime();
      if (hourTimestamp < oneDayAgo) {
        this.hourlyMetrics.delete(hour);
      }
    }
  }

  /**
   * 성능 지표 반환
   */
  public getMetrics(): IPerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * 작업별 성능 지표 반환
   */
  public getMetricsByOperation(operation: string): IPerformanceMetrics[] {
    return this.metrics.filter(m => m.operation === operation);
  }

  /**
   * 시간대별 성능 지표 반환
   */
  public getMetricsByTimeRange(startTime: number, endTime: number): IPerformanceMetrics[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * 카테고리별 성능 지표 반환
   */
  public getMetricsByCategory(category: string): IPerformanceMetrics[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * 태그별 성능 지표 반환
   */
  public getMetricsByTag(tag: string): IPerformanceMetrics[] {
    return this.metrics.filter(m => m.tags?.includes(tag));
  }

  /**
   * 작업 평균 지속 시간 반환
   */
  public getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetricsByOperation(operation);
    if (operationMetrics.length === 0) return 0;

    const totalDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / operationMetrics.length;
  }

  /**
   * 작업 성공률 반환
   */
  public getSuccessRate(operation: string): number {
    const operationMetrics = this.getMetricsByOperation(operation);
    if (operationMetrics.length === 0) return 0;

    const successfulOperations = operationMetrics.filter(m => m.success).length;
    return successfulOperations / operationMetrics.length;
  }

  /**
   * 작업 평균 토큰 사용량 반환
   */
  public getAverageTokens(operation: string): number {
    const operationMetrics = this.getMetricsByOperation(operation);
    if (operationMetrics.length === 0) return 0;

    const totalTokens = operationMetrics.reduce((sum, m) => sum + m.tokens, 0);
    return totalTokens / operationMetrics.length;
  }

  /**
   * 작업 최대 지속 시간 반환
   */
  public getMaxDuration(operation: string): number {
    const operationMetrics = this.getMetricsByOperation(operation);
    if (operationMetrics.length === 0) return 0;

    return Math.max(...operationMetrics.map(m => m.duration));
  }

  /**
   * 작업 최소 지속 시간 반환
   */
  public getMinDuration(operation: string): number {
    const operationMetrics = this.getMetricsByOperation(operation);
    if (operationMetrics.length === 0) return 0;

    return Math.min(...operationMetrics.map(m => m.duration));
  }

  /**
   * 작업 누적 토큰 사용량 반환
   */
  public getTotalTokens(operation: string): number {
    const operationMetrics = this.getMetricsByOperation(operation);
    return operationMetrics.reduce((sum, m) => sum + m.tokens, 0);
  }

  /**
   * 시간대별 평균 지속 시간 반환
   */
  public getAverageDurationByHour(operation: string, hours: number = 24): Record<string, number> {
    const now = Date.now();
    const startTime = now - hours * 60 * 60 * 1000;
    const relevantMetrics = this.metrics.filter(
      m => m.operation === operation && m.timestamp >= startTime
    );
    
    const hourlyData: Record<string, { total: number; count: number }> = {};
    
    relevantMetrics.forEach(metric => {
      const hour = new Date(metric.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH 형식
      if (!hourlyData[hour]) {
        hourlyData[hour] = { total: 0, count: 0 };
      }
      hourlyData[hour].total += metric.duration;
      hourlyData[hour].count++;
    });
    
    const result: Record<string, number> = {};
    Object.entries(hourlyData).forEach(([hour, data]) => {
      result[hour] = data.total / data.count;
    });
    
    return result;
  }

  /**
   * 오래된 지표 정리
   */
  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * 모든 지표 정리
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.hourlyMetrics.clear();
  }

  /**
   * 알림 설정 업데이트
   */
  public updateAlertConfig(config: Partial<IPerformanceAlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * 알림 설정 반환
   */
  public getAlertConfig(): IPerformanceAlertConfig {
    return { ...this.alertConfig };
  }

  /**
   * 알림 목록 반환
   */
  public getAlerts(includeOnlyActive: boolean = false): IPerformanceAlert[] {
    if (includeOnlyActive) {
      return this.alerts.filter(alert => !alert.dismissed);
    }
    return [...this.alerts];
  }

  /**
   * 리소스 사용량 측정 (브라우저 환경)
   * 
   * 참고: 일부 메트릭은 권한이 필요하거나 특정 환경에서만 사용 가능합니다.
   */
  public async measureResourceUsage(): Promise<IResourceUsage> {
    const usage: IResourceUsage = {};
    
    try {
      // 메모리 사용량 측정 (브라우저 환경)
      if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
        const memory = (window.performance as any).memory;
        if (memory) {
          usage.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB 단위
        }
      }
      
      // 배터리 정보 조회 (지원하는 브라우저)
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          if (battery) {
            // 배터리 소모 정도는 실제로 측정하기 어려우므로
            // 충전 중이 아닐 때 남은 배터리 수준을 기반으로 임의의 영향도 계산
            if (!battery.charging) {
              usage.batteryImpact = Math.round((1 - battery.level) * 50); // 0-50 사이의 값
            } else {
              usage.batteryImpact = 0;
            }
          }
        } catch (error) {
          console.debug('배터리 정보를 가져올 수 없습니다:', error);
        }
      }
    } catch (error) {
      console.error('리소스 사용량 측정 중 오류:', error);
    }
    
    return usage;
  }

  /**
   * 지표를 로컬 스토리지에 저장
   */
  private saveMetricsToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        // 성능 지표 저장 (최근 100개만)
        const recentMetrics = this.metrics.slice(-100);
        localStorage.setItem('ovis_performance_metrics', JSON.stringify(recentMetrics));
        
        // 해결되지 않은 알림 저장
        const activeAlerts = this.alerts.filter(alert => !alert.dismissed);
        localStorage.setItem('ovis_performance_alerts', JSON.stringify(activeAlerts));
      } catch (error) {
        console.error('성능 지표 저장 중 오류:', error);
      }
    }
  }

  /**
   * 지표를 로컬 스토리지에서 로드
   */
  private loadMetricsFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        // 성능 지표 로드
        const storedMetrics = localStorage.getItem('ovis_performance_metrics');
        if (storedMetrics) {
          const parsedMetrics = JSON.parse(storedMetrics) as IPerformanceMetrics[];
          this.metrics = [...parsedMetrics, ...this.metrics];
          this.cleanupOldMetrics();
        }
        
        // 알림 로드
        const storedAlerts = localStorage.getItem('ovis_performance_alerts');
        if (storedAlerts) {
          const parsedAlerts = JSON.parse(storedAlerts) as IPerformanceAlert[];
          this.alerts = [...parsedAlerts, ...this.alerts];
          if (this.alerts.length > this.maxAlerts) {
            this.alerts = this.alerts.slice(-this.maxAlerts);
          }
        }
      } catch (error) {
        console.error('성능 지표 로드 중 오류:', error);
      }
    }
  }

  /**
   * 자원 정리
   */
  public destroy(): void {
    this.stopResourceUsageCollection();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.saveMetricsToStorage.bind(this));
    }
    
    if (this.aggregationIntervalId) {
      clearInterval(this.aggregationIntervalId);
      this.aggregationIntervalId = null;
    }
    
    // 저장 후 정리
    this.saveMetricsToStorage();
    this.metrics = [];
    this.alerts = [];
    this.hourlyMetrics.clear();
    this.consecutiveFailures.clear();
    this.operationStartTimes.clear();
    this.alertHandlers = [];
    this.metricHandlers = [];
    this.currentSessions.clear();
    this.benchmarkResults = [];
    this.periodicResourceUsage = [];
    this.resourceUsageHistory = [];
  }

  /**
   * 성능 지표 구독
   */
  public subscribeToMetrics(handler: (metric: IPerformanceMetrics) => void): () => void {
    this.metricHandlers.push(handler);
    
    // 구독 취소 함수 반환
    return () => {
      this.metricHandlers = this.metricHandlers.filter(h => h !== handler);
    };
  }

  /**
   * 모든 느린 작업 목록 반환
   */
  public getSlowOperations(thresholdMs: number = this.slowOperationsThresholdMs): IPerformanceMetrics[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  /**
   * 작업별 시간대 분포 분석 반환
   */
  public getOperationTimeDistribution(operation: string): {
    min: number;
    max: number;
    avg: number;
    median: number;
    p90: number; // 90 백분위수
    p95: number; // 95 백분위수
    p99: number; // 99 백분위수
  } {
    const metricsByOp = this.getMetricsByOperation(operation);
    if (metricsByOp.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, p90: 0, p95: 0, p99: 0 };
    }

    const durations = metricsByOp.map(m => m.duration).sort((a, b) => a - b);
    const min = durations[0];
    const max = durations[durations.length - 1];
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    const getPercentile = (p: number) => {
      const index = Math.floor(durations.length * p / 100);
      return durations[index];
    };
    
    return {
      min,
      max,
      avg,
      median: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };
  }

  /**
   * 성능 벤치마크 실행
   */
  public async runBenchmark(
    benchmarkName: string,
    operation: () => Promise<void>,
    iterations: number = 10
  ): Promise<IPerformanceBenchmarkResult> {
    const durations: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      durations.push(end - start);
    }
    
    durations.sort((a, b) => a - b);
    
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / iterations;
    const minDuration = durations[0];
    const maxDuration = durations[durations.length - 1];
    const medianDuration = durations[Math.floor(iterations / 2)];
    
    // 변동 계수 (표준 편차 / 평균)
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - averageDuration, 2), 0) / iterations;
    const stdDev = Math.sqrt(variance);
    const varianceCoefficient = stdDev / averageDuration;
    
    const result: IPerformanceBenchmarkResult = {
      benchmarkName,
      iterations,
      totalDuration,
      averageDuration,
      minDuration,
      maxDuration,
      medianDuration,
      varianceCoefficient,
      timestamp: Date.now()
    };
    
    this.benchmarkResults.push(result);
    return result;
  }

  /**
   * 성능 분석 세션 시작
   */
  public startAnalysisSession(sessionName: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSessions.set(sessionId, {
      sessionId,
      startTime: Date.now(),
      operations: [],
      metrics: []
    });
    
    return sessionId;
  }

  /**
   * 작업을 세션에 추가
   */
  public addOperationToSession(sessionId: string, metric: IPerformanceMetrics): void {
    const session = this.currentSessions.get(sessionId);
    if (!session) return;
    
    session.metrics.push({...metric});
    if (!session.operations.includes(metric.operation)) {
      session.operations.push(metric.operation);
    }
  }

  /**
   * 세션 종료 및 분석 결과 반환
   */
  public endAnalysisSession(sessionId: string): IPerformanceAnalysisSession | null {
    const session = this.currentSessions.get(sessionId);
    if (!session) return null;
    
    session.endTime = Date.now();
    
    // 세션 요약 생성
    if (session.metrics.length > 0) {
      const totalOperations = session.metrics.length;
      const successfulOps = session.metrics.filter(m => m.success).length;
      const successRate = successfulOps / totalOperations;
      const totalDuration = session.metrics.reduce((sum, m) => sum + m.duration, 0);
      const totalTokens = session.metrics.reduce((sum, m) => sum + m.tokens, 0);
      
      // 최대 메모리 및 CPU 사용량 계산
      let peakMemoryUsage = 0;
      let peakCpuUsage = 0;
      let totalNetworkTransfer = 0;
      
      session.metrics.forEach(m => {
        if (m.resourceUsage?.memoryUsage && m.resourceUsage.memoryUsage > peakMemoryUsage) {
          peakMemoryUsage = m.resourceUsage.memoryUsage;
        }
        
        if (m.resourceUsage?.cpuUsage && m.resourceUsage.cpuUsage > peakCpuUsage) {
          peakCpuUsage = m.resourceUsage.cpuUsage;
        }
        
        if (m.resourceUsage?.networkBandwidth) {
          totalNetworkTransfer += m.resourceUsage.networkBandwidth;
        }
      });
      
      // API 호출 및 오류 계산
      const apiCalls = session.metrics.filter(m => m.apiDetails).length;
      const apiErrors = session.metrics.filter(m => 
        m.apiDetails && m.apiDetails.statusCode && m.apiDetails.statusCode >= 400
      ).length;
      
      session.summary = {
        totalOperations,
        successRate,
        averageDuration: totalOperations > 0 ? totalDuration / totalOperations : 0,
        totalTokens,
        peakMemoryUsage,
        peakCpuUsage,
        totalNetworkTransfer,
        apiCallsCount: apiCalls,
        apiErrorRate: apiCalls > 0 ? apiErrors / apiCalls : 0,
        alerts: this.alerts.filter(a => 
          a.timestamp >= session.startTime && 
          (!session.endTime || a.timestamp <= session.endTime)
        ).length
      };
    }
    
    this.currentSessions.delete(sessionId);
    return {...session};
  }

  /**
   * 자원 사용량 수집 시작
   */
  public startResourceUsageCollection(intervalMs: number = 10000): void {
    if (this.isCollectingResourceMetrics) return;
    
    this.isCollectingResourceMetrics = true;
    this.resourceUsageHistory = [];
    
    // 주기적으로 자원 사용량 측정
    this.resourceCollectionIntervalId = setInterval(async () => {
      const usage = await this.measureResourceUsage();
      this.periodicResourceUsage.push(usage);
      
      // 최대 100개 항목만 유지
      if (this.periodicResourceUsage.length > 100) {
        this.periodicResourceUsage.shift();
      }
    }, intervalMs);
  }

  /**
   * 자원 사용량 수집 중지
   */
  public stopResourceUsageCollection(): void {
    if (this.resourceCollectionIntervalId) {
      clearInterval(this.resourceCollectionIntervalId);
      this.resourceCollectionIntervalId = null;
    }
    
    this.isCollectingResourceMetrics = false;
  }

  /**
   * 자원 사용량 기록 반환
   */
  public getResourceUsageHistory(): { timestamp: number; usage: IResourceUsage }[] {
    return [...this.resourceUsageHistory];
  }

  /**
   * 성능 추적 설정 업데이트
   */
  public updateTrackingConfig(config: Partial<IPerformanceTrackingConfig>): void {
    const prevAutoMeasure = this.trackingConfig.autoMeasureResourceUsage;
    this.trackingConfig = { ...this.trackingConfig, ...config };
    
    // 자동 측정 설정이 변경되었을 경우 처리
    if (prevAutoMeasure !== this.trackingConfig.autoMeasureResourceUsage) {
      if (this.trackingConfig.autoMeasureResourceUsage) {
        this.startResourceUsageCollection();
      } else {
        this.stopResourceUsageCollection();
      }
    }
    
    // 최대 지표 수 업데이트
    if (config.maxMetricsRetention) {
      this.maxMetrics = config.maxMetricsRetention;
      this.cleanupOldMetrics();
    }
  }

  /**
   * 원격 측정 데이터 내보내기
   */
  public async exportMetrics(url?: string): Promise<boolean> {
    const exportUrl = url || this.trackingConfig.exportMetricsUrl;
    if (!exportUrl) return false;
    
    try {
      const exportData = {
        metrics: this.metrics.slice(-100), // 최근 100개 지표만
        alerts: this.alerts.filter(a => !a.dismissed),
        timestamp: Date.now(),
        version: '1.0'
      };
      
      const response = await fetch(exportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
      });
      
      return response.ok;
    } catch (error) {
      console.error('성능 지표 내보내기 실패:', error);
      return false;
    }
  }

  /**
   * API 호출 성능 측정 래퍼
   */
  public async measureApiCall<T>(
    operation: string,
    apiCall: () => Promise<T>,
    options: {
      tags?: string[];
      category?: string;
    } = {}
  ): Promise<{ result: T; metrics: IPerformanceMetrics }> {
    const operationId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startOperation(operationId);
    
    const apiDetails: IApiCallDetails = {
      endpoint: operation,
      method: 'UNKNOWN',
    };
    
    let result: T;
    let success = false;
    let error: Error | undefined;
    let responseSize: number | undefined;
    
    try {
      result = await apiCall();
      success = true;
      
      // 응답 크기 추정
      try {
        if (result !== undefined && result !== null) {
          const serialized = JSON.stringify(result);
          responseSize = serialized.length;
          apiDetails.responseSize = responseSize;
        }
      } catch (e) {
        // 직렬화 실패 시 무시
      }
      
      return {
        result,
        metrics: this.endOperation(operationId, {
          operation,
          tokens: 0,
          success,
          apiDetails,
          category: options.category,
          tags: options.tags
        }) || {
          timestamp: Date.now(),
          operation,
          duration: 0,
          tokens: 0,
          success
        }
      };
    } catch (e) {
      error = e as Error;
      
      if (error) {
        apiDetails.statusCode = 500; // 기본값
        
        // HTTP 오류인 경우 상태 코드 추출 시도
        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof error.status === 'number'
        ) {
          apiDetails.statusCode = error.status;
        }
      }
      
      this.endOperation(operationId, {
        operation,
        tokens: 0,
        success: false,
        error: error?.message || '알 수 없는 오류',
        apiDetails,
        category: options.category,
        tags: options.tags
      });
      
      throw error;
    }
  }
} 