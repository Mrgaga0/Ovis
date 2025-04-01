import React from 'react';
import { Handle, Position } from 'reactflow';

interface ConditionNodeProps {
  data: {
    label: string;
    condition?: string;
    [key: string]: any;
  };
  selected?: boolean;
}

export default function ConditionNode({ data, selected }: ConditionNodeProps) {
  return (
    <div className={`border-2 rounded-lg p-3 min-w-[160px] bg-amber-50 border-amber-400 ${selected ? 'ring-2 ring-amber-500' : ''}`}>
      <div className="font-medium text-amber-900">{data.label}</div>
      <div className="text-xs mt-1 text-amber-700">
        {data.condition ? `조건: ${data.condition}` : '조건'}
      </div>
      
      {/* 입력 핸들 (왼쪽) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#f59e0b', width: 8, height: 8 }}
        id="input"
      />
      
      {/* 출력 핸들 (오른쪽 상단) - 조건 참 */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#f59e0b', width: 8, height: 8, top: '35%' }}
        id="true"
      />
      
      {/* 출력 핸들 (오른쪽 하단) - 조건 거짓 */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#f59e0b', width: 8, height: 8, top: '75%' }}
        id="false"
      />
    </div>
  );
} 