#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
RSS 피드 핸들러 모듈
"""

import asyncio
import logging
import feedparser
import aiohttp
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class RSSFeedProcessor:
    """RSS 피드 처리기 클래스"""
    
    def __init__(self):
        """초기화"""
        self.session = None
        
    async def setup(self):
        """세션 설정"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
    
    async def close(self):
        """세션 종료"""
        if self.session:
            await self.session.close()
            self.session = None
            
    async def fetch_feed(self, url: str) -> List[Dict[str, Any]]:
        """RSS 피드 가져오기"""
        try:
            # 세션 설정
            await self.setup()
            
            # 피드 가져오기
            async with self.session.get(url, timeout=10) as response:
                if response.status != 200:
                    logger.error(f"RSS 피드 가져오기 실패: {url}, 상태 코드: {response.status}")
                    return []
                
                content = await response.text()
                
            # 피드 파싱
            feed = feedparser.parse(content)
            
            if not feed.entries:
                logger.warning(f"피드에 항목이 없음: {url}")
                return []
                
            # 결과 변환
            results = []
            for entry in feed.entries:
                # 발행일 파싱
                published = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    published = datetime(*entry.published_parsed[:6])
                elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                    published = datetime(*entry.updated_parsed[:6])
                
                # 항목 정보 추출
                item = {
                    'title': entry.title if hasattr(entry, 'title') else '',
                    'link': entry.link if hasattr(entry, 'link') else '',
                    'summary': entry.summary if hasattr(entry, 'summary') else '',
                    'published': published.isoformat() if published else None,
                    'source': url
                }
                
                # 내용이 있는 경우 추가
                if hasattr(entry, 'content'):
                    item['content'] = entry.content[0].value
                
                results.append(item)
                
            return results
            
        except Exception as e:
            logger.error(f"RSS 피드 처리 중 오류 발생: {url}, 오류: {e}")
            return []
    
    async def fetch_multiple_feeds(self, urls: List[str]) -> List[Dict[str, Any]]:
        """여러 피드 동시에 가져오기"""
        # 세션 설정
        await self.setup()
        
        # 동시에 여러 피드 가져오기
        tasks = [self.fetch_feed(url) for url in urls]
        results = await asyncio.gather(*tasks)
        
        # 결과 병합
        all_entries = []
        for entries in results:
            all_entries.extend(entries)
            
        return all_entries
    
    async def filter_entries_by_date(self, entries: List[Dict[str, Any]], days: int = 7) -> List[Dict[str, Any]]:
        """지정된 일수 이내의 항목만 필터링"""
        if not entries:
            return []
            
        # 현재 시간
        now = datetime.now()
        
        # 필터링
        filtered = []
        for entry in entries:
            if not entry.get('published'):
                continue
                
            try:
                published = datetime.fromisoformat(entry['published'])
                if (now - published).days <= days:
                    filtered.append(entry)
            except (ValueError, TypeError):
                continue
                
        return filtered
    
    async def extract_article_content(self, url: str) -> str:
        """기사 내용 추출"""
        try:
            # 세션 설정
            await self.setup()
            
            # 페이지 가져오기
            async with self.session.get(url, timeout=10) as response:
                if response.status != 200:
                    logger.error(f"기사 내용 가져오기 실패: {url}, 상태 코드: {response.status}")
                    return ""
                
                html = await response.text()
                
            # HTML 파싱
            soup = BeautifulSoup(html, 'html.parser')
            
            # 메타 데이터 제거
            for tag in soup(['script', 'style', 'head', 'header', 'footer', 'nav']):
                tag.decompose()
                
            # 본문 추출
            paragraphs = soup.find_all('p')
            text = '\n'.join(p.get_text().strip() for p in paragraphs if p.get_text().strip())
            
            return text
            
        except Exception as e:
            logger.error(f"기사 내용 추출 중 오류 발생: {url}, 오류: {e}")
            return ""
    
    async def fetch_article_contents(self, entries: List[Dict[str, Any]], max_articles: int = 5) -> List[Dict[str, Any]]:
        """여러 기사의 내용 가져오기"""
        if not entries:
            return []
            
        # 최대 개수 제한
        limited_entries = entries[:max_articles]
        
        # 동시에 여러 기사 내용 가져오기
        tasks = [self.extract_article_content(entry['link']) for entry in limited_entries]
        contents = await asyncio.gather(*tasks)
        
        # 결과 병합
        for i, content in enumerate(contents):
            limited_entries[i]['full_content'] = content
            
        return limited_entries
    
    async def filter_entries_by_keywords(self, entries: List[Dict[str, Any]], keywords: List[str]) -> List[Dict[str, Any]]:
        """키워드 기반 필터링"""
        if not entries or not keywords:
            return entries
            
        # 소문자 변환
        keywords_lower = [k.lower() for k in keywords]
        
        # 필터링
        filtered = []
        for entry in entries:
            # 제목과 내용 결합하여 검색
            text = (entry.get('title', '') + ' ' + entry.get('summary', '') + ' ' + entry.get('content', '')).lower()
            
            # 하나라도 일치하면 추가
            if any(k in text for k in keywords_lower):
                filtered.append(entry)
                
        return filtered

# RSS 관련 워크플로우 핸들러
async def handle_rss_fetch(params: Dict[str, Any], workflow_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """RSS 피드 가져오기 핸들러"""
    urls = params.get('urls', [])
    if not urls:
        logger.error("RSS 피드 URL이 제공되지 않았습니다.")
        return []
    
    # 옵션 파라미터 처리
    days = params.get('days', 7)
    max_articles = params.get('max_articles', 10)
    
    # RSS 처리기 생성
    processor = RSSFeedProcessor()
    
    try:
        # 피드 가져오기
        entries = await processor.fetch_multiple_feeds(urls)
        
        # 날짜 필터링
        if days > 0:
            entries = await processor.filter_entries_by_date(entries, days)
        
        # 최대 개수 제한
        entries = entries[:max_articles]
        
        return entries
        
    except Exception as e:
        logger.error(f"RSS 피드 가져오기 중 오류 발생: {e}")
        return []
        
    finally:
        # 세션 종료
        await processor.close()

async def handle_rss_related_fetch(params: Dict[str, Any], workflow_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """키워드 관련 RSS 피드 가져오기 핸들러"""
    # 필수 파라미터 확인
    sources = params.get('sources', [])
    if not sources:
        logger.error("RSS 피드 소스가 제공되지 않았습니다.")
        return []
    
    # 키워드 파라미터 처리
    keywords_from = params.get('keywords_from')
    keywords = []
    
    if keywords_from and keywords_from in workflow_data:
        # 워크플로우 데이터에서 키워드 가져오기
        keywords_data = workflow_data[keywords_from]
        
        # JSON 형식인 경우 키워드 추출
        if isinstance(keywords_data, dict) and 'keywords' in keywords_data:
            keywords = keywords_data['keywords']
        elif isinstance(keywords_data, list):
            keywords = keywords_data
    
    # 직접 주어진 키워드 사용
    if not keywords and 'keywords' in params:
        keywords = params['keywords']
    
    # 옵션 파라미터 처리
    max_per_source = params.get('max_per_source', 5)
    days = params.get('days', 7)
    
    # RSS 처리기 생성
    processor = RSSFeedProcessor()
    
    try:
        # 피드 가져오기
        all_entries = await processor.fetch_multiple_feeds(sources)
        
        # 날짜 필터링
        if days > 0:
            all_entries = await processor.filter_entries_by_date(all_entries, days)
        
        # 키워드 필터링
        if keywords:
            all_entries = await processor.filter_entries_by_keywords(all_entries, keywords)
        
        # 피드별 최대 개수 제한
        result_entries = []
        source_counts = {}
        
        for entry in all_entries:
            source = entry.get('source')
            count = source_counts.get(source, 0)
            
            if count < max_per_source:
                result_entries.append(entry)
                source_counts[source] = count + 1
        
        # 기사 내용 가져오기
        articles_with_content = await processor.fetch_article_contents(result_entries)
        
        return articles_with_content
        
    except Exception as e:
        logger.error(f"관련 RSS 피드 가져오기 중 오류 발생: {e}")
        return []
        
    finally:
        # 세션 종료
        await processor.close() 