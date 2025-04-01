'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  MarkerType,
  NodeTypes,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { IWorkflowNode, IWorkflowConnection, NodeType } from './workflow-designer';

// 노드 컴포넌트 직접 import
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';
import NotificationNode from './nodes/NotificationNode';

// 노드 타입 등록
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  notification: NotificationNode,
};

// 노드 스타일 매핑
const NODE_STYLES = {
  trigger: {
    borderColor: '#0ea5e9',
    backgroundColor: '#e0f2fe',
  },
  action: {
    borderColor: '#8b5cf6',
    backgroundColor: '#ede9fe',
  },
  condition: {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7',
  },
  notification: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
};

export interface WorkflowCanvasProps {
  nodes: IWorkflowNode[];
  connections: IWorkflowConnection[];
  onNodesChange: (nodes: IWorkflowNode[], connections: IWorkflowConnection[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  onAddConnection: (connection: Omit<IWorkflowConnection, 'id'>) => void;
  onDeleteConnection: (connectionId: string) => void;
  readOnly?: boolean;
}

// 워크플로우 노드를 ReactFlow 노드로 변환
const workflowNodesToReactFlowNodes = (nodes: IWorkflowNode[]): Node[] => {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: node.label,
      ...node.data,
    },
    style: {
      ...NODE_STYLES[node.type as NodeType],
    },
  }));
};

// 워크플로우 연결을 ReactFlow 엣지로 변환
const workflowConnectionsToReactFlowEdges = (
  connections: IWorkflowConnection[]
): Edge[] => {
  return connections.map((connection) => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    label: connection.label,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
    style: {
      strokeWidth: 2,
    },
  }));
};

// ReactFlow 노드를 워크플로우 노드로 변환
const reactFlowNodesToWorkflowNodes = (nodes: Node[]): IWorkflowNode[] => {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type as NodeType,
    label: node.data.label,
    position: node.position,
    data: { ...node.data },
  }));
};

// ReactFlow 엣지를 워크플로우 연결로 변환
const reactFlowEdgesToWorkflowConnections = (
  edges: Edge[]
): IWorkflowConnection[] => {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label ? String(edge.label) : undefined,
  }));
};

// 실제 캔버스 컴포넌트
function WorkflowCanvasContent({
  nodes,
  connections,
  onNodesChange,
  onSelectNode,
  onAddConnection,
  onDeleteConnection,
  readOnly = false,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  // ReactFlow 상태
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);

  // 노드와 연결 변환
  useEffect(() => {
    const newNodes = workflowNodesToReactFlowNodes(nodes);
    const newEdges = workflowConnectionsToReactFlowEdges(connections);
    
    setFlowNodes(newNodes);
    setFlowEdges(newEdges);
  }, [nodes, connections]);

  // 캔버스에 맞추기
  useEffect(() => {
    if (flowNodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    }
  }, [fitView, flowNodes.length]);

  // 노드 변경 처리
  const handleNodesChange = (changes: NodeChange[]) => {
    const nextNodes = applyNodeChanges(changes, flowNodes);
    setFlowNodes(nextNodes);
    
    const workflowNodes = reactFlowNodesToWorkflowNodes(nextNodes);
    onNodesChange(workflowNodes, connections);
  };

  // 엣지 변경 처리
  const handleEdgesChange = (changes: EdgeChange[]) => {
    const nextEdges = applyEdgeChanges(changes, flowEdges);
    setFlowEdges(nextEdges);
    
    const workflowConnections = reactFlowEdgesToWorkflowConnections(nextEdges);
    onNodesChange(nodes, workflowConnections);
  };

  // 연결 처리
  const handleConnect = (params: Connection) => {
    // 입력 검증
    if (!params.source || !params.target) return;
    
    const newConnection: Omit<IWorkflowConnection, 'id'> = {
      source: params.source,
      target: params.target
    };
    
    onAddConnection(newConnection);
  };

  // 노드 선택 처리
  const handleNodeClick = (e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    onSelectNode(node.id);
  };

  // 캔버스 클릭 처리
  const handlePaneClick = () => {
    onSelectNode(null);
  };

  return (
    <div className="h-full w-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.2}
        maxZoom={4}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={true}
        panOnDrag={true}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#e2e8f0"
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}

// ReactFlow 제공자로 감싸기
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasContent {...props} />
    </ReactFlowProvider>
  );
} 