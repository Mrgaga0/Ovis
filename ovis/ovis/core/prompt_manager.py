import os
import json
import logging
from typing import Dict, Any, Optional, List
from string import Template

class PromptTemplate:
    """프롬프트 템플릿 클래스"""
    
    def __init__(self, name: str, template: str, description: str = "", 
                 variables: Optional[List[str]] = None, metadata: Optional[Dict[str, Any]] = None):
        """
        프롬프트 템플릿 초기화
        
        Args:
            name (str): 템플릿 이름
            template (str): 템플릿 문자열
            description (str, optional): 템플릿 설명
            variables (Optional[List[str]], optional): 필요한 변수 목록
            metadata (Optional[Dict[str, Any]], optional): 추가 메타데이터
        """
        self.name = name
        self.template = template
        self.description = description
        self.variables = variables or []
        self.metadata = metadata or {}
        self._template = Template(template)
    
    def format(self, **kwargs) -> str:
        """
        템플릿에 변수 값을 적용하여 최종 프롬프트 생성
        
        Args:
            **kwargs: 템플릿에 전달될 변수 값들
            
        Returns:
            str: 변수가 적용된 프롬프트 문자열
        
        Raises:
            KeyError: 필요한 변수가 전달되지 않은 경우
        """
        # 필수 변수 확인
        for var in self.variables:
            if var not in kwargs:
                raise KeyError(f"프롬프트 '{self.name}'에 필요한 변수 '{var}'가 제공되지 않았습니다.")
        
        return self._template.safe_substitute(**kwargs)
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        return {
            "name": self.name,
            "template": self.template,
            "description": self.description,
            "variables": self.variables,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PromptTemplate':
        """딕셔너리에서 객체 생성"""
        return cls(
            name=data["name"],
            template=data["template"],
            description=data.get("description", ""),
            variables=data.get("variables", []),
            metadata=data.get("metadata", {})
        )


class PromptManager:
    """프롬프트 템플릿을 관리하는 클래스"""
    
    def __init__(self, prompts_dir: str = "config/prompts"):
        """
        프롬프트 매니저 초기화
        
        Args:
            prompts_dir: 프롬프트 템플릿 파일이 저장된 디렉토리 경로
        """
        self.prompts_dir = prompts_dir
        self.logger = logging.getLogger(__name__)
        
        # 프롬프트 캐시
        self.prompts_cache: Dict[str, Dict[str, str]] = {}
        
        # 프롬프트 템플릿 로드
        self._load_prompts()
        
    def _load_prompts(self):
        """프롬프트 템플릿 파일 로드"""
        if not os.path.exists(self.prompts_dir):
            self.logger.warning(f"프롬프트 디렉토리가 존재하지 않습니다: {self.prompts_dir}")
            return
            
        # 각 카테고리 디렉토리 순회
        for category in os.listdir(self.prompts_dir):
            category_path = os.path.join(self.prompts_dir, category)
            
            if not os.path.isdir(category_path):
                continue
                
            # 카테고리 추가
            if category not in self.prompts_cache:
                self.prompts_cache[category] = {}
                
            # 카테고리 내 프롬프트 파일 로드
            for filename in os.listdir(category_path):
                if not filename.endswith('.txt'):
                    continue
                    
                prompt_name = os.path.splitext(filename)[0]
                file_path = os.path.join(category_path, filename)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        self.prompts_cache[category][prompt_name] = content
                        self.logger.debug(f"프롬프트 로드됨: {category}/{prompt_name}")
                except Exception as e:
                    self.logger.error(f"프롬프트 파일 로드 오류: {file_path} - {str(e)}")
    
    def get_prompt(self, category: str, name: str) -> Optional[str]:
        """
        지정된 카테고리와 이름의 프롬프트 템플릿을 반환
        
        Args:
            category: 프롬프트 카테고리
            name: 프롬프트 이름
            
        Returns:
            프롬프트 템플릿 문자열 또는 None (찾지 못한 경우)
        """
        if category not in self.prompts_cache or name not in self.prompts_cache[category]:
            # 캐시에 없으면 파일 직접 로드 시도
            file_path = os.path.join(self.prompts_dir, category, f"{name}.txt")
            
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # 캐시 업데이트
                    if category not in self.prompts_cache:
                        self.prompts_cache[category] = {}
                    self.prompts_cache[category][name] = content
                    
                    return content
                except Exception as e:
                    self.logger.error(f"프롬프트 파일 로드 오류: {file_path} - {str(e)}")
                    return None
            else:
                self.logger.warning(f"프롬프트를 찾을 수 없음: {category}/{name}")
                return None
        
        return self.prompts_cache[category][name]
        
    def list_categories(self) -> List[str]:
        """
        사용 가능한 프롬프트 카테고리 목록 반환
        
        Returns:
            카테고리 이름 목록
        """
        categories = []
        
        if os.path.exists(self.prompts_dir):
            for item in os.listdir(self.prompts_dir):
                item_path = os.path.join(self.prompts_dir, item)
                if os.path.isdir(item_path):
                    categories.append(item)
                    
        return categories
        
    def list_prompts(self, category: str) -> List[str]:
        """
        지정된 카테고리에서 사용 가능한 프롬프트 템플릿 목록 반환
        
        Args:
            category: 프롬프트 카테고리
            
        Returns:
            프롬프트 이름 목록
        """
        prompts = []
        category_path = os.path.join(self.prompts_dir, category)
        
        if os.path.exists(category_path) and os.path.isdir(category_path):
            for filename in os.listdir(category_path):
                if filename.endswith('.txt'):
                    prompt_name = os.path.splitext(filename)[0]
                    prompts.append(prompt_name)
                    
        return prompts
        
    def save_prompt(self, category: str, name: str, content: str) -> bool:
        """
        새 프롬프트 템플릿 저장 또는 기존 템플릿 업데이트
        
        Args:
            category: 프롬프트 카테고리
            name: 프롬프트 이름
            content: 프롬프트 내용
            
        Returns:
            성공 여부
        """
        # 카테고리 디렉토리 확인 및 생성
        category_path = os.path.join(self.prompts_dir, category)
        os.makedirs(category_path, exist_ok=True)
        
        # 파일에 프롬프트 저장
        file_path = os.path.join(category_path, f"{name}.txt")
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            # 캐시 업데이트
            if category not in self.prompts_cache:
                self.prompts_cache[category] = {}
            self.prompts_cache[category][name] = content
            
            self.logger.info(f"프롬프트 저장됨: {category}/{name}")
            return True
            
        except Exception as e:
            self.logger.error(f"프롬프트 저장 오류: {file_path} - {str(e)}")
            return False
            
    def delete_prompt(self, category: str, name: str) -> bool:
        """
        프롬프트 템플릿 삭제
        
        Args:
            category: 프롬프트 카테고리
            name: 프롬프트 이름
            
        Returns:
            성공 여부
        """
        file_path = os.path.join(self.prompts_dir, category, f"{name}.txt")
        
        if not os.path.exists(file_path):
            self.logger.warning(f"삭제할 프롬프트를 찾을 수 없음: {category}/{name}")
            return False
            
        try:
            os.remove(file_path)
            
            # 캐시에서 제거
            if category in self.prompts_cache and name in self.prompts_cache[category]:
                del self.prompts_cache[category][name]
                
            self.logger.info(f"프롬프트 삭제됨: {category}/{name}")
            return True
            
        except Exception as e:
            self.logger.error(f"프롬프트 삭제 오류: {file_path} - {str(e)}")
            return False 