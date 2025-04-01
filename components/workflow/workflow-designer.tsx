'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, Play, Pause, RotateCcw } from "lucide-react";
import { WorkflowCanvas } from "./workflow-canvas";

// 워크플로우 노드 타입
export type NodeType = 'trigger' | 'action' | 'condition' | 'notification';

// 워크플로우 노드 인터페이스
export interface IWorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  data: any;
}

// 워크플로우 연결 인터페이스
export interface IWorkflowConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// 워크플로우 인터페이스
export interface IWorkflow {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  nodes: IWorkflowNode[];
  connections: IWorkflowConnection[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowDesignerProps {
  workflow?: IWorkflow;
  onSave?: (workflow: IWorkflow) => Promise<void>;
  onRun?: (workflowId: string) => Promise<void>;
  onPause?: (workflowId: string) => Promise<void>;
  onDelete?: (workflowId: string) => Promise<void>;
  readOnly?: boolean;
}

// 기본 워크플로우 템플릿
const DEFAULT_WORKFLOW: Omit<IWorkflow, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '새 워크플로우',
  description: '',
  status: 'draft',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      label: '시작',
      position: { x: 250, y: 100 },
      data: { type: 'manual' }
    }
  ],
  connections: []
};

// 노드 타입 정의
const NODE_TYPES = [
  { value: 'trigger', label: '트리거', description: '워크플로우 시작 조건' },
  { value: 'action', label: '액션', description: '작업 실행' },
  { value: 'condition', label: '조건', description: '분기 처리' },
  { value: 'notification', label: '알림', description: '알림 전송' }
];

export function WorkflowDesigner({
  workflow,
  onSave,
  onRun,
  onPause,
  onDelete,
  readOnly = false
}: WorkflowDesignerProps) {
  const { toast } = useToast();
  const [currentWorkflow, setCurrentWorkflow] = useState<IWorkflow | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isNameValid, setIsNameValid] = useState<boolean>(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 워크플로우 초기화
  useEffect(() => {
    if (workflow) {
      setCurrentWorkflow(workflow);
    } else {
      // 새 워크플로우 생성
      setCurrentWorkflow({
        ...DEFAULT_WORKFLOW,
        id: `workflow-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }, [workflow]);

  // 이름 유효성 검사
  const validateName = useCallback((name: string) => {
    const isValid = name.trim().length > 0;
    setIsNameValid(isValid);
    return isValid;
  }, []);

  // 워크플로우 이름 변경
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentWorkflow) return;
    
    const newName = e.target.value;
    validateName(newName);
    
    setCurrentWorkflow({
      ...currentWorkflow,
      name: newName
    });
  };

  // 워크플로우 설명 변경
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentWorkflow) return;
    
    setCurrentWorkflow({
      ...currentWorkflow,
      description: e.target.value
    });
  };

  // 노드 추가
  const handleAddNode = (type: NodeType) => {
    if (!currentWorkflow) return;
    
    const newNode: IWorkflowNode = {
      id: `${type}-${Date.now()}`,
      type,
      label: NODE_TYPES.find(t => t.value === type)?.label || type,
      position: { x: 250, y: 250 },
      data: {}
    };
    
    setCurrentWorkflow({
      ...currentWorkflow,
      nodes: [...currentWorkflow.nodes, newNode]
    });
    
    toast({
      title: '노드 추가됨',
      description: `${newNode.label} 노드가 추가되었습니다.`
    });
  };

  // 노드 업데이트
  const handleUpdateNode = (updatedNode: IWorkflowNode) => {
    if (!currentWorkflow) return;
    
    setCurrentWorkflow({
      ...currentWorkflow,
      nodes: currentWorkflow.nodes.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      )
    });
  };

  // 노드 삭제
  const handleDeleteNode = (nodeId: string) => {
    if (!currentWorkflow) return;
    
    // 관련 연결도 함께 삭제
    const filteredConnections = currentWorkflow.connections.filter(
      conn => conn.source !== nodeId && conn.target !== nodeId
    );
    
    setCurrentWorkflow({
      ...currentWorkflow,
      nodes: currentWorkflow.nodes.filter(node => node.id !== nodeId),
      connections: filteredConnections
    });
    
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    
    toast({
      title: '노드 삭제됨',
      description: '선택된 노드가 삭제되었습니다.'
    });
  };

  // 연결 추가
  const handleAddConnection = (connection: Omit<IWorkflowConnection, 'id'>) => {
    if (!currentWorkflow) return;
    
    const newConnection: IWorkflowConnection = {
      id: `conn-${Date.now()}`,
      ...connection
    };
    
    setCurrentWorkflow({
      ...currentWorkflow,
      connections: [...currentWorkflow.connections, newConnection]
    });
  };

  // 연결 삭제
  const handleDeleteConnection = (connectionId: string) => {
    if (!currentWorkflow) return;
    
    setCurrentWorkflow({
      ...currentWorkflow,
      connections: currentWorkflow.connections.filter(conn => conn.id !== connectionId)
    });
  };

  // 노드 선택
  const handleSelectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  };

  // 캔버스 업데이트
  const handleCanvasUpdate = (nodes: IWorkflowNode[], connections: IWorkflowConnection[]) => {
    if (!currentWorkflow) return;
    
    setCurrentWorkflow({
      ...currentWorkflow,
      nodes,
      connections
    });
  };

  // 워크플로우 저장
  const handleSave = async () => {
    if (!currentWorkflow) return;
    if (!validateName(currentWorkflow.name)) return;
    
    if (onSave) {
      setIsSaving(true);
      
      try {
        // 업데이트 시각 갱신
        const updatedWorkflow = {
          ...currentWorkflow,
          updatedAt: new Date().toISOString()
        };
        
        await onSave(updatedWorkflow);
        
        toast({
          title: '저장 완료',
          description: '워크플로우가 성공적으로 저장되었습니다.'
        });
        
        setIsEditing(false);
      } catch (error) {
        console.error('워크플로우 저장 오류:', error);
        toast({
          title: '저장 실패',
          description: '워크플로우 저장 중 오류가 발생했습니다.',
          variant: 'destructive'
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 워크플로우 실행
  const handleRun = async () => {
    if (!currentWorkflow || !onRun) return;
    
    try {
      await onRun(currentWorkflow.id);
      
      setCurrentWorkflow({
        ...currentWorkflow,
        status: 'active'
      });
      
      toast({
        title: '워크플로우 실행',
        description: '워크플로우가 성공적으로 실행되었습니다.'
      });
    } catch (error) {
      console.error('워크플로우 실행 오류:', error);
      toast({
        title: '실행 실패',
        description: '워크플로우 실행 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  // 워크플로우 일시 중지
  const handlePause = async () => {
    if (!currentWorkflow || !onPause) return;
    
    try {
      await onPause(currentWorkflow.id);
      
      setCurrentWorkflow({
        ...currentWorkflow,
        status: 'paused'
      });
      
      toast({
        title: '워크플로우 일시 중지',
        description: '워크플로우가 일시 중지되었습니다.'
      });
    } catch (error) {
      console.error('워크플로우 일시 중지 오류:', error);
      toast({
        title: '일시 중지 실패',
        description: '워크플로우 일시 중지 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  // 워크플로우 삭제
  const handleDelete = async () => {
    if (!currentWorkflow || !onDelete) return;
    
    try {
      await onDelete(currentWorkflow.id);
      
      toast({
        title: '워크플로우 삭제',
        description: '워크플로우가 성공적으로 삭제되었습니다.'
      });
    } catch (error) {
      console.error('워크플로우 삭제 오류:', error);
      toast({
        title: '삭제 실패',
        description: '워크플로우 삭제 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  if (!currentWorkflow) {
    return <div>워크플로우 로딩 중...</div>;
  }

  // 선택된 노드 정보
  const selectedNode = currentWorkflow.nodes.find(node => node.id === selectedNodeId);

  return (
    <div className="flex flex-col h-full">
      {/* 상단 도구 모음 */}
      <div className="bg-background border-b p-4 flex justify-between items-center">
        <div className="flex-1">
          <Input
            value={currentWorkflow.name}
            onChange={handleNameChange}
            placeholder="워크플로우 이름"
            className={`text-lg font-medium w-[300px] ${!isNameValid ? 'border-red-500' : ''}`}
            readOnly={readOnly}
          />
          {!isNameValid && (
            <p className="text-red-500 text-xs mt-1">이름은 필수입니다</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!readOnly && (
            <>
              <Button
                variant="secondary"
                onClick={handleSave}
                disabled={isSaving || !isNameValid}
              >
                <Save className="mr-2 h-4 w-4" />
                저장
              </Button>
              
              {currentWorkflow.status === 'active' ? (
                <Button
                  variant="outline"
                  onClick={handlePause}
                  disabled={!onPause}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  일시 중지
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleRun}
                  disabled={!onRun}
                >
                  <Play className="mr-2 h-4 w-4" />
                  실행
                </Button>
              )}
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>워크플로우 삭제</SheetTitle>
                    <SheetDescription>
                      정말 이 워크플로우를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-8">
                    <p className="text-muted-foreground">
                      워크플로우 이름: <span className="font-medium text-foreground">{currentWorkflow.name}</span>
                    </p>
                    <p className="text-muted-foreground mt-2">
                      노드 수: <span className="font-medium text-foreground">{currentWorkflow.nodes.length}</span>
                    </p>
                  </div>
                  <SheetFooter className="mt-8">
                    <SheetClose asChild>
                      <Button variant="outline">취소</Button>
                    </SheetClose>
                    <Button variant="destructive" onClick={handleDelete}>
                      삭제
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
      
      {/* 메인 워크스페이스 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽 도구 패널 */}
        {!readOnly && (
          <div className="w-64 border-r bg-background p-4 flex flex-col overflow-auto">
            <h3 className="text-sm font-medium mb-4">노드 추가</h3>
            <div className="space-y-2">
              {NODE_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddNode(type.value as NodeType)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {type.label}
                </Button>
              ))}
            </div>
            
            {selectedNode && (
              <div className="mt-8">
                <h3 className="text-sm font-medium mb-4">노드 속성</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground">라벨</label>
                    <Input
                      value={selectedNode.label}
                      onChange={(e) => {
                        handleUpdateNode({
                          ...selectedNode,
                          label: e.target.value
                        });
                      }}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground">타입</label>
                    <p className="text-sm font-medium mt-1">
                      {NODE_TYPES.find(t => t.value === selectedNode.type)?.label || selectedNode.type}
                    </p>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => handleDeleteNode(selectedNode.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    노드 삭제
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 중앙 캔버스 */}
        <div className="flex-1 overflow-hidden bg-slate-50">
          <WorkflowCanvas
            nodes={currentWorkflow.nodes}
            connections={currentWorkflow.connections}
            onNodesChange={handleCanvasUpdate}
            onSelectNode={handleSelectNode}
            onAddConnection={handleAddConnection}
            onDeleteConnection={handleDeleteConnection}
            readOnly={readOnly}
          />
        </div>
        
        {/* 오른쪽 정보 패널 */}
        <div className="w-72 border-l bg-background p-4 overflow-auto">
          <Tabs defaultValue="info">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">정보</TabsTrigger>
              <TabsTrigger value="nodes" className="flex-1">노드</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="pt-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground">설명</label>
                  <Input
                    value={currentWorkflow.description || ''}
                    onChange={handleDescriptionChange}
                    placeholder="워크플로우 설명"
                    className="mt-1"
                    readOnly={readOnly}
                  />
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">상태</label>
                  <p className="text-sm font-medium mt-1">
                    {currentWorkflow.status === 'draft' && '초안'}
                    {currentWorkflow.status === 'active' && '활성'}
                    {currentWorkflow.status === 'paused' && '일시 중지'}
                    {currentWorkflow.status === 'archived' && '보관됨'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">생성일</label>
                  <p className="text-sm font-medium mt-1">
                    {new Date(currentWorkflow.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">수정일</label>
                  <p className="text-sm font-medium mt-1">
                    {new Date(currentWorkflow.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="nodes" className="pt-4">
              <div className="space-y-2">
                {currentWorkflow.nodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">노드가 없습니다.</p>
                ) : (
                  currentWorkflow.nodes.map((node) => (
                    <Card
                      key={node.id}
                      className={`cursor-pointer hover:bg-accent/50 ${selectedNodeId === node.id ? 'border-primary' : ''}`}
                      onClick={() => handleSelectNode(node.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{node.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {NODE_TYPES.find(t => t.value === node.type)?.label || node.type}
                            </p>
                          </div>
                          
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNode(node.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 