import React from 'react';
import { Handle, Position } from 'reactflow';

interface ActionNodeProps {
  data: {
    label: string;
    action?: string;
    [key: string]: any;
  };
  selected?: boolean;
}

export default function ActionNode({ data, selected }: ActionNodeProps) {
  return (
    <div className={`border-2 rounded-lg p-3 min-w-[160px] bg-purple-50 border-purple-400 ${selected ? 'ring-2 ring-purple-500' : ''}`}>
      <div className="font-medium text-purple-900">{data.label}</div>
      <div className="text-xs mt-1 text-purple-700">
        {data.action ? `액션: ${data.action}` : '액션'}
      </div>
      
      {/* 입력 핸들 (왼쪽) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#8b5cf6', width: 8, height: 8 }}
        id="input"
      />
      
      {/* 출력 핸들 (오른쪽) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#8b5cf6', width: 8, height: 8 }}
        id="output"
      />
    </div>
  );
} 