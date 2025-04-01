import { throttle, debounce } from '../utils/throttle';
import { EventEmitter } from 'events';

/**
 * 네트워크 이벤트 타입 정의
 */
export enum NetworkEventType {
  STATUS_CHANGE = 'network:status_change',
  QUALITY_CHANGE = 'network:quality_change',
  LATENCY_CHANGE = 'network:latency_change',
  ERROR = 'network:error',
  RECONNECT_ATTEMPT = 'network:reconnect_attempt',
  RECONNECT_SUCCESS = 'network:reconnect_success',
  RECONNECT_FAILURE = 'network:reconnect_failure'
}

/**
 * 네트워크 품질 정의
 */
export enum NetworkQuality {
  UNKNOWN = 'unknown',
  EXCELLENT = 'excellent', // < 150ms, 안정적
  GOOD = 'good',        // 150-300ms, 안정적
  FAIR = 'fair',        // 300-600ms, 일부 불안정
  POOR = 'poor',        // 600-1000ms, 불안정
  UNUSABLE = 'unusable' // > 1000ms, 매우 불안정
}

/**
 * 네트워크 상태 인터페이스
 */
export interface INetworkStatus {
  online: boolean;
  serverReachable: boolean;
  quality: NetworkQuality;
  latency: number;
  lastChecked: number;
  errors: { message: string; timestamp: number }[];
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectivityType?: string; // wifi, cellular, etc.
  downlink?: number;         // in Mbps
  effectiveType?: string;    // 4g, 3g, 2g, slow-2g
}

/**
 * 네트워크 모니터링 옵션 인터페이스
 */
export interface INetworkMonitorOptions {
  pingEndpoint?: string;
  pingInterval?: number;
  pingTimeout?: number;
  maxReconnectAttempts?: number;
  reconnectBackoffFactor?: number;
  initialReconnectDelay?: number;
  enableLogging?: boolean;
  onlineCheckInterval?: number;
  latencyThresholds?: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

/**
 * 네트워크 모니터 클래스
 * 온라인/오프라인 상태, 네트워크 품질, 서버 연결을 모니터링합니다.
 */
export class NetworkMonitor extends EventEmitter {
  private static instance: NetworkMonitor;
  private status: INetworkStatus;
  private pingTimerId: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
  private options: Required<INetworkMonitorOptions>;
  private latencyHistory: number[] = [];
  private latencyHistoryMaxSize: number = 10;
  private pingInProgress: boolean = false;
  private lastPingTimestamp: number = 0;
  private customPingEndpoint: string | null = null;
  private isBrowser: boolean;

  /**
   * 네트워크 모니터 생성자
   */
  private constructor(options: INetworkMonitorOptions = {}) {
    super();
    
    this.isBrowser = typeof window !== 'undefined';
    
    this.options = {
      pingEndpoint: options.pingEndpoint || 'https://api.ovis.ai/ping',
      pingInterval: options.pingInterval || 30000, // 30초
      pingTimeout: options.pingTimeout || 5000,  // 5초
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      reconnectBackoffFactor: options.reconnectBackoffFactor || 1.5,
      initialReconnectDelay: options.initialReconnectDelay || 1000, // 1초
      enableLogging: options.enableLogging || false,
      onlineCheckInterval: options.onlineCheckInterval || 5000, // 5초
      latencyThresholds: options.latencyThresholds || {
        excellent: 150,
        good: 300,
        fair: 600,
        poor: 1000
      }
    };
    
    this.status = {
      online: this.isBrowser ? navigator.onLine : true,
      serverReachable: false,
      quality: NetworkQuality.UNKNOWN,
      latency: -1,
      lastChecked: 0,
      errors: [],
      reconnectAttempts: 0,
      maxReconnectAttempts: this.options.maxReconnectAttempts
    };
    
    this.initialize();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(options?: INetworkMonitorOptions): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor(options);
    }
    return NetworkMonitor.instance;
  }

  /**
   * 초기화
   */
  private initialize(): void {
    if (this.isBrowser) {
      // 온라인/오프라인 이벤트 리스너
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      
      // Network Information API 사용 (지원하는 브라우저인 경우)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        
        if (connection) {
          this.status.connectivityType = connection.type;
          this.status.downlink = connection.downlink;
          this.status.effectiveType = connection.effectiveType;
          
          connection.addEventListener('change', this.handleConnectionChange);
        }
      }
    }
    
    // 초기 상태 확인
    this.checkOnlineStatus();
    
    // 정기적인 서버 Ping 시작
    this.startServerPing();
  }

  /**
   * 온라인 이벤트 핸들러
   */
  private handleOnline = (): void => {
    const wasOffline = !this.status.online;
    this.status.online = true;
    
    if (wasOffline) {
      this.logDebug('네트워크 연결 복원됨');
      this.emit(NetworkEventType.STATUS_CHANGE, { ...this.status });
      
      // 온라인 상태로 전환 시 즉시 서버 연결 확인
      this.checkServerConnection();
    }
  };

  /**
   * 오프라인 이벤트 핸들러
   */
  private handleOffline = (): void => {
    const wasOnline = this.status.online;
    this.status.online = false;
    this.status.serverReachable = false;
    this.status.quality = NetworkQuality.UNKNOWN;
    
    if (wasOnline) {
      this.logDebug('네트워크 연결 끊김');
      this.emit(NetworkEventType.STATUS_CHANGE, { ...this.status });
      
      // Ping 중단
      if (this.pingTimerId) {
        clearTimeout(this.pingTimerId);
        this.pingTimerId = null;
      }
    }
  };

  /**
   * Network Information API 변경 이벤트 핸들러
   */
  private handleConnectionChange = (event: any): void => {
    if (!this.isBrowser) return;
    
    const connection = (navigator as any).connection;
    if (!connection) return;
    
    this.status.connectivityType = connection.type;
    this.status.downlink = connection.downlink;
    this.status.effectiveType = connection.effectiveType;
    
    this.logDebug(`연결 유형 변경: ${this.status.effectiveType}`);
    this.emit(NetworkEventType.STATUS_CHANGE, { ...this.status });
    
    // 연결 상태 변경 시 서버 연결 및 품질 재확인
    this.checkServerConnection();
  };

  /**
   * 온라인 상태 확인 (디바운스 적용)
   */
  private checkOnlineStatus = debounce((): void => {
    const previousOnline = this.status.online;
    
    // 브라우저 환경에서는 navigator.onLine 사용
    if (this.isBrowser) {
      this.status.online = navigator.onLine;
    } else {
      // Node.js 환경에서는 DNS 조회 등으로 확인 가능
      this.status.online = true; // 기본값, 실제로는 더 정확한 확인 필요
    }
    
    if (previousOnline !== this.status.online) {
      this.emit(NetworkEventType.STATUS_CHANGE, { ...this.status });
      
      if (this.status.online) {
        this.checkServerConnection();
      }
    }
  }, 300);

  /**
   * 서버 연결 확인
   */
  private async checkServerConnection(): Promise<void> {
    if (!this.status.online || this.pingInProgress) return;
    
    this.pingInProgress = true;
    const startTime = Date.now();
    this.lastPingTimestamp = startTime;
    
    try {
      const endpoint = this.customPingEndpoint || this.options.pingEndpoint;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.pingTimeout);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const latency = Date.now() - startTime;
      this.updateLatency(latency);
      
      if (response.ok) {
        const wasUnreachable = !this.status.serverReachable;
        this.status.serverReachable = true;
        this.status.lastChecked = Date.now();
        this.status.reconnectAttempts = 0;
        
        if (wasUnreachable) {
          this.logDebug('서버 연결 복원');
          this.emit(NetworkEventType.RECONNECT_SUCCESS, { ...this.status });
          this.emit(NetworkEventType.STATUS_CHANGE, { ...this.status });
        }
      } else {
        this.handleConnectionError(`서버 응답 오류: ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAborted = errorMessage.includes('abort');
      
      if (isAborted) {
        this.updateLatency(this.options.pingTimeout);
        this.handleConnectionError('서버 연결 시간 초과');
      } else {
        this.handleConnectionError(`서버 연결 오류: ${errorMessage}`);
      }
    } finally {
      this.pingInProgress = false;
      
      // 다음 Ping 예약
      if (this.pingTimerId) {
        clearTimeout(this.pingTimerId);
      }
      
      this.pingTimerId = setTimeout(
        this.checkServerConnection.bind(this), 
        this.options.pingInterval
      );
    }
  }

  /**
   * 지연 시간(latency) 업데이트 및 품질 평가
   */
  private updateLatency(latency: number): void {
    const previousLatency = this.status.latency;
    const previousQuality = this.status.quality;
    
    this.status.latency = latency;
    this.latencyHistory.push(latency);
    
    // 히스토리 크기 제한
    if (this.latencyHistory.length > this.latencyHistoryMaxSize) {
      this.latencyHistory.shift();
    }
    
    // 평균 지연 시간 계산
    const avgLatency = this.calculateAverageLatency();
    
    // 네트워크 품질 평가
    const newQuality = this.evaluateNetworkQuality(avgLatency);
    this.status.quality = newQuality;
    
    // 변경사항이 있으면 이벤트 발생
    if (previousLatency !== this.status.latency) {
      this.emit(NetworkEventType.LATENCY_CHANGE, { 
        latency: this.status.latency,
        averageLatency: avgLatency 
      });
    }
    
    if (previousQuality !== newQuality) {
      this.logDebug(`네트워크 품질 변경: ${previousQuality} → ${newQuality}`);
      this.emit(NetworkEventType.QUALITY_CHANGE, { 
        quality: newQuality,
        latency: avgLatency 
      });
    }
  }

  /**
   * 평균 지연 시간 계산
   */
  private calculateAverageLatency(): number {
    if (this.latencyHistory.length === 0) return -1;
    
    // 극단값 제거 (가장 높은 값과 가장 낮은 값)
    let filteredLatencies = [...this.latencyHistory];
    
    if (filteredLatencies.length > 3) {
      filteredLatencies.sort((a, b) => a - b);
      filteredLatencies = filteredLatencies.slice(1, -1);
    }
    
    const sum = filteredLatencies.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / filteredLatencies.length);
  }

  /**
   * 네트워크 품질 평가
   */
  private evaluateNetworkQuality(latency: number): NetworkQuality {
    if (latency <= 0) return NetworkQuality.UNKNOWN;
    
    const { excellent, good, fair, poor } = this.options.latencyThresholds;
    
    if (latency < excellent) return NetworkQuality.EXCELLENT;
    if (latency < good) return NetworkQuality.GOOD;
    if (latency < fair) return NetworkQuality.FAIR;
    if (latency < poor) return NetworkQuality.POOR;
    return NetworkQuality.UNUSABLE;
  }

  /**
   * 서버 연결 오류 처리
   */
  private handleConnectionError(message: string): void {
    const wasReachable = this.status.serverReachable;
    this.status.serverReachable = false;
    this.status.lastChecked = Date.now();
    
    // 오류 기록
    this.status.errors.push({
      message,
      timestamp: Date.now()
    });
    
    // 최대 10개까지만 유지
    if (this.status.errors.length > 10) {
      this.status.errors.shift();
    }
    
    this.logDebug(`연결 오류: ${message}`);
    
    if (wasReachable) {
      this.emit(NetworkEventType.STATUS_CHANGE, { ...this.status });
      this.emit(NetworkEventType.ERROR, { 
        message,
        timestamp: Date.now() 
      });
      
      // 자동 재연결 시도
      this.scheduleReconnect();
    } else {
      // 이미 연결이 끊어진 상태에서 재시도 중인 경우
      this.status.reconnectAttempts++;
      
      if (this.status.reconnectAttempts <= this.options.maxReconnectAttempts) {
        this.emit(NetworkEventType.RECONNECT_ATTEMPT, {
          attempt: this.status.reconnectAttempts,
          maxAttempts: this.options.maxReconnectAttempts
        });
        this.scheduleReconnect();
      } else {
        this.emit(NetworkEventType.RECONNECT_FAILURE, { 
          attempts: this.status.reconnectAttempts 
        });
        this.logDebug('최대 재연결 시도 횟수 초과');
      }
    }
  }

  /**
   * 재연결 시도 스케줄링 (지수 백오프 적용)
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
    }
    
    const backoffFactor = Math.pow(
      this.options.reconnectBackoffFactor, 
      Math.min(this.status.reconnectAttempts, 8)
    );
    
    const delay = Math.round(this.options.initialReconnectDelay * backoffFactor);
    
    this.logDebug(`${delay}ms 후 재연결 시도 (${this.status.reconnectAttempts + 1}/${this.options.maxReconnectAttempts})`);
    
    this.reconnectTimerId = setTimeout(() => {
      if (this.status.online) {
        this.checkServerConnection();
      }
    }, delay);
  }

  /**
   * 서버 Ping 시작
   */
  private startServerPing(): void {
    if (this.pingTimerId) {
      clearTimeout(this.pingTimerId);
    }
    
    this.pingTimerId = setTimeout(
      this.checkServerConnection.bind(this), 
      1000 // 첫 Ping은 1초 후에 실행
    );
  }

  /**
   * Ping 엔드포인트 설정
   */
  public setPingEndpoint(endpoint: string): void {
    this.customPingEndpoint = endpoint;
    this.logDebug(`Ping 엔드포인트 변경: ${endpoint}`);
  }

  /**
   * 현재 네트워크 상태 반환
   */
  public getStatus(): Readonly<INetworkStatus> {
    return { ...this.status };
  }

  /**
   * 온라인 상태 확인
   */
  public isOnline(): boolean {
    return this.status.online;
  }

  /**
   * 서버 연결 가능 상태 확인
   */
  public isServerReachable(): boolean {
    return this.status.serverReachable;
  }

  /**
   * 양호한 네트워크 품질 확인 (GOOD 이상)
   */
  public hasGoodQuality(): boolean {
    return (
      this.status.quality === NetworkQuality.EXCELLENT || 
      this.status.quality === NetworkQuality.GOOD
    );
  }

  /**
   * 수용 가능한 네트워크 품질 확인 (FAIR 이상)
   */
  public hasAcceptableQuality(): boolean {
    return (
      this.hasGoodQuality() || 
      this.status.quality === NetworkQuality.FAIR
    );
  }

  /**
   * 수동으로 즉시 연결 상태 확인
   */
  public async checkConnectionNow(): Promise<INetworkStatus> {
    await this.checkServerConnection();
    return this.getStatus();
  }

  /**
   * 현재 지연 시간 반환
   */
  public getLatency(): number {
    return this.status.latency;
  }

  /**
   * 디버그 로깅
   */
  private logDebug(message: string): void {
    if (this.options.enableLogging) {
      console.log(`[NetworkMonitor] ${message}`);
    }
  }

  /**
   * 자원 정리
   */
  public dispose(): void {
    if (this.isBrowser) {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connection.removeEventListener('change', this.handleConnectionChange);
        }
      }
    }
    
    if (this.pingTimerId) {
      clearTimeout(this.pingTimerId);
      this.pingTimerId = null;
    }
    
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
    
    this.removeAllListeners();
  }
}

// 기본 인스턴스 내보내기
export const networkMonitor = NetworkMonitor.getInstance(); 