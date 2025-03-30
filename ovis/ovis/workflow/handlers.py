import asyncio
import logging
import json
import os
import time
from typing import Dict, Any, Optional, List, Callable

from ovis.api.gemini_client import GeminiClient
from ovis.api.brave_client import BraveSearchClient
from ovis.data.rss_crawler import RSSCrawler
from ovis.core.prompt_manager import PromptManager

# For demo purposes - would be replaced with actual implementations
async def search_web_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    """웹 검색 작업 핸들러"""
    query = params.get("query", "")
    limit = params.get("limit", 3)
    
    logging.info(f"웹 검색 수행: {query} (최대 {limit}개 결과)")
    
    # 검색 시뮬레이션 - 실제로는 BraveSearchClient 등을 사용
    await asyncio.sleep(2)  # 검색 시간 시뮬레이션
    
    return {
        "results": [
            {
                "title": f"검색 결과 1: {query}에 대한 정보",
                "url": "https://example.com/result1",
                "snippet": f"{query}에 대한 주요 정보와 최신 업데이트를 제공합니다."
            },
            {
                "title": f"검색 결과 2: {query} 관련 뉴스",
                "url": "https://example.com/result2",
                "snippet": f"{query}에 대한 최신 뉴스와 분석을 확인하세요."
            },
            {
                "title": f"검색 결과 3: {query} 튜토리얼",
                "url": "https://example.com/result3",
                "snippet": f"{query}를 쉽게 배우고 활용하는 방법을 알아보세요."
            }
        ][:limit],
        "query": query,
        "total_results": limit
    }

async def generate_text_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    """텍스트 생성 작업 핸들러"""
    prompt = params.get("prompt", "")
    length = params.get("length", 100)
    
    logging.info(f"텍스트 생성 수행: {prompt} (길이: {length})")
    
    # 텍스트 생성 시뮬레이션 - 실제로는 GeminiClient 등을 사용
    await asyncio.sleep(3)  # 생성 시간 시뮬레이션
    
    # 샘플 텍스트
    text = f"""
    {prompt}에 대한 생성된 텍스트입니다. 이것은 실제 AI 생성이 아닌 데모용 텍스트입니다.
    여기에 더 많은 내용이 포함될 수 있지만, 데모 목적으로 간단히 생성합니다.
    보다 실제적인 구현에서는 GeminiClient를 활용하여 고품질 콘텐츠를 생성할 수 있습니다.
    """
    
    return {
        "text": text[:length],
        "prompt": prompt,
        "length": len(text[:length])
    }

async def summarize_text_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    """텍스트 요약 작업 핸들러"""
    text = params.get("text", "")
    max_length = params.get("max_length", 100)
    
    # 이전 단계의 결과를 사용하는 경우
    if not text and "previous_result" in params:
        prev = params["previous_result"]
        if isinstance(prev, dict) and "text" in prev:
            text = prev["text"]
        elif isinstance(prev, dict) and "results" in prev:
            # 검색 결과를 텍스트로 변환
            text = "\n\n".join([f"{r['title']}\n{r['snippet']}" for r in prev["results"]])
    
    logging.info(f"텍스트 요약 수행: 길이 {len(text)} 텍스트 (최대 {max_length}자)")
    
    # 요약 시뮬레이션
    await asyncio.sleep(2)
    
    # 간단한 요약 (실제로는 AI 요약 모델 사용)
    summary = f"이것은 입력 텍스트에 대한 요약입니다. 원본은 {len(text)}자였으며, 이 요약은 더 짧습니다."
    
    return {
        "summary": summary[:max_length],
        "original_length": len(text),
        "summary_length": len(summary[:max_length])
    }

async def extract_info_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    """정보 추출 작업 핸들러"""
    fields = params.get("fields", [])
    source = params.get("source", {})
    
    # 이전 단계의 결과를 사용하는 경우
    if not source and "previous_result" in params:
        source = params["previous_result"]
    
    logging.info(f"정보 추출 수행: {fields} 필드 추출")
    
    # 추출 시뮬레이션
    await asyncio.sleep(1.5)
    
    # 결과 생성
    result = {}
    
    if isinstance(source, dict):
        for field in fields:
            if field in source:
                result[field] = source[field]
            # 중첩된 필드 처리 (예: results.0.title)
            elif "." in field:
                parts = field.split(".")
                value = source
                for part in parts:
                    if part.isdigit() and isinstance(value, list):
                        idx = int(part)
                        if 0 <= idx < len(value):
                            value = value[idx]
                        else:
                            value = None
                            break
                    elif isinstance(value, dict) and part in value:
                        value = value[part]
                    else:
                        value = None
                        break
                
                if value is not None:
                    # 마지막 부분을 키로 사용
                    result[parts[-1]] = value
    
    return {
        "extracted": result,
        "fields": fields
    }

async def translate_text_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    """텍스트 번역 작업 핸들러"""
    text = params.get("text", "")
    target_language = params.get("target_language", "en")
    
    # 이전 단계의 결과를 사용하는 경우
    if not text and "previous_result" in params:
        prev = params["previous_result"]
        if isinstance(prev, dict):
            if "text" in prev:
                text = prev["text"]
            elif "summary" in prev:
                text = prev["summary"]
            elif isinstance(prev.get("extracted"), dict):
                text = json.dumps(prev["extracted"], ensure_ascii=False)
    
    logging.info(f"텍스트 번역 수행: {target_language}로 {len(text)}자 번역")
    
    # 번역 시뮬레이션
    await asyncio.sleep(2)
    
    # 번역된 텍스트 (실제로는 번역 API 사용)
    translated = f"This is a translated text to {target_language}. Original had {len(text)} characters."
    
    return {
        "translated_text": translated,
        "source_text": text,
        "target_language": target_language
    }

async def send_email_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    """이메일 전송 작업 핸들러"""
    to = params.get("to", "")
    subject = params.get("subject", "")
    body = params.get("body", "")
    
    # 이전 단계의 결과를 사용하는 경우
    if not body and "previous_result" in params:
        prev = params["previous_result"]
        if isinstance(prev, dict):
            if "text" in prev:
                body = prev["text"]
            elif "translated_text" in prev:
                body = prev["translated_text"]
            elif "summary" in prev:
                body = prev["summary"]
    
    logging.info(f"이메일 전송 시뮬레이션: {to}, 제목: {subject}")
    
    # 이메일 전송 시뮬레이션
    await asyncio.sleep(1)
    
    return {
        "status": "sent",
        "to": to,
        "subject": subject,
        "body_length": len(body),
        "timestamp": time.time()
    }

async def save_to_file_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    """파일 저장 작업 핸들러"""
    filename = params.get("filename", f"output_{int(time.time())}.txt")
    content = params.get("content", "")
    format = params.get("format", "txt")  # txt, json, etc.
    
    # 이전 단계의 결과를 사용하는 경우
    if not content and "previous_result" in params:
        prev = params["previous_result"]
        if isinstance(prev, dict):
            if format == "json":
                content = json.dumps(prev, indent=2, ensure_ascii=False)
            elif "text" in prev:
                content = prev["text"]
            elif "translated_text" in prev:
                content = prev["translated_text"]
            elif "summary" in prev:
                content = prev["summary"]
            else:
                content = str(prev)
    
    # 파일 저장 위치
    output_dir = os.path.join(os.path.expanduser("~"), "ovis_outputs")
    os.makedirs(output_dir, exist_ok=True)
    
    file_path = os.path.join(output_dir, filename)
    logging.info(f"파일 저장: {file_path}")
    
    # 파일 저장 시뮬레이션 (실제로 저장하지는 않음)
    await asyncio.sleep(1)
    
    return {
        "status": "saved",
        "filename": filename,
        "path": file_path,
        "size": len(content),
        "timestamp": time.time()
    }

# 모든 핸들러를 딕셔너리로 등록
DEFAULT_TASK_HANDLERS = {
    "search_web": search_web_handler,
    "generate_text": generate_text_handler,
    "summarize_text": summarize_text_handler,
    "extract_info": extract_info_handler,
    "translate_text": translate_text_handler,
    "send_email": send_email_handler,
    "save_to_file": save_to_file_handler
}

def register_default_handlers(engine) -> None:
    """기본 작업 핸들러를 엔진에 등록"""
    for task_type, handler in DEFAULT_TASK_HANDLERS.items():
        engine.register_task_handler(task_type, handler)

class WorkflowHandlers:
    """워크플로우 작업 핸들러 모음"""
    
    def __init__(self, config_manager, prompt_manager: PromptManager):
        self.config_manager = config_manager
        self.prompt_manager = prompt_manager
        
        # API 클라이언트 초기화
        gemini_api_key = config_manager.get("api_keys", "gemini", "")
        brave_api_key = config_manager.get("api_keys", "brave_search", "")
        
        self.gemini_client = GeminiClient(gemini_api_key)
        self.brave_client = BraveSearchClient(brave_api_key)
        self.rss_crawler = RSSCrawler()
        
        # 작업 유형별 핸들러 함수 매핑
        self.handlers = {
            "rss_crawl": self.handle_rss_crawl,
            "ai_process": self.handle_ai_process,
            "brave_search": self.handle_brave_search,
            "rss_related_fetch": self.handle_rss_related_fetch,
            "user_interaction": self.handle_user_interaction,
        }
        
    def get_handler(self, task_type: str) -> Optional[Callable]:
        """작업 유형에 맞는 핸들러 함수 반환"""
        return self.handlers.get(task_type)
        
    async def handle_rss_crawl(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """RSS 피드 크롤링 핸들러"""
        sources = params.get("sources", [])
        time_range_days = params.get("time_range_days", 3)
        
        if not sources:
            raise ValueError("RSS 소스가 지정되지 않았습니다.")
            
        # RSS 피드 크롤링
        articles = await self.rss_crawler.fetch_multiple(sources, time_range_days)
        return articles
        
    async def handle_ai_process(self, params: Dict[str, Any], context: Dict[str, Any] = None) -> Any:
        """AI 처리 핸들러 (Gemini API 사용)"""
        prompt_template_path = params.get("prompt_template")
        input_from = params.get("input_from")
        output_format = params.get("output_format", "text")
        
        if not prompt_template_path:
            raise ValueError("프롬프트 템플릿이 지정되지 않았습니다.")
            
        # 프롬프트 템플릿 가져오기
        category, name = prompt_template_path.split("/")
        prompt_template = self.prompt_manager.get_prompt(category, name)
        
        if not prompt_template:
            raise ValueError(f"프롬프트 템플릿을 찾을 수 없습니다: {prompt_template_path}")
            
        # 입력 데이터 가져오기
        input_data = None
        if input_from and context and input_from in context:
            input_data = context[input_from]
            
        # 다중 입력 처리
        inputs = params.get("inputs", {})
        input_values = {}
        
        if inputs:
            for key, source in inputs.items():
                if source in context:
                    input_values[key] = context[source]
                else:
                    input_values[key] = source
        
        # 프롬프트 생성
        if inputs:
            # 다중 입력 사용
            prompt = prompt_template.format(**input_values)
        elif input_data is not None:
            # 단일 입력 사용
            prompt = prompt_template.format(input=json.dumps(input_data, ensure_ascii=False))
        else:
            # 입력 없음
            prompt = prompt_template
            
        # Gemini API 호출
        result = await self.gemini_client.generate_content(prompt)
        
        # 출력 형식에 따른 처리
        if output_format == "json":
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                # JSON 부분만 추출 시도
                import re
                json_match = re.search(r'(\{.*\}|\[.*\])', result.replace('\n', ' '), re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(1))
                else:
                    logging.warning(f"JSON 형식으로 변환 실패: {result}")
                    return {"error": "JSON 파싱 실패", "raw_text": result}
        else:
            return result
            
    async def handle_brave_search(self, params: Dict[str, Any], context: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Brave 검색 핸들러"""
        query = params.get("query")
        query_from = params.get("query_from")
        count = params.get("count", 10)
        time_range = params.get("time_range")
        sort = params.get("sort")
        
        # 쿼리 소스에서 쿼리 가져오기
        if not query and query_from and context and query_from in context:
            query_data = context[query_from]
            
            # 쿼리 데이터가 리스트인 경우 (키워드 목록)
            if isinstance(query_data, list):
                query = " ".join(query_data[:5])  # 상위 5개 키워드 사용
            elif isinstance(query_data, dict) and "keywords" in query_data:
                query = " ".join(query_data["keywords"][:5])
            elif isinstance(query_data, str):
                query = query_data
                
        if not query:
            raise ValueError("검색어가 지정되지 않았습니다.")
            
        # 검색 실행
        search_results = await self.brave_client.search(
            query=query,
            count=count,
            time_range=time_range,
            sort=sort
        )
        
        return search_results
        
    async def handle_rss_related_fetch(self, params: Dict[str, Any], context: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """관련 RSS 기사 가져오기 핸들러"""
        keywords_from = params.get("keywords_from")
        sources = params.get("sources", [])
        max_per_source = params.get("max_per_source", 5)
        
        if not sources:
            raise ValueError("RSS 소스가 지정되지 않았습니다.")
            
        # 키워드 가져오기
        keywords = []
        if keywords_from and context and keywords_from in context:
            keywords_data = context[keywords_from]
            
            # 키워드 데이터 형식에 따른 처리
            if isinstance(keywords_data, list):
                keywords = keywords_data[:3]  # 상위 3개 키워드 사용
            elif isinstance(keywords_data, dict) and "keywords" in keywords_data:
                keywords = keywords_data["keywords"][:3]
            elif isinstance(keywords_data, str):
                keywords = [keywords_data]
                
        if not keywords:
            raise ValueError("관련 기사 검색을 위한 키워드가 없습니다.")
            
        # 관련 기사 가져오기
        related_articles = await self.rss_crawler.fetch_related(
            keywords=keywords,
            sources=sources,
            max_per_source=max_per_source
        )
        
        return related_articles
        
    async def handle_user_interaction(self, params: Dict[str, Any], context: Dict[str, Any] = None):
        """사용자 상호작용 핸들러"""
        from PyQt6.QtWidgets import QApplication
        from PyQt6.QtCore import Qt
        from ovis.ui.interaction_dialogs import CheckboxListDialog, TextEditorDialog
        
        interaction_type = params.get("type")
        data_from = params.get("data_from")
        title = params.get("title", "사용자 입력")
        
        input_data = None
        if data_from and context and data_from in context:
            input_data = context[data_from]
            
        # 상호작용 유형에 따른 처리
        if interaction_type == "checkbox_list" and isinstance(input_data, list):
            # 메인 스레드에서 대화상자 실행
            dialog = CheckboxListDialog(input_data, title)
            result = None
            
            # 이벤트 루프에서 대화상자 실행 (비동기 -> 동기)
            future = asyncio.Future()
            
            def show_dialog():
                if dialog.exec():
                    future.set_result(dialog.get_selected_items())
                else:
                    future.set_result([])
                
            QApplication.instance().invokeMethod(show_dialog, Qt.ConnectionType.QueuedConnection)
            result = await future
            
            return result
            
        elif interaction_type == "text_editor" and input_data:
            # 메인 스레드에서 대화상자 실행
            dialog = TextEditorDialog(input_data, title)
            result = None
            
            # 이벤트 루프에서 대화상자 실행 (비동기 -> 동기)
            future = asyncio.Future()
            
            def show_dialog():
                if dialog.exec():
                    future.set_result(dialog.get_edited_text())
                else:
                    future.set_result(input_data)  # 취소 시 원본 반환
                
            QApplication.instance().invokeMethod(show_dialog, Qt.ConnectionType.QueuedConnection)
            result = await future
            
            return result
            
        else:
            # 기본 응답 (상호작용 없음)
            return {"status": "user_interaction_placeholder", "data": input_data} 