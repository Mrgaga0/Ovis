import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { useWorkflowStore } from '../workflow/store';

// 전역 인스턴스
let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

/**
 * 유효한 WebSocket 상태 코드 목록
 * RFC 6455에 정의된 코드만 사용
 */
const VALID_STATUS_CODES = [
  1000, 1001, 1002, 1003, 1007, 1008,
  1009, 1010, 1011, 3000, 3999, 4000, 4999
];

/**
 * WebSocket 서버 초기화 함수
 * HTTP 서버와 연결하거나 독립적으로 실행할 수 있음
 */
export function initWebSocketServer(server?: Server) {
  if (wss) return wss;

  // 서버가 제공되면 해당 서버에 WebSocket 서버 연결, 아니면 새로 생성
  if (server) {
    wss = new WebSocketServer({ server });
    console.log('WebSocket 서버가 HTTP 서버에 연결되었습니다.');
  } else {
    // 포트 3002로 WebSocket 서버 생성
    wss = new WebSocketServer({ port: 3002 });
    console.log('WebSocket 서버 시작됨 (포트: 3002, 독립 모드)');
  }

  wss.on('connection', (ws, req) => {
    console.log('WebSocket 클라이언트 연결됨');
    clients.add(ws);

    // 연결 안정성을 위한 ping/pong 매커니즘 설정
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // 클라이언트에서 메시지 수신 처리
    ws.on('message', (message) => {
      try {
        // 문자열이 아닌 경우 처리
        let messageText = '';
        if (message instanceof Buffer) {
          messageText = message.toString('utf8');
        } else if (typeof message === 'string') {
          messageText = message;
        } else {
          throw new Error('지원되지 않는 메시지 형식');
        }

        const data = JSON.parse(messageText);
        
        // 메시지 유형에 따른 처리
        if (data.type === 'subscribe') {
          // 워크플로우 실행 상태 구독 확인
          if (data.workflowId) {
            // 특정 워크플로우에 대한 구독
            sendSafe(ws, {
              type: 'subscription_confirmed',
              workflowId: data.workflowId,
              message: `워크플로우 ${data.workflowId} 상태 업데이트를 구독합니다.`
            });
            
            // 현재 상태 전송
            const workflowStore = useWorkflowStore.getState();
            const workflow = workflowStore.workflows[data.workflowId];
            const status = workflowStore.executionStatus[data.workflowId];
            
            if (workflow && status) {
              sendSafe(ws, {
                type: 'workflow_status',
                workflowId: data.workflowId,
                data: {
                  status: status.status,
                  progress: status.progress,
                  currentStep: status.currentStep,
                  logs: status.logs
                }
              });
            }
          } else {
            // 모든 워크플로우 구독
            sendSafe(ws, {
              type: 'subscription_confirmed',
              message: '모든 워크플로우 상태 업데이트를 구독합니다.'
            });
          }
        }
      } catch (error) {
        console.error('WebSocket 메시지 처리 중 오류:', error);
        sendSafe(ws, {
          type: 'error',
          message: '잘못된 메시지 형식입니다.'
        });
      }
    });

    // 연결 종료 처리
    ws.on('close', (code, reason) => {
      console.log(`WebSocket 클라이언트 연결 종료됨: ${code}`);
      clients.delete(ws);
    });

    // 오류 처리
    ws.on('error', (error) => {
      console.error('WebSocket 오류:', error);
      try {
        // 안전하게 연결 종료 (유효한 상태 코드 사용)
        ws.close(1011, '내부 서버 오류');
      } catch (closeError) {
        console.error('연결 종료 중 오류:', closeError);
        // 강제 종료
        clients.delete(ws);
      }
    });

    // 초기 환영 메시지 전송
    sendSafe(ws, {
      type: 'welcome',
      message: 'WebSocket 서버에 연결되었습니다. 워크플로우 상태 업데이트를 구독하려면 {"type":"subscribe"} 메시지를 전송하세요.'
    });
  });

  // 연결 유지 확인 인터벌 (ping/pong)
  const interval = setInterval(() => {
    wss?.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        // 비활성 연결 종료 (유효한 상태 코드 사용)
        return ws.terminate();
      }
      
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        console.error('Ping 오류:', error);
        // 오류 발생 시 연결 종료
        ws.terminate();
      }
    });
  }, 30000);

  // 서버 종료 시 인터벌 정리
  wss.on('close', () => {
    clearInterval(interval);
  });

  // 워크플로우 스토어 구독 설정
  setupStoreSubscription();

  return wss;
}

/**
 * 안전하게 WebSocket 메시지 전송
 */
function sendSafe(ws: WebSocket, data: any) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (error) {
    console.error('메시지 전송 중 오류:', error);
  }
}

/**
 * 워크플로우 스토어 구독 설정
 */
function setupStoreSubscription() {
  // 실행 상태 변경 감지를 위한 interval 설정
  const checkInterval = setInterval(() => {
    const state = useWorkflowStore.getState();
    
    // 모든 활성 워크플로우 업데이트 브로드캐스트
    Object.keys(state.executionStatus).forEach(workflowId => {
      const status = state.executionStatus[workflowId];
      
      if (status && status.status === 'running') {
        broadcastWorkflowUpdate(workflowId, {
          status: status.status,
          progress: status.progress,
          currentStep: status.currentStep,
          logs: status.logs
        });
      }
    });
  }, 1000); // 1초마다 체크
  
  // 서버 종료 시 정리
  process.on('SIGTERM', () => clearInterval(checkInterval));
  process.on('SIGINT', () => clearInterval(checkInterval));
}

/**
 * 워크플로우 상태 업데이트 브로드캐스트 함수
 */
export function broadcastWorkflowUpdate(workflowId: string, update: any) {
  if (!wss) {
    wss = initWebSocketServer();
  }

  clients.forEach((client) => {
    sendSafe(client, {
      type: 'workflow_status',
      workflowId,
      data: update
    });
  });
}

// WebSocket 인터페이스 확장
declare module 'ws' {
  interface WebSocket {
    isAlive: boolean;
  }
} 