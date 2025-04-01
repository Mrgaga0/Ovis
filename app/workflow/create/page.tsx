'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowStep } from '@/lib/workflow/executor';

// 단계 타입 설정
const STEP_TYPES = [
  { value: 'content', label: '콘텐츠 생성' },
  { value: 'analysis', label: '데이터 분석' },
  { value: 'design', label: '디자인 요소' },
  { value: 'deployment', label: '배포' },
  { value: 'notification', label: '알림' }
];

export default function CreateWorkflowPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // 워크플로우 기본 정보
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // 워크플로우 단계
  const [steps, setSteps] = useState<Partial<WorkflowStep>[]>([]);
  
  // 단계 추가
  const addStep = () => {
    const newStep: Partial<WorkflowStep> = {
      id: `step-${uuidv4()}`,
      name: '',
      type: 'content',
      config: {},
      dependencies: []
    };
    
    setSteps([...steps, newStep]);
  };
  
  // 단계 수정
  const updateStep = (index: number, field: string, value: any) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    setSteps(updatedSteps);
  };
  
  // 단계 삭제
  const removeStep = (index: number) => {
    const stepId = steps[index].id;
    
    // 삭제되는 단계에 의존하는 다른 단계의 의존성 제거
    const updatedSteps = steps.filter((_, i) => i !== index).map(step => {
      if (step.dependencies?.includes(stepId as string)) {
        return {
          ...step,
          dependencies: step.dependencies.filter(dep => dep !== stepId)
        };
      }
      return step;
    });
    
    setSteps(updatedSteps);
  };
  
  // 의존성 토글
  const toggleDependency = (stepIndex: number, dependencyId: string) => {
    const step = steps[stepIndex];
    const dependencies = step.dependencies || [];
    
    // 이미 의존성에 있다면 제거, 없다면 추가
    const updatedDependencies = dependencies.includes(dependencyId)
      ? dependencies.filter(dep => dep !== dependencyId)
      : [...dependencies, dependencyId];
    
    updateStep(stepIndex, 'dependencies', updatedDependencies);
  };
  
  // 워크플로우 생성 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 기본 유효성 검사
    if (!name.trim()) {
      setError('워크플로우 이름은 필수 항목입니다.');
      return;
    }
    
    if (steps.length === 0) {
      setError('워크플로우에는 최소 1개 이상의 단계가 필요합니다.');
      return;
    }
    
    // 단계 유효성 검사
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].name?.trim()) {
        setError(`단계 ${i + 1}의 이름을 입력해주세요.`);
        return;
      }
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      const response = await fetch('/api/workflow/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          steps
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '워크플로우 생성에 실패했습니다.');
      }
      
      // 성공 시 워크플로우 목록 페이지로 이동
      router.push('/workflow');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      console.error('워크플로우 생성 오류:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 취소 버튼 처리
  const handleCancel = () => {
    router.push('/workflow');
  };
  
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">새 워크플로우 생성</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 기본 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                워크플로우 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="워크플로우 이름을 입력하세요"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="워크플로우에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>
          </div>
        </div>
        
        {/* 단계 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">워크플로우 단계</h2>
            <button
              type="button"
              onClick={addStep}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              단계 추가
            </button>
          </div>
          
          {steps.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">아직 단계가 없습니다.</p>
              <button
                type="button"
                onClick={addStep}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              >
                첫 단계 추가하기
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={step.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">단계 {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        단계 이름 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={step.name || ''}
                        onChange={(e) => updateStep(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="단계 이름을 입력하세요"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        단계 유형
                      </label>
                      <select
                        value={step.type}
                        onChange={(e) => updateStep(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        {STEP_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* 의존성 설정 (선행 단계) */}
                  {index > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        의존성 (선행 단계)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {steps.slice(0, index).map((prevStep, prevIndex) => (
                          <label key={prevStep.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={step.dependencies?.includes(prevStep.id as string) || false}
                              onChange={() => toggleDependency(index, prevStep.id as string)}
                              className="rounded"
                            />
                            <span>단계 {prevIndex + 1}: {prevStep.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 단계별 설정 (추가 구현 필요) */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      단계 설정
                    </label>
                    <textarea
                      value={JSON.stringify(step.config || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          updateStep(index, 'config', JSON.parse(e.target.value));
                        } catch (err) {
                          // JSON 파싱 오류는 무시
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="{}"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JSON 형식으로 단계별 설정을 입력하세요
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 버튼 영역 */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md disabled:bg-blue-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? '생성 중...' : '워크플로우 생성'}
          </button>
        </div>
      </form>
    </div>
  );
} 