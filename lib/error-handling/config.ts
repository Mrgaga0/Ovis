export interface IErrorHandlingConfig {
  maxErrorLogs: number;
  notificationChannels: {
    email?: {
      enabled: boolean;
      recipients: string[];
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
    };
    logging?: {
      enabled: boolean;
      level: 'debug' | 'info' | 'warn' | 'error';
    };
  };
  errorCategories: {
    [key: string]: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      retryable: boolean;
      maxRetries: number;
    };
  };
}

export const defaultErrorHandlingConfig: IErrorHandlingConfig = {
  maxErrorLogs: 1000,
  notificationChannels: {
    email: {
      enabled: false,
      recipients: [],
    },
    slack: {
      enabled: false,
      webhookUrl: '',
    },
    logging: {
      enabled: true,
      level: 'error',
    },
  },
  errorCategories: {
    API_ERROR: {
      severity: 'high',
      retryable: true,
      maxRetries: 3,
    },
    CONTEXT_ERROR: {
      severity: 'medium',
      retryable: false,
      maxRetries: 0,
    },
    PROMPT_ERROR: {
      severity: 'low',
      retryable: false,
      maxRetries: 0,
    },
    VALIDATION_ERROR: {
      severity: 'low',
      retryable: false,
      maxRetries: 0,
    },
  },
}; 