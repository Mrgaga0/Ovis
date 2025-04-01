import { useState, useEffect, useCallback } from 'react'

// 워크플로우 실행 상태 업데이트 인터페이스
interface WorkflowStatusUpdate {
  workflowId: string
  status: 'running' | 'completed' | 'failed'
  progress: number
  currentStep?: {
    id: string
    name: string
    status: 'pending' | 'running' | 'completed' | 'failed'
  }
  error?: string
  timestamp: number
}

// 웹소켓 연결 상태
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export function useWorkflowMonitor(workflowId: string) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<WorkflowStatusUpdate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<WebSocket | null>(null)

  // 웹소켓 연결 설정
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`ws://${window.location.host}`)
      
      ws.onopen = () => {
        setStatus('connected')
        setError(null)
        
        // 워크플로우 구독
        ws.send(JSON.stringify({
          type: 'subscribe',
          workflowId
        }))
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'workflow_update':
              setLastUpdate(data)
              break
            case 'error':
              setError(data.error)
              break
            case 'subscription_confirmed':
              console.log('Subscription confirmed for workflow:', data.workflowId)
              break
            default:
              console.warn('Unknown message type:', data.type)
          }
        } catch (err) {
          console.error('Error processing message:', err)
        }
      }
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setStatus('error')
        setError('웹소켓 연결 오류가 발생했습니다.')
      }
      
      ws.onclose = () => {
        setStatus('disconnected')
        // 자동 재연결 시도
        setTimeout(connect, 5000)
      }
      
      setSocket(ws)
    } catch (err) {
      console.error('Connection error:', err)
      setStatus('error')
      setError('웹소켓 연결을 설정할 수 없습니다.')
    }
  }, [workflowId])

  // 컴포넌트 마운트 시 연결
  useEffect(() => {
    connect()
    
    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      if (socket) {
        // 구독 해제
        socket.send(JSON.stringify({
          type: 'unsubscribe',
          workflowId
        }))
        socket.close()
      }
    }
  }, [connect, workflowId])

  // 수동 재연결 함수
  const reconnect = useCallback(() => {
    if (socket) {
      socket.close()
    }
    connect()
  }, [socket, connect])

  return {
    status,
    lastUpdate,
    error,
    reconnect
  }
} 