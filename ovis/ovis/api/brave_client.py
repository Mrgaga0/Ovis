import aiohttp
import json
import logging
from typing import Dict, Any, List, Optional

class BraveSearchClient:
    """Brave Search API 클라이언트"""
    
    BASE_URL = "https://api.search.brave.com/res/v1/web"
    
    def __init__(self, api_key: str, logger: Optional[logging.Logger] = None):
        """
        Brave Search API 클라이언트 초기화
        
        Args:
            api_key (str): Brave Search API 키
            logger (Optional[logging.Logger], optional): 로거
        """
        self.api_key = api_key
        self.logger = logger or logging.getLogger(__name__)
        self.session = None
    
    async def _ensure_session(self):
        """세션이 없으면 생성"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
    
    async def close(self):
        """세션 종료"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def search(self, 
                    query: str, 
                    count: int = 10, 
                    offset: int = 0,
                    country: str = "KR",
                    search_lang: str = "ko",
                    ui_lang: str = "ko",
                    time_range: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        웹 검색 수행
        
        Args:
            query: 검색어
            count: 결과 수 (최대 20)
            offset: 페이지 오프셋
            country: 국가 코드
            search_lang: 검색 언어
            ui_lang: UI 언어
            time_range: 시간 범위 (예: "d" - 하루, "w" - 일주일, "m" - 한 달, "y" - 일 년)
            
        Returns:
            검색 결과 목록
        """
        await self._ensure_session()
        
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": self.api_key
        }
        
        params = {
            "q": query,
            "count": min(count, 20),  # 최대 20개
            "offset": offset,
            "country": country,
            "search_lang": search_lang,
            "ui_lang": ui_lang
        }
        
        if time_range:
            params["freshness"] = time_range
            
        try:
            async with self.session.get(self.BASE_URL, headers=headers, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.logger.error(f"Brave Search API 오류: {response.status}, {error_text}")
                    raise Exception(f"API 오류: {response.status}, {error_text}")
                
                result = await response.json()
                return result.get("web", {}).get("results", [])
                
        except aiohttp.ClientError as e:
            self.logger.error(f"Brave Search API 요청 오류: {e}")
            raise Exception(f"API 요청 오류: {e}")
            
    async def local_search(self,
                         query: str,
                         count: int = 5,
                         country: str = "KR",
                         language: str = "ko") -> List[Dict[str, Any]]:
        """
        로컬 비즈니스 검색
        
        Args:
            query: 검색어
            count: 결과 수
            country: 국가 코드
            language: 언어
            
        Returns:
            로컬 비즈니스 검색 결과 목록
        """
        await self._ensure_session()
        
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": self.api_key
        }
        
        params = {
            "q": query,
            "count": min(count, 20),
            "country": country,
            "search_lang": language,
            "ui_lang": language
        }
        
        try:
            async with self.session.get(self.BASE_URL, headers=headers, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.logger.error(f"Brave Search API 오류: {response.status}, {error_text}")
                    raise Exception(f"API 오류: {response.status}, {error_text}")
                
                result = await response.json()
                
                # 로컬 비즈니스 결과 반환
                # 일반 웹 검색 결과와 다를 수 있으므로 적절히 수정 필요
                return result.get("local", []) or result.get("web", {}).get("results", [])
                
        except aiohttp.ClientError as e:
            self.logger.error(f"Brave Search API 요청 오류: {e}")
            raise Exception(f"API 요청 오류: {e}")
    
    async def get_search_results(self, query: str, count: int = 10, 
                                country: str = "KR", language: str = "ko") -> List[Dict[str, Any]]:
        """
        웹 검색 결과 가져오기
        
        Args:
            query (str): 검색 쿼리
            count (int, optional): 검색 결과 수
            country (str, optional): 국가 코드
            language (str, optional): 언어 코드
            
        Returns:
            List[Dict[str, Any]]: 검색 결과 목록
        """
        try:
            results = await self.search(query, count, country, language)
            return results
        except Exception as e:
            self.logger.error(f"웹 검색 중 오류 발생: {e}")
            return []
    
    async def get_news(self, query: str, count: int = 10, 
                      country: str = "KR", language: str = "ko") -> List[Dict[str, Any]]:
        """
        뉴스 검색 결과 가져오기
        
        Args:
            query (str): 검색 쿼리
            count (int, optional): 검색 결과 수
            country (str, optional): 국가 코드
            language (str, optional): 언어 코드
            
        Returns:
            List[Dict[str, Any]]: 뉴스 검색 결과 목록
        """
        try:
            results = await self.search(query, count, country, language, "news")
            return results.get("news", {}).get("results", [])
        except Exception as e:
            self.logger.error(f"뉴스 검색 중 오류 발생: {e}")
            return []
    
    async def get_images(self, query: str, count: int = 10, 
                        country: str = "KR", language: str = "ko") -> List[Dict[str, Any]]:
        """
        이미지 검색 결과 가져오기
        
        Args:
            query (str): 검색 쿼리
            count (int, optional): 검색 결과 수
            country (str, optional): 국가 코드
            language (str, optional): 언어 코드
            
        Returns:
            List[Dict[str, Any]]: 이미지 검색 결과 목록
        """
        try:
            results = await self.search(query, count, country, language, "images")
            return results.get("images", {}).get("results", [])
        except Exception as e:
            self.logger.error(f"이미지 검색 중 오류 발생: {e}")
            return []
    
    async def get_videos(self, query: str, count: int = 10, 
                        country: str = "KR", language: str = "ko") -> List[Dict[str, Any]]:
        """
        비디오 검색 결과 가져오기
        
        Args:
            query (str): 검색 쿼리
            count (int, optional): 검색 결과 수
            country (str, optional): 국가 코드
            language (str, optional): 언어 코드
            
        Returns:
            List[Dict[str, Any]]: 비디오 검색 결과 목록
        """
        try:
            results = await self.search(query, count, country, language, "videos")
            return results.get("videos", {}).get("results", [])
        except Exception as e:
            self.logger.error(f"비디오 검색 중 오류 발생: {e}")
            return []
    
    async def search_summarized(self, query: str, count: int = 5, 
                              country: str = "KR", language: str = "ko") -> Dict[str, Any]:
        """
        다양한 유형의 검색 결과를 종합적으로 가져오기
        
        Args:
            query (str): 검색 쿼리
            count (int, optional): 각 유형별 검색 결과 수
            country (str, optional): 국가 코드
            language (str, optional): 언어 코드
            
        Returns:
            Dict[str, Any]: 종합 검색 결과
        """
        # 웹 검색
        web_results = await self.get_search_results(query, count, country, language)
        
        # 뉴스 검색
        news_results = await self.get_news(query, count, country, language)
        
        # 결과 종합
        return {
            "query": query,
            "web": web_results,
            "news": news_results,
            "web_count": len(web_results),
            "news_count": len(news_results)
        } 