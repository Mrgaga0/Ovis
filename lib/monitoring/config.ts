export interface IMonitoringConfig {
  maxMetrics: number;
  cleanupInterval: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    tokenUsage: number;
  };
  operations: {
    [key: string]: {
      timeout: number;
      retryCount: number;
      retryDelay: number;
    };
  };
}

export const defaultMonitoringConfig: IMonitoringConfig = {
  maxMetrics: 1000,
  cleanupInterval: 3600000, // 1시간
  alertThresholds: {
    responseTime: 5000, // 5초
    errorRate: 0.1, // 10%
    tokenUsage: 10000, // 10,000 토큰
  },
  operations: {
    generateResponse: {
      timeout: 30000, // 30초
      retryCount: 3,
      retryDelay: 1000, // 1초
    },
    generateStreamResponse: {
      timeout: 60000, // 1분
      retryCount: 2,
      retryDelay: 2000, // 2초
    },
  },
}; 