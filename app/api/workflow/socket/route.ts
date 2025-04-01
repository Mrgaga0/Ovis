import { NextRequest, NextResponse } from 'next/server'
import { initWebSocketServer, broadcastWorkflowUpdate } from '@/lib/websocket/server'

// 기능을 외부 모듈로 이동했으므로 여기에서는 간단한 인터페이스만 제공
export { broadcastWorkflowUpdate }

// WebSocket 라우트 핸들러
export async function GET(req: NextRequest) {
  // WebSocket 서버 초기화 (독립 모드)
  initWebSocketServer()

  // WebSocket 연결이 아닌 일반 HTTP 요청에 대한 응답
  return new Response('WebSocket 서버가 실행 중입니다. WebSocket 프로토콜로 연결하세요.', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
} 