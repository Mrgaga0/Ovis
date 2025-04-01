export class GeminiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class ContextError extends Error {
  constructor(
    message: string,
    public contextId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ContextError';
  }
}

export class PromptError extends Error {
  constructor(
    message: string,
    public templateName?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PromptError';
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: Array<{
    timestamp: number;
    error: Error;
    context?: any;
  }>;

  private constructor() {
    this.errorLogs = [];
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error, context?: any): void {
    this.logError(error, context);
    this.notifyError(error, context);
  }

  public handleGeminiError(error: any): GeminiError {
    const geminiError = new GeminiError(
      error.message || 'Gemini API 호출 중 오류가 발생했습니다.',
      error.code || 'UNKNOWN_ERROR',
      error.status,
      error.details
    );
    this.handleError(geminiError);
    return geminiError;
  }

  public handleContextError(message: string, contextId?: string, details?: any): ContextError {
    const contextError = new ContextError(message, contextId, details);
    this.handleError(contextError);
    return contextError;
  }

  public handlePromptError(message: string, templateName?: string, details?: any): PromptError {
    const promptError = new PromptError(message, templateName, details);
    this.handleError(promptError);
    return promptError;
  }

  private logError(error: Error, context?: any): void {
    const errorLog = {
      timestamp: Date.now(),
      error,
      context,
    };
    this.errorLogs.push(errorLog);
    console.error('Error:', errorLog);
  }

  private notifyError(error: Error, context?: any): void {
    // 여기에 에러 알림 로직을 구현할 수 있습니다.
    // 예: 이메일, Slack, 로깅 서비스 등
    console.error('Error notification:', { error, context });
  }

  public getErrorLogs(): Array<{
    timestamp: number;
    error: Error;
    context?: any;
  }> {
    return [...this.errorLogs];
  }

  public clearErrorLogs(): void {
    this.errorLogs = [];
  }
} 