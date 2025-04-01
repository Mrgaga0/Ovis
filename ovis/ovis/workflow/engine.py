#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
워크플로우 엔진 - 워크플로우 정의 및 실행 시스템
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable, Union
import uuid

try:
    import yaml
except ImportError:
    yaml = None

class Task:
    """작업 클래스 - 워크플로우의 단일 작업 정의"""
    
    def __init__(self, id: str, handler: str, parameters: Dict[str, Any] = None, description: str = None):
        self.id = id
        self.handler = handler
        self.parameters = parameters or {}
        self.description = description or f"{handler} 작업"
        self.status = "pending"  # pending, running, completed, failed
        self.result = None
        self.error = None
        self.start_time = None
        self.end_time = None
    
    def to_dict(self) -> Dict[str, Any]:
        """작업을 딕셔너리로 변환"""
        return {
            "id": self.id,
            "handler": self.handler,
            "parameters": self.parameters,
            "description": self.description,
            "status": self.status
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """딕셔너리에서 작업 생성"""
        return cls(
            id=data["id"],
            handler=data.get("handler", data.get("type", "")),
            parameters=data.get("parameters", data.get("params", {})),
            description=data.get("description", "")
        )

class Workflow:
    """워크플로우 클래스 - 연속적인 작업들의 집합"""
    
    def __init__(self, id: str, name: str, description: str = "", tasks: List[Task] = None):
        """초기화"""
        self.id = id
        self.name = name
        self.description = description
        self.tasks = tasks or []
        self.status = "pending"  # pending, running, completed, failed
        self.result = None
        self.error = None
        self.current_task_index = -1
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
    
    def add_task(self, task: Task) -> None:
        """작업 추가"""
        self.tasks.append(task)
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """워크플로우를 딕셔너리로 변환"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "tasks": [task.to_dict() for task in self.tasks]
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Workflow':
        """딕셔너리에서 워크플로우 생성"""
        workflow = cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", "")
        )
        
        # 작업 추가
        for task_data in data.get("tasks", []):
            workflow.add_task(Task.from_dict(task_data))
            
        return workflow
    
    @classmethod
    def from_yaml(cls, file_path: str) -> 'Workflow':
        """YAML 파일에서 워크플로우 생성"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            
        # 기본 정보 가져오기
        workflow = cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", "")
        )
        
        # 작업 추가
        for task_data in data.get("tasks", []):
            workflow.add_task(Task(
                id=task_data["id"],
                handler=task_data["handler"],
                parameters=task_data.get("parameters", {}),
                description=task_data.get("description", "")
            ))
            
        return workflow
    
    def to_yaml(self, file_path: str) -> None:
        """워크플로우를 YAML 파일로 저장"""
        data = self.to_dict()
        
        with open(file_path, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True)


class WorkflowEngine:
    """워크플로우 엔진 - 워크플로우 실행 및 관리"""
    
    def __init__(self):
        """초기화"""
        self.task_handlers = {}
        self.workflows = {}
        self.cancel_execution = False
        
        # 콜백 함수
        self.on_task_start = None
        self.on_task_complete = None
        self.on_task_fail = None
    
    def register_task_handler(self, handler_type: str, handler_func: Callable) -> None:
        """작업 타입에 대한 핸들러 함수 등록"""
        self.task_handlers[handler_type] = handler_func
    
    async def execute_workflow(self, workflow: Workflow) -> Dict[str, Any]:
        """워크플로우 실행"""
        logging.info(f"워크플로우 '{workflow.name}' 실행 시작")
        
        workflow.status = "running"
        workflow.current_task_index = -1
        results = {}
        
        # 취소 플래그 초기화
        self.cancel_execution = False
        
        try:
            for i, task in enumerate(workflow.tasks):
                # 취소 요청 확인
                if self.cancel_execution:
                    logging.warning(f"워크플로우 '{workflow.name}' 실행이 취소되었습니다.")
                    workflow.status = "failed"
                    workflow.error = "사용자에 의해 취소됨"
                    return results
                
                workflow.current_task_index = i
                
                # 작업 실행
                task_result = await self._execute_task(task, results)
                results[task.id] = task_result
                
            # 워크플로우 완료
            workflow.status = "completed"
            workflow.result = results
            logging.info(f"워크플로우 '{workflow.name}' 실행 완료")
            
            return results
            
        except Exception as e:
            # 워크플로우 실패
            workflow.status = "failed"
            workflow.error = str(e)
            logging.error(f"워크플로우 '{workflow.name}' 실행 실패: {e}")
            raise
    
    async def _execute_task(self, task: Task, previous_results: Dict[str, Any]) -> Any:
        """단일 작업 실행"""
        task.status = "running"
        task.start_time = datetime.now()
        
        # 작업 시작 콜백 호출
        if self.on_task_start:
            self.on_task_start(task.id)
        
        logging.info(f"작업 '{task.id}' ({task.handler}) 실행 시작")
        
        try:
            # 핸들러 함수 가져오기
            handler = self.task_handlers.get(task.handler)
            if not handler:
                raise ValueError(f"작업 타입 '{task.handler}'에 대한 핸들러가 없습니다.")
            
            # 파라미터 준비 - 이전 작업 결과 참조 처리
            params = await self._process_params(task.parameters, previous_results)
            
            # 작업 실행
            result = await handler(params)
            
            # 작업 완료
            task.status = "completed"
            task.result = result
            task.end_time = datetime.now()
            
            # 작업 완료 콜백 호출
            if self.on_task_complete:
                self.on_task_complete(task.id, result)
            
            logging.info(f"작업 '{task.id}' 실행 완료")
            
            return result
            
        except Exception as e:
            # 작업 실패
            task.status = "failed"
            task.error = str(e)
            task.end_time = datetime.now()
            
            # 작업 실패 콜백 호출
            if self.on_task_fail:
                self.on_task_fail(task.id, str(e))
            
            logging.error(f"작업 '{task.id}' 실행 실패: {e}")
            
            raise
    
    async def _process_params(self, params: Dict[str, Any], results: Dict[str, Any]) -> Dict[str, Any]:
        """파라미터 전처리 - 변수 참조 처리"""
        processed_params = {}
        
        # previous_result 파라미터 처리
        if "previous_result" in params and params["previous_result"]:
            task_id = params["previous_result"]
            
            # $로 시작하는 참조 처리
            if isinstance(task_id, str) and task_id.startswith("$"):
                task_id = task_id[1:]  # $ 문자 제거
                
            if task_id in results:
                processed_params["previous_result"] = results[task_id]
        
        # 나머지 파라미터 복사
        for key, value in params.items():
            if key != "previous_result":
                # 문자열인 경우 변수 참조 처리
                if isinstance(value, str) and value.startswith("$"):
                    # $task_id.result_key 형식 처리
                    parts = value[1:].split(".")
                    task_id = parts[0]
                    
                    if task_id in results:
                        result = results[task_id]
                        
                        # 중첩된 키 처리
                        for part in parts[1:]:
                            if isinstance(result, dict) and part in result:
                                result = result[part]
                            else:
                                result = None
                                break
                        
                        processed_params[key] = result
                    else:
                        processed_params[key] = value
                else:
                    processed_params[key] = value
        
        return processed_params 

    def get_workflows(self):
        """모든 워크플로우 반환"""
        return list(self.workflows.values()) 

    def create_workflow_from_dict(self, workflow_dict):
        """딕셔너리로부터 워크플로우 생성"""
        try:
            # 기본 정보 확인
            if 'id' not in workflow_dict or 'name' not in workflow_dict:
                raise ValueError("워크플로우 ID와 이름이 필요합니다")
                
            # 작업 목록 확인
            if 'tasks' not in workflow_dict or not isinstance(workflow_dict['tasks'], list):
                workflow_dict['tasks'] = []
                
            # 워크플로우 객체 생성
            workflow = Workflow(
                id=workflow_dict['id'],
                name=workflow_dict['name'],
                description=workflow_dict.get('description', ''),
                tasks=[]
            )
            
            # 작업 추가
            for task_dict in workflow_dict['tasks']:
                handler = task_dict.get('handler')
                if not handler or handler not in self.task_handlers:
                    continue
                    
                task = Task(
                    id=task_dict.get('id', str(uuid.uuid4())),
                    handler=handler,
                    parameters=task_dict.get('parameters', {}),
                    description=task_dict.get('description', f"{handler} 작업")
                )
                workflow.tasks.append(task)
                
            # 워크플로우 등록
            self.workflows[workflow.id] = workflow
            return workflow
            
        except Exception as e:
            logging.error(f"워크플로우 생성 오류: {e}")
            raise
            
    def update_workflow(self, workflow):
        """워크플로우 업데이트"""
        if not isinstance(workflow, Workflow):
            raise TypeError("Workflow 객체가 필요합니다")
            
        self.workflows[workflow.id] = workflow
        return workflow 