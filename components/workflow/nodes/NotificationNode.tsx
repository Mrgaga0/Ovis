import React from 'react';
import { Handle, Position } from 'reactflow';

interface NotificationNodeProps {
  data: {
    label: string;
    channel?: string;
    [key: string]: any;
  };
  selected?: boolean;
}

export default function NotificationNode({ data, selected }: NotificationNodeProps) {
  return (
    <div className={`border-2 rounded-lg p-3 min-w-[160px] bg-emerald-50 border-emerald-400 ${selected ? 'ring-2 ring-emerald-500' : ''}`}>
      <div className="font-medium text-emerald-900">{data.label}</div>
      <div className="text-xs mt-1 text-emerald-700">
        {data.channel ? `알림: ${data.channel}` : '알림'}
      </div>
      
      {/* 입력 핸들 (왼쪽) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#10b981', width: 8, height: 8 }}
        id="input"
      />
      
      {/* 출력 핸들 (오른쪽) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#10b981', width: 8, height: 8 }}
        id="output"
      />
    </div>
  );
} 