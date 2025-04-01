#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Brave Search API 클라이언트
"""

import logging
import aiohttp
import json
from typing import Dict, Any, List, Optional

from ovis.core.config_manager import ConfigManager

logger = logging.getLogger(__name__)

class BraveSearchClient:
    """Brave Search API 클라이언트"""
    
    def __init__(self):
        """초기화"""
        self.session = None
        self.config = ConfigManager().get_config()
        self.api_key = self.config.get('api_keys', {}).get('brave_search')
        self.base_url = "https://api.search.brave.com/res/v1/web/search"
        
    async def setup_session(self):
        """세션 설정"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
            
    async def close_session(self):
        """세션 종료"""
        if self.session:
            await self.session.close()
            self.session = None
            
    async def search(self, query: str, count: int = 10, time_range: str = '', sort: str = 'relevant') -> Dict[str, Any]:
        """Brave 검색 실행
        
        Args:
            query: 검색어
            count: 검색 결과 수 (최대 20)
            time_range: 기간 제한 (1d, 7d, 30d 등)
            sort: 정렬 방식 (relevant, recent)
            
        Returns:
            검색 결과
        """
        try:
            # API 키 확인
            if not self.api_key:
                logger.warning("Brave Search API 키가 설정되지 않았습니다. 더미 응답을 반환합니다.")
                return self._get_dummy_response(query, count)
                
            # 세션 설정
            await self.setup_session()
            
            # 요청 파라미터
            params = {
                'q': query,
                'count': min(count, 20)  # 최대 20개까지만 가능
            }
            
            # 기간 제한이 있는 경우
            if time_range:
                params['time_range'] = time_range
                
            # 정렬 방식이 있는 경우
            if sort:
                params['search_params'] = f"sort-{sort}"
                
            # 헤더 설정
            headers = {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': self.api_key
            }
            
            # API 요청
            async with self.session.get(self.base_url, params=params, headers=headers) as response:
                if response.status != 200:
                    logger.error(f"Brave Search API 오류: 상태 코드 {response.status}")
                    return self._get_dummy_response(query, count)
                    
                data = await response.json()
                
                # 결과 가공
                return self._process_response(data, query)
                
        except Exception as e:
            logger.exception(f"Brave Search API 요청 중 오류 발생: {e}")
            return self._get_dummy_response(query, count)
            
        finally:
            # 세션 종료는 여기서 하지 않음 (여러 번 요청할 수 있으므로)
            pass
            
    def _process_response(self, data: Dict[str, Any], query: str) -> Dict[str, Any]:
        """API 응답 처리
        
        Args:
            data: API 응답 데이터
            query: 검색어
            
        Returns:
            처리된 검색 결과
        """
        result = {
            'query': query,
            'results': [],
            'total': data.get('total', 0)
        }
        
        # 웹 검색 결과
        web_results = data.get('web', {}).get('results', [])
        
        for item in web_results:
            result_item = {
                'title': item.get('title', ''),
                'url': item.get('url', ''),
                'description': item.get('description', ''),
                'published': item.get('published', ''),
                'source': item.get('source', ''),
            }
            result['results'].append(result_item)
            
        # 뉴스 검색 결과가 있는 경우
        news_results = data.get('news', {}).get('results', [])
        
        for item in news_results:
            result_item = {
                'title': item.get('title', ''),
                'url': item.get('url', ''),
                'description': item.get('description', ''),
                'published': item.get('published', ''),
                'source': item.get('source', ''),
                'is_news': True
            }
            result['results'].append(result_item)
            
        return result
        
    def _get_dummy_response(self, query: str, count: int) -> Dict[str, Any]:
        """더미 검색 결과 반환
        
        Args:
            query: 검색어
            count: 검색 결과 수
            
        Returns:
            더미 검색 결과
        """
        results = []
        for i in range(min(count, 5)):
            results.append({
                'title': f"더미 검색 결과 {i+1}: {query}",
                'url': f"https://example.com/search?q={query.replace(' ', '+')}&result={i+1}",
                'description': f"이것은 '{query}'에 대한 더미 검색 결과 {i+1}입니다. API 키가 없거나 API 호출에 실패했습니다.",
                'published': "2023-05-01T12:00:00Z",
                'source': "더미 소스"
            })
            
        return {
            'query': query,
            'results': results,
            'total': len(results)
        } 