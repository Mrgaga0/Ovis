'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    // 초기 네트워크 상태 설정
    setIsOnline(navigator.onLine)

    // 네트워크 상태 변경 이벤트 리스너
    const handleOnline = () => {
      setIsOnline(true)
      setShowAlert(true)
      setTimeout(() => setShowAlert(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowAlert(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showAlert) return null

  return (
    <Alert
      variant={isOnline ? "default" : "destructive"}
      className="fixed bottom-4 right-4 w-auto max-w-[300px] transition-all duration-300"
    >
      {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <AlertTitle>
        {isOnline ? '온라인 상태' : '오프라인 상태'}
      </AlertTitle>
      <AlertDescription>
        {isOnline
          ? '네트워크에 다시 연결되었습니다.'
          : '네트워크 연결이 끊어졌습니다. 제한된 기능만 사용할 수 있습니다.'}
      </AlertDescription>
    </Alert>
  )
} 