import { useWorkflowMonitor } from '@/hooks/useWorkflowMonitor'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface WorkflowMonitorProps {
  workflowId: string
}

export function WorkflowMonitor({ workflowId }: WorkflowMonitorProps) {
  const { status, lastUpdate, error, reconnect } = useWorkflowMonitor(workflowId)
  
  // 연결 상태에 따른 스타일 및 메시지
  const getStatusStyle = () => {
    switch (status) {
      case 'connected':
        return 'text-green-500'
      case 'connecting':
        return 'text-yellow-500'
      case 'disconnected':
        return 'text-gray-500'
      case 'error':
        return 'text-red-500'
      default:
        return ''
    }
  }
  
  const getStatusMessage = () => {
    switch (status) {
      case 'connected':
        return '연결됨'
      case 'connecting':
        return '연결 중...'
      case 'disconnected':
        return '연결 끊김'
      case 'error':
        return '연결 오류'
      default:
        return ''
    }
  }
  
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusStyle()}`} />
          <span className="text-sm">{getStatusMessage()}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={reconnect}
          disabled={status === 'connecting'}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          재연결
        </Button>
      </div>
      
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {lastUpdate && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">실행 상태</p>
              <p className="text-sm text-gray-500">
                {lastUpdate.status === 'running' && '실행 중'}
                {lastUpdate.status === 'completed' && '완료됨'}
                {lastUpdate.status === 'failed' && '실패'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">진행률</p>
              <p className="text-sm text-gray-500">{lastUpdate.progress}%</p>
            </div>
          </div>
          
          <Progress value={lastUpdate.progress} />
          
          {lastUpdate.currentStep && (
            <div>
              <p className="font-medium mb-2">현재 단계</p>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium">{lastUpdate.currentStep.name}</p>
                <p className={`text-sm ${
                  lastUpdate.currentStep.status === 'running' ? 'text-blue-500' :
                  lastUpdate.currentStep.status === 'completed' ? 'text-green-500' :
                  lastUpdate.currentStep.status === 'failed' ? 'text-red-500' :
                  'text-gray-500'
                }`}>
                  {lastUpdate.currentStep.status === 'pending' && '대기 중'}
                  {lastUpdate.currentStep.status === 'running' && '실행 중'}
                  {lastUpdate.currentStep.status === 'completed' && '완료됨'}
                  {lastUpdate.currentStep.status === 'failed' && '실패'}
                </p>
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-400">
            마지막 업데이트: {new Date(lastUpdate.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
} 