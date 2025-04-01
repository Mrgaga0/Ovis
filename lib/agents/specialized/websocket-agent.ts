import { BaseAgent, IAgentConfig, IAgentMessage, IAgentResponse } from '../base-agent';
import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';

/**
 * 웹소켓 클라이언트 관리를 위한 인터페이스
 */
interface IWebSocketClient {
  id: string;
  socket: WebSocket;
  createdAt: number;
  lastActivity: number;
  subscriptions: Set<string>;
  metadata?: Record<string, any>;
}

/**
 * 웹소켓 에이전트 설정 인터페이스
 */
interface IWebSocketAgentConfig extends IAgentConfig {
  port?: number;
  heartbeatInterval?: number;
  maxInactivityTime?: number;
  server?: Server;
}

/**
 * 메시지 브로드캐스트 옵션 인터페이스
 */
interface IBroadcastOptions {
  // 특정 클라이언트만 대상으로 지정할 ID 목록 (비어있으면 모든 클라이언트)
  clientIds?: string[];
  // 특정 주제를 구독한 클라이언트만 대상으로 지정
  topic?: string;
  // 특정 클라이언트 제외 (필터링용)
  excludeClientIds?: string[];
}

/**
 * WebSocket 에이전트 구현
 * 웹소켓 연결 관리 및 실시간 통신을 담당
 */
export class WebSocketAgent extends BaseAgent {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, IWebSocketClient>;
  private topics: Map<string, Set<string>>;
  private port: number;
  private httpServer: Server | undefined;
  private heartbeatInterval: number;
  private maxInactivityTime: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * WebSocketAgent 생성자
   */
  constructor(config: IWebSocketAgentConfig) {
    super({
      ...config,
      capabilities: [...(config.capabilities || []), 'websocket', 'real_time_communication'],
    });

    this.clients = new Map();
    this.topics = new Map();
    this.port = config.port || 3002;
    this.httpServer = config.server;
    this.heartbeatInterval = config.heartbeatInterval || 30000; // 30초
    this.maxInactivityTime = config.maxInactivityTime || 300000; // 5분
  }

  /**
   * 초기화 시 호출되는 메서드
   */
  protected async onInitialize(): Promise<void> {
    this.initializeWebSocketServer();
    this.setupCleanupInterval();
    console.log(`WebSocketAgent ${this.config.name} initialized on port ${this.port}`);
  }

  /**
   * 종료 시 호출되는 메서드
   */
  protected async onShutdown(): Promise<void> {
    this.cleanupResources();
    console.log(`WebSocketAgent ${this.config.name} shutdown`);
  }

  /**
   * 메시지 처리
   */
  protected async onProcessMessage(message: IAgentMessage): Promise<any> {
    switch (message.type) {
      case 'BROADCAST_MESSAGE':
        return this.broadcastMessage(message.content.data, message.content.options);
      case 'SEND_TO_CLIENT':
        return this.sendToClient(message.content.clientId, message.content.data);
      case 'GET_ACTIVE_CLIENTS':
        return this.getActiveClients();
      case 'GET_SUBSCRIPTIONS':
        return this.getClientSubscriptions(message.content.clientId);
      case 'CLOSE_CONNECTION':
        return this.closeConnection(message.content.clientId, message.content.code, message.content.reason);
      default:
        throw new Error(`지원하지 않는 메시지 타입: ${message.type}`);
    }
  }

  /**
   * WebSocket 서버 초기화
   */
  private initializeWebSocketServer(): void {
    try {
      // 서버가 제공되면 해당 서버에 WebSocket 서버 연결, 아니면 새로 생성
      if (this.httpServer) {
        this.wss = new WebSocketServer({ server: this.httpServer });
        console.log('WebSocket 서버가 HTTP 서버에 연결되었습니다.');
      } else {
        this.wss = new WebSocketServer({ port: this.port });
        console.log(`WebSocket 서버 시작됨 (포트: ${this.port}, 독립 모드)`);
      }

      // 연결 이벤트 처리
      this.wss.on('connection', this.handleConnection.bind(this));
      
      // 에러 이벤트 처리
      this.wss.on('error', (error) => {
        console.error('WebSocket 서버 오류:', error);
        this.emit('websocket_error', { error });
      });
      
      // 종료 이벤트 처리
      this.wss.on('close', () => {
        console.log('WebSocket 서버가 종료되었습니다.');
        this.emit('websocket_closed', {});
      });
    } catch (error) {
      console.error('WebSocket 서버 초기화 오류:', error);
      throw error;
    }
  }

  /**
   * 새 연결 처리
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = uuidv4();
    const client: IWebSocketClient = {
      id: clientId,
      socket: ws,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      subscriptions: new Set(),
      metadata: {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
      }
    };

    // 클라이언트 저장
    this.clients.set(clientId, client);
    
    // 연결 이벤트 발생
    this.emit('client_connected', { 
      clientId, 
      timestamp: client.createdAt,
      metadata: client.metadata
    });

    // 클라이언트 ID 전송
    this.sendToClient(clientId, {
      type: 'welcome',
      clientId,
      message: '웹소켓 서버에 연결되었습니다.'
    });

    // 메시지 이벤트 처리
    ws.on('message', (message) => this.handleMessage(clientId, message));
    
    // 연결 종료 이벤트 처리
    ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
    
    // 에러 이벤트 처리
    ws.on('error', (error) => this.handleClientError(clientId, error));
    
    // 핑/퐁 처리
    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastActivity = Date.now();
      }
    });
  }

  /**
   * 클라이언트 메시지 처리
   */
  private handleMessage(clientId: string, message: WebSocket.Data): void {
    try {
      // 활동 시간 업데이트
      const client = this.clients.get(clientId);
      if (!client) return;
      
      client.lastActivity = Date.now();
      
      // 메시지 파싱
      let parsedMessage: any;
      
      try {
        let messageText = '';
        if (message instanceof Buffer) {
          messageText = message.toString('utf8');
        } else if (typeof message === 'string') {
          messageText = message;
        } else {
          throw new Error('지원되지 않는 메시지 형식');
        }
        
        parsedMessage = JSON.parse(messageText);
      } catch (parseError) {
        console.error(`잘못된 메시지 형식: ${parseError}`);
        this.sendToClient(clientId, {
          type: 'error',
          message: '잘못된 메시지 형식입니다.'
        });
        return;
      }
      
      // 메시지 타입에 따른 처리
      if (parsedMessage.type === 'subscribe') {
        this.handleSubscription(clientId, parsedMessage.topic);
      } else if (parsedMessage.type === 'unsubscribe') {
        this.handleUnsubscription(clientId, parsedMessage.topic);
      } else {
        // 일반 메시지
        this.emit('client_message', { 
          clientId, 
          message: parsedMessage, 
          timestamp: Date.now() 
        });
      }
    } catch (error) {
      console.error(`메시지 처리 오류: ${error}`);
    }
  }

  /**
   * 구독 처리
   */
  private handleSubscription(clientId: string, topic: string): void {
    if (!topic) {
      this.sendToClient(clientId, {
        type: 'error',
        message: '구독할 주제가 지정되지 않았습니다.'
      });
      return;
    }
    
    // 클라이언트 구독 목록에 추가
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add(topic);
    }
    
    // 주제별 구독자 목록에 추가
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic)?.add(clientId);
    
    // 구독 성공 응답
    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      topic,
      message: `주제 '${topic}'에 구독되었습니다.`
    });
    
    // 구독 이벤트 발생
    this.emit('client_subscribed', { 
      clientId, 
      topic, 
      timestamp: Date.now() 
    });
  }

  /**
   * 구독 취소 처리
   */
  private handleUnsubscription(clientId: string, topic: string): void {
    if (!topic) {
      this.sendToClient(clientId, {
        type: 'error',
        message: '구독 취소할 주제가 지정되지 않았습니다.'
      });
      return;
    }
    
    // 클라이언트 구독 목록에서 제거
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(topic);
    }
    
    // 주제별 구독자 목록에서 제거
    if (this.topics.has(topic)) {
      this.topics.get(topic)?.delete(clientId);
      
      // 구독자가 없으면 주제 제거
      if (this.topics.get(topic)?.size === 0) {
        this.topics.delete(topic);
      }
    }
    
    // 구독 취소 성공 응답
    this.sendToClient(clientId, {
      type: 'unsubscription_confirmed',
      topic,
      message: `주제 '${topic}'의 구독이 취소되었습니다.`
    });
    
    // 구독 취소 이벤트 발생
    this.emit('client_unsubscribed', { 
      clientId, 
      topic, 
      timestamp: Date.now() 
    });
  }

  /**
   * 클라이언트 연결 종료 처리
   */
  private handleDisconnection(clientId: string, code: number, reason: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // 모든 구독에서 클라이언트 제거
    client.subscriptions.forEach(topic => {
      if (this.topics.has(topic)) {
        this.topics.get(topic)?.delete(clientId);
        
        // 구독자가 없으면 주제 제거
        if (this.topics.get(topic)?.size === 0) {
          this.topics.delete(topic);
        }
      }
    });
    
    // 클라이언트 제거
    this.clients.delete(clientId);
    
    // 연결 종료 이벤트 발생
    this.emit('client_disconnected', { 
      clientId, 
      code,
      reason: reason.toString(),
      timestamp: Date.now() 
    });
  }

  /**
   * 클라이언트 오류 처리
   */
  private handleClientError(clientId: string, error: Error): void {
    console.error(`클라이언트 ${clientId} 오류:`, error);
    
    // 오류 이벤트 발생
    this.emit('client_error', { 
      clientId, 
      error: error.message,
      timestamp: Date.now() 
    });
    
    // 연결 종료 시도
    try {
      const client = this.clients.get(clientId);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        client.socket.close(1011, '내부 서버 오류');
      }
    } catch (closeError) {
      console.error('연결 종료 중 오류:', closeError);
    } finally {
      this.clients.delete(clientId);
    }
  }

  /**
   * 정기적인 정리 수행
   */
  private setupCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      // 비활성 클라이언트 연결 종료
      this.clients.forEach((client, clientId) => {
        if (now - client.lastActivity > this.maxInactivityTime) {
          console.log(`비활성 클라이언트 ${clientId} 연결 종료`);
          
          // 안전하게 연결 종료
          try {
            if (client.socket.readyState === WebSocket.OPEN) {
              client.socket.close(1000, '비활성 타임아웃');
            }
          } catch (error) {
            console.error('연결 종료 중 오류:', error);
          } finally {
            this.handleDisconnection(clientId, 1000, Buffer.from('비활성 타임아웃'));
          }
        } else {
          // 핑 전송
          try {
            if (client.socket.readyState === WebSocket.OPEN) {
              client.socket.ping();
            }
          } catch (error) {
            console.error('Ping 오류:', error);
          }
        }
      });
    }, this.heartbeatInterval);
  }

  /**
   * 특정 클라이언트에게 메시지 전송
   */
  public sendToClient(clientId: string, data: any): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    
    try {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify(data));
        client.lastActivity = Date.now();
        return true;
      }
    } catch (error) {
      console.error(`클라이언트 ${clientId}에 메시지 전송 중 오류:`, error);
      
      // 연결 오류 발생 시 클라이언트 제거
      this.clients.delete(clientId);
    }
    
    return false;
  }

  /**
   * 메시지 브로드캐스트
   */
  public broadcastMessage(data: any, options: IBroadcastOptions = {}): number {
    let targetClients: string[] = [];
    
    // 대상 클라이언트 선택
    if (options.clientIds && options.clientIds.length > 0) {
      // 특정 클라이언트만 대상
      targetClients = options.clientIds.filter(id => this.clients.has(id));
    } else if (options.topic) {
      // 특정 주제 구독자만 대상
      targetClients = Array.from(this.topics.get(options.topic) || []);
    } else {
      // 모든 클라이언트 대상
      targetClients = Array.from(this.clients.keys());
    }
    
    // 제외할 클라이언트 필터링
    if (options.excludeClientIds && options.excludeClientIds.length > 0) {
      targetClients = targetClients.filter(id => !options.excludeClientIds?.includes(id));
    }
    
    // 메시지 전송
    let successCount = 0;
    
    targetClients.forEach(clientId => {
      if (this.sendToClient(clientId, data)) {
        successCount++;
      }
    });
    
    return successCount;
  }

  /**
   * 활성 클라이언트 목록 가져오기
   */
  public getActiveClients(): Array<{ id: string; subscriptions: string[]; lastActivity: number; }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      subscriptions: Array.from(client.subscriptions),
      lastActivity: client.lastActivity
    }));
  }

  /**
   * 클라이언트 구독 목록 가져오기
   */
  public getClientSubscriptions(clientId: string): string[] {
    const client = this.clients.get(clientId);
    return client ? Array.from(client.subscriptions) : [];
  }

  /**
   * 특정 클라이언트 연결 종료
   */
  public closeConnection(clientId: string, code: number = 1000, reason: string = '서버에서 연결 종료'): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    
    try {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.close(code, reason);
        return true;
      }
    } catch (error) {
      console.error(`클라이언트 ${clientId} 연결 종료 중 오류:`, error);
    }
    
    return false;
  }

  /**
   * 리소스 정리
   */
  private cleanupResources(): void {
    // 정리 인터벌 종료
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // 모든 연결 종료
    this.clients.forEach((client, clientId) => {
      try {
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.close(1001, '서버 종료');
        }
      } catch (error) {
        console.error(`클라이언트 ${clientId} 연결 종료 중 오류:`, error);
      }
    });
    
    // 컬렉션 정리
    this.clients.clear();
    this.topics.clear();
    
    // 서버 종료
    if (this.wss) {
      try {
        this.wss.close();
      } catch (error) {
        console.error('WebSocket 서버 종료 중 오류:', error);
      }
      this.wss = null;
    }
  }
} 