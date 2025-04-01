'use client';

import { useEffect, useState } from 'react';
import { createExampleWorkflows } from '@/lib/workflow/examples';

/**
 * 워크플로우 초기화 컴포넌트
 * 앱이 처음 로드될 때 예제 워크플로우를 생성합니다.
 */
export default function WorkflowInitializer() {
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // 클라이언트 측에서만 실행
    if (typeof window !== 'undefined' && !initialized) {
      try {
        // localStorage에서 초기화 상태 확인
        const isInitialized = localStorage.getItem('workflow_examples_initialized');
        
        if (!isInitialized) {
          // 예제 워크플로우 생성
          const workflowIds = createExampleWorkflows();
          console.log('예제 워크플로우가 생성되었습니다:', workflowIds);
          
          // 초기화 상태 저장
          localStorage.setItem('workflow_examples_initialized', 'true');
        }
      } catch (error) {
        console.error('워크플로우 초기화 중 오류:', error);
      } finally {
        setInitialized(true);
      }
    }
  }, [initialized]);
  
  // UI를 렌더링하지 않는 유틸리티 컴포넌트
  return null;
} 