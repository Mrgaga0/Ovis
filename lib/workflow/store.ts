import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Workflow, WorkflowStep } from './executor'

// 워크플로우 실행 상태 인터페이스
interface WorkflowExecutionState {
  workflowId: string
  status: 'running' | 'completed' | 'failed'
  progress: number
  currentStep?: {
    id: string
    name: string
    status: 'pending' | 'running' | 'completed' | 'failed'
  }
  error?: string
  startTime: number
  endTime?: number
}

/**
 * 워크플로우 저장소 상태 인터페이스
 */
interface WorkflowStoreState {
  // 워크플로우 목록
  workflows: Record<string, Workflow>
  
  // 워크플로우 실행 상태
  executionStatus: Record<string, {
    progress: number
    currentStep?: string
    startTime: number
    endTime?: number
    status: 'idle' | 'running' | 'completed' | 'failed'
    logs: Array<{
      time: number
      message: string
      type: 'info' | 'warning' | 'error' | 'success'
    }>
  }>
  
  // 워크플로우 실행 이력
  executionHistory: Record<string, Array<{
    id: string
    startTime: number
    endTime: number
    status: 'completed' | 'failed'
    error?: string
  }>>
  
  // 액션
  addWorkflow: (workflow: Workflow) => void
  updateWorkflow: (workflowId: string, updates: Partial<Workflow>) => void
  deleteWorkflow: (workflowId: string) => void
  
  // 워크플로우 단계 관리
  addStep: (workflowId: string, step: WorkflowStep) => void
  updateStep: (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => void
  deleteStep: (workflowId: string, stepId: string) => void
  
  // 실행 상태 관리
  initExecution: (workflowId: string) => void
  updateExecutionStatus: (workflowId: string, updates: Partial<WorkflowStoreState['executionStatus'][string]>) => void
  addExecutionLog: (workflowId: string, message: string, type: 'info' | 'warning' | 'error' | 'success') => void
  finishExecution: (workflowId: string, status: 'completed' | 'failed', error?: string) => void
  
  // 워크플로우 템플릿
  saveAsTemplate: (workflowId: string, templateName: string) => void
  loadFromTemplate: (templateId: string) => Workflow
}

// 워크플로우 스토어 생성
export const useWorkflowStore = create<WorkflowStoreState>()(
  persist(
    ((set, get) => ({
      workflows: {},
      executionStatus: {},
      executionHistory: {},
      
      addWorkflow: (workflow) => set((state) => ({
        workflows: {
          ...state.workflows,
          [workflow.id]: workflow
        }
      })),
      
      updateWorkflow: (workflowId, updates) => set((state) => {
        const workflow = state.workflows[workflowId]
        if (!workflow) return state
        
        return {
          workflows: {
            ...state.workflows,
            [workflowId]: {
              ...workflow,
              ...updates,
              updatedAt: new Date().toISOString()
            }
          }
        }
      }),
      
      deleteWorkflow: (workflowId) => set((state) => {
        const { [workflowId]: _, ...workflows } = state.workflows
        return { workflows }
      }),
      
      addStep: (workflowId, step) => set((state) => {
        const workflow = state.workflows[workflowId]
        if (!workflow) return state
        
        return {
          workflows: {
            ...state.workflows,
            [workflowId]: {
              ...workflow,
              steps: [...workflow.steps, step],
              updatedAt: new Date().toISOString()
            }
          }
        }
      }),
      
      updateStep: (workflowId, stepId, updates) => set((state) => {
        const workflow = state.workflows[workflowId]
        if (!workflow) return state
        
        return {
          workflows: {
            ...state.workflows,
            [workflowId]: {
              ...workflow,
              steps: workflow.steps.map(step => 
                step.id === stepId ? { ...step, ...updates } : step
              ),
              updatedAt: new Date().toISOString()
            }
          }
        }
      }),
      
      deleteStep: (workflowId, stepId) => set((state) => {
        const workflow = state.workflows[workflowId]
        if (!workflow) return state
        
        return {
          workflows: {
            ...state.workflows,
            [workflowId]: {
              ...workflow,
              steps: workflow.steps.filter(step => step.id !== stepId),
              updatedAt: new Date().toISOString()
            }
          }
        }
      }),
      
      initExecution: (workflowId) => set((state) => {
        // 워크플로우가 존재하는지 확인
        const workflow = state.workflows[workflowId]
        if (!workflow) return state
        
        // 워크플로우 상태 업데이트
        const updatedWorkflow = {
          ...workflow,
          status: 'running' as const,
          lastRun: new Date().toISOString()
        }
        
        // 실행 상태 초기화
        const execution = {
          progress: 0,
          startTime: Date.now(),
          status: 'running' as const,
          logs: [{
            time: Date.now(),
            message: `워크플로우 '${workflow.name}' 실행 시작`,
            type: 'info' as const
          }]
        }
        
        return {
          workflows: {
            ...state.workflows,
            [workflowId]: updatedWorkflow
          },
          executionStatus: {
            ...state.executionStatus,
            [workflowId]: execution
          }
        }
      }),
      
      updateExecutionStatus: (workflowId, updates) => set((state) => {
        const execution = state.executionStatus[workflowId]
        if (!execution) return state
        
        return {
          executionStatus: {
            ...state.executionStatus,
            [workflowId]: {
              ...execution,
              ...updates
            }
          }
        }
      }),
      
      addExecutionLog: (workflowId, message, type) => set((state) => {
        const execution = state.executionStatus[workflowId]
        if (!execution) return state
        
        const log = {
          time: Date.now(),
          message,
          type
        }
        
        return {
          executionStatus: {
            ...state.executionStatus,
            [workflowId]: {
              ...execution,
              logs: [...execution.logs, log]
            }
          }
        }
      }),
      
      finishExecution: (workflowId, status, error) => set((state) => {
        const workflow = state.workflows[workflowId]
        const execution = state.executionStatus[workflowId]
        if (!workflow || !execution) return state
        
        // 워크플로우 상태 업데이트
        const updatedWorkflow = {
          ...workflow,
          status: status,
          lastRun: new Date().toISOString()
        }
        
        // 실행 상태 업데이트
        const updatedExecution = {
          ...execution,
          status,
          endTime: Date.now(),
          progress: status === 'completed' ? 100 : execution.progress,
          logs: [
            ...execution.logs,
            {
              time: Date.now(),
              message: status === 'completed' 
                ? `워크플로우 '${workflow.name}' 성공적으로 완료됨` 
                : `워크플로우 '${workflow.name}' 실패: ${error || '알 수 없는 오류'}`,
              type: status === 'completed' ? 'success' as const : 'error' as const
            }
          ]
        }
        
        // 히스토리 업데이트
        const history = state.executionHistory[workflowId] || []
        const newHistoryEntry = {
          id: `run-${Date.now()}`,
          startTime: execution.startTime,
          endTime: Date.now(),
          status,
          error
        }
        
        return {
          workflows: {
            ...state.workflows,
            [workflowId]: updatedWorkflow
          },
          executionStatus: {
            ...state.executionStatus,
            [workflowId]: updatedExecution
          },
          executionHistory: {
            ...state.executionHistory,
            [workflowId]: [newHistoryEntry, ...history].slice(0, 20) // 최대 20개 기록 유지
          }
        }
      }),
      
      saveAsTemplate: (workflowId, templateName) => {
        const workflow = get().workflows[workflowId]
        if (!workflow) return
        
        // 현재 워크플로우를 템플릿으로 저장하는 로직
        // 여기서는 간단하게 동일한 워크플로우를 새 ID로 저장
        const template: Workflow = {
          ...workflow,
          id: `template-${Date.now()}`,
          name: templateName,
          description: `템플릿: ${workflow.description}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'idle'
        }
        
        get().addWorkflow(template)
        return template.id
      },
      
      loadFromTemplate: (templateId) => {
        const template = get().workflows[templateId]
        if (!template) throw new Error(`템플릿을 찾을 수 없습니다: ${templateId}`)
        
        // 템플릿을 기반으로 새 워크플로우 생성
        const newWorkflow: Workflow = {
          ...template,
          id: `wf-${Date.now()}`,
          name: `${template.name} 복사본`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'idle'
        }
        
        get().addWorkflow(newWorkflow)
        return newWorkflow
      }
    })),
    {
      name: 'workflow-storage',
      partialize: (state) => ({
        workflows: state.workflows,
        executionHistory: state.executionHistory
      })
    }
  )
) 