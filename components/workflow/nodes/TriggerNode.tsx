import React from 'react';
import { Handle, Position } from 'reactflow';

interface TriggerNodeProps {
  data: {
    label: string;
    type?: string;
    [key: string]: any;
  };
  selected?: boolean;
}

export default function TriggerNode({ data, selected }: TriggerNodeProps) {
  return (
    <div className={`border-2 rounded-lg p-3 min-w-[160px] bg-sky-50 border-sky-400 ${selected ? 'ring-2 ring-sky-500' : ''}`}>
      <div className="font-medium text-sky-900">{data.label}</div>
      <div className="text-xs mt-1 text-sky-700">
        {data.type ? `트리거: ${data.type}` : '트리거'}
      </div>
      {/* 출력 핸들 (오른쪽) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#0ea5e9', width: 8, height: 8 }}
        id="output"
      />
    </div>
  );
} 