#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
워크플로우 핸들러 등록 모듈
"""

import logging
from typing import Dict, Any

from ovis.workflow.engine import WorkflowEngine
from ovis.workflow.handlers import handle_rss_fetch, handle_rss_related_fetch
from ovis.api.brave_search import BraveSearchClient
from ovis.api.gemini_client import GeminiClient
from ovis.core.prompt_manager import PromptManager

logger = logging.getLogger(__name__)

# Brave 검색 핸들러
async def handle_brave_search(params: Dict[str, Any], workflow_data: Dict[str, Any]) -> Dict[str, Any]:
    """Brave 검색 핸들러"""
    # 브레이브 검색 클라이언트
    client = BraveSearchClient()
    
    # 쿼리 파라미터 처리
    query = params.get('query', '')
    query_from = params.get('query_from', '')
    
    # 다른 작업의 결과에서 쿼리 가져오기
    if query_from and query_from in workflow_data:
        query_data = workflow_data[query_from]
        
        # JSON 형식인 경우 search_query 값 사용
        if isinstance(query_data, dict) and 'search_query' in query_data:
            query = query_data['search_query']
        # 문자열인 경우 그대로 사용
        elif isinstance(query_data, str):
            query = query_data
    
    if not query:
        return {'error': '검색어가 제공되지 않았습니다.'}
    
    # 검색 옵션
    count = params.get('count', 10)
    time_range = params.get('time_range', '')
    sort = params.get('sort', 'relevant')
    
    try:
        # 검색 실행
        results = await client.search(
            query=query,
            count=count,
            time_range=time_range,
            sort=sort
        )
        
        return results
    except Exception as e:
        logger.error(f"Brave 검색 오류: {e}")
        return {'error': f'검색 중 오류 발생: {e}'}

# AI 처리 핸들러
async def handle_ai_process(params: Dict[str, Any], workflow_data: Dict[str, Any]) -> Dict[str, Any]:
    """AI 처리 핸들러"""
    # 파라미터 확인
    prompt_template = params.get('prompt_template')
    if not prompt_template:
        return {'error': '프롬프트 템플릿이 제공되지 않았습니다.'}
    
    # 입력 데이터 처리
    input_data = {}
    
    # 단일 입력 소스
    input_from = params.get('input_from')
    if input_from:
        if input_from == 'user_input' and 'user_input' in workflow_data:
            input_data = {'input': workflow_data['user_input']}
        elif input_from in workflow_data:
            input_data = {'input': workflow_data[input_from]}
    
    # 다중 입력 소스
    inputs = params.get('inputs', {})
    for key, source in inputs.items():
        if source in workflow_data:
            input_data[key] = workflow_data[source]
    
    # 프롬프트 관리자로 템플릿 가져오기
    prompt_manager = PromptManager()
    prompt = prompt_manager.get_prompt(prompt_template)
    
    if not prompt:
        logger.error(f"프롬프트 템플릿을 찾을 수 없음: {prompt_template}")
        return {'error': f'프롬프트 템플릿을 찾을 수 없음: {prompt_template}'}
    
    # 템플릿에 입력 데이터 채우기
    try:
        filled_prompt = prompt.format(**input_data)
    except KeyError as e:
        logger.error(f"프롬프트 템플릿 채우기 오류: {e}")
        return {'error': f'프롬프트 템플릿 채우기 오류: {e}'}
    
    # AI 클라이언트
    client = GeminiClient()
    
    # 출력 형식
    output_format = params.get('output_format', 'text')
    
    try:
        # AI 요청 실행
        response = await client.generate_content(
            prompt=filled_prompt,
            output_format=output_format
        )
        
        return response
    except Exception as e:
        logger.error(f"AI 처리 오류: {e}")
        return {'error': f'AI 처리 중 오류 발생: {e}'}

# 사용자 상호작용 핸들러
async def handle_user_interaction(params: Dict[str, Any], workflow_data: Dict[str, Any]) -> Dict[str, Any]:
    """사용자 상호작용 핸들러"""
    # 파라미터 확인
    interaction_type = params.get('type')
    if not interaction_type:
        return {'error': '상호작용 유형이 제공되지 않았습니다.'}
    
    # 입력 데이터 소스
    data_from = params.get('data_from')
    data = None
    
    if data_from and data_from in workflow_data:
        data = workflow_data[data_from]
    
    # 대화 상자 제목
    title = params.get('title', '입력 필요')
    
    try:
        from ovis.ui.interaction_dialogs import show_interaction_dialog
        
        # 메인 스레드에서 대화 상자 표시
        result = await show_interaction_dialog(
            interaction_type=interaction_type,
            data=data,
            title=title,
            options=params.get('options', {})
        )
        
        return result
    except Exception as e:
        logger.error(f"사용자 상호작용 오류: {e}")
        return {'error': f'사용자 상호작용 중 오류 발생: {e}'}

def register_default_handlers(engine: WorkflowEngine):
    """기본 핸들러 등록"""
    # RSS 핸들러
    engine.register_task_handler('rss_fetch', handle_rss_fetch)
    engine.register_task_handler('rss_related_fetch', handle_rss_related_fetch)
    
    # 검색 핸들러
    engine.register_task_handler('brave_search', handle_brave_search)
    
    # AI 처리 핸들러
    engine.register_task_handler('ai_process', handle_ai_process)
    
    # 사용자 상호작용 핸들러
    engine.register_task_handler('user_interaction', handle_user_interaction)
    
    logger.info("기본 작업 핸들러 등록 완료") 