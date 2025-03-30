import os
import json
import glob
import uuid
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from .engine import Workflow, Task, WorkflowEngine

class WorkflowManager:
    """워크플로우 관리 클래스"""
    
    def __init__(self, config_manager, workflow_engine: WorkflowEngine = None):
        self.config_manager = config_manager
        self.engine = workflow_engine or WorkflowEngine()
        
        # 워크플로우 저장 경로
        self.workflows_dir = config_manager.get(
            "workflow", "default_workflows_path", "./config/workflows"
        )
        os.makedirs(self.workflows_dir, exist_ok=True)
        
        # 워크플로우 템플릿 경로
        self.templates_dir = os.path.join(self.workflows_dir, "templates")
        os.makedirs(self.templates_dir, exist_ok=True)
        
        # 워크플로우 인스턴스 저장 경로
        self.instances_dir = os.path.join(self.workflows_dir, "instances")
        os.makedirs(self.instances_dir, exist_ok=True)
        
    def get_templates(self) -> List[Dict[str, Any]]:
        """사용 가능한 워크플로우 템플릿 목록 가져오기"""
        templates = []
        
        for yaml_file in glob.glob(os.path.join(self.templates_dir, "*.yaml")):
            try:
                workflow = Workflow.from_yaml(yaml_file)
                templates.append({
                    "id": workflow.id,
                    "name": workflow.name,
                    "description": workflow.description,
                    "tasks_count": len(workflow.tasks),
                    "file_path": yaml_file
                })
            except Exception as e:
                logging.error(f"템플릿 로드 오류 ({yaml_file}): {e}")
                
        return templates
    
    def get_instances(self) -> List[Dict[str, Any]]:
        """실행된 워크플로우 인스턴스 목록 가져오기"""
        instances = []
        
        for json_file in glob.glob(os.path.join(self.instances_dir, "*.json")):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                instances.append({
                    "id": data.get("id", ""),
                    "name": data.get("name", ""),
                    "status": data.get("status", ""),
                    "created_at": data.get("created_at", ""),
                    "updated_at": data.get("updated_at", ""),
                    "file_path": json_file
                })
            except Exception as e:
                logging.error(f"인스턴스 로드 오류 ({json_file}): {e}")
                
        return sorted(instances, key=lambda x: x.get("created_at", ""), reverse=True)
    
    def create_workflow_from_template(self, template_id: str) -> Workflow:
        """템플릿에서 새 워크플로우 인스턴스 생성"""
        template_path = os.path.join(self.templates_dir, f"{template_id}.yaml")
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"템플릿을 찾을 수 없습니다: {template_id}")
            
        # 템플릿에서 워크플로우 로드
        workflow = Workflow.from_yaml(template_path)
        
        # 새 인스턴스 ID 생성
        workflow.id = f"{workflow.id}_{uuid.uuid4().hex[:8]}"
        workflow.created_at = datetime.now()
        workflow.updated_at = workflow.created_at
        
        # 워크플로우 저장
        self.save_workflow_instance(workflow)
        
        return workflow
    
    def save_workflow_instance(self, workflow: Workflow) -> str:
        """워크플로우 인스턴스 저장"""
        file_path = os.path.join(self.instances_dir, f"{workflow.id}.json")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(workflow.to_dict(), f, indent=2, ensure_ascii=False)
            
        return file_path
    
    def load_workflow_instance(self, workflow_id: str) -> Optional[Workflow]:
        """워크플로우 인스턴스 로드"""
        file_path = os.path.join(self.instances_dir, f"{workflow_id}.json")
        
        if not os.path.exists(file_path):
            return None
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            return Workflow.from_dict(data)
        except Exception as e:
            logging.error(f"워크플로우 인스턴스 로드 오류 ({workflow_id}): {e}")
            return None
    
    def delete_workflow_instance(self, workflow_id: str) -> bool:
        """워크플로우 인스턴스 삭제"""
        file_path = os.path.join(self.instances_dir, f"{workflow_id}.json")
        
        if not os.path.exists(file_path):
            return False
            
        try:
            os.remove(file_path)
            return True
        except Exception as e:
            logging.error(f"워크플로우 인스턴스 삭제 오류 ({workflow_id}): {e}")
            return False 