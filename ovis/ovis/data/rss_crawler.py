import asyncio
import datetime
import logging
from typing import List, Dict, Any, Optional
import feedparser
import aiohttp
from bs4 import BeautifulSoup

class RSSCrawler:
    """RSS 피드를 크롤링하고 관련 콘텐츠를 가져오는 클래스"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    async def fetch_feed(self, url: str) -> List[Dict[str, Any]]:
        """단일 RSS 피드 URL에서 기사를 가져옵니다."""
        self.logger.info(f"Fetching RSS feed from {url}")
        
        try:
            # feedparser는 동기 라이브러리이므로 ThreadPoolExecutor를 사용해 비동기로 실행
            feed = await asyncio.to_thread(feedparser.parse, url)
            
            if feed.bozo:
                self.logger.warning(f"RSS 파싱 오류: {url} - {feed.bozo_exception}")
                
            articles = []
            for entry in feed.entries:
                # 게시일 파싱
                published = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    published = datetime.datetime(*entry.published_parsed[:6])
                elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                    published = datetime.datetime(*entry.updated_parsed[:6])
                    
                # 기사 정보 추출
                article = {
                    "title": entry.title if hasattr(entry, 'title') else "제목 없음",
                    "link": entry.link if hasattr(entry, 'link') else "",
                    "published": published.isoformat() if published else None,
                    "summary": entry.summary if hasattr(entry, 'summary') else "",
                    "source": feed.feed.title if hasattr(feed.feed, 'title') else url,
                }
                
                articles.append(article)
                
            return articles
            
        except Exception as e:
            self.logger.error(f"RSS 피드 가져오기 오류: {url} - {str(e)}")
            return []
            
    async def fetch_multiple(self, urls: List[str], days: int = 3) -> List[Dict[str, Any]]:
        """여러 RSS 피드에서 최근 기사를 가져옵니다."""
        tasks = [self.fetch_feed(url) for url in urls]
        results = await asyncio.gather(*tasks)
        
        # 결과 병합 및 시간 필터링
        all_articles = []
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
        
        for articles in results:
            for article in articles:
                # 시간 필터링
                if article["published"]:
                    published_dt = datetime.datetime.fromisoformat(article["published"])
                    if published_dt >= cutoff_date:
                        all_articles.append(article)
                else:
                    # 시간 정보가 없으면 모두 포함
                    all_articles.append(article)
                    
        # 시간 순 정렬
        all_articles.sort(
            key=lambda x: datetime.datetime.fromisoformat(x["published"]) if x["published"] else datetime.datetime.min,
            reverse=True
        )
        
        return all_articles
        
    async def _fetch_article_content(self, url: str) -> Optional[str]:
        """기사 URL에서 본문 콘텐츠를 추출합니다."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    if response.status != 200:
                        return None
                        
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # 메타 디스크립션 추출
                    meta_desc = soup.find('meta', attrs={'name': 'description'})
                    if meta_desc and meta_desc.get('content'):
                        content = meta_desc.get('content')
                        return content
                        
                    # 기본 본문 추출 (간단한 구현)
                    # 실제로는 더 복잡한 본문 추출 알고리즘 필요
                    article_tag = soup.find('article')
                    if article_tag:
                        paragraphs = article_tag.find_all('p')
                        content = ' '.join([p.get_text().strip() for p in paragraphs])
                        return content
                        
                    # 대안: p 태그 추출
                    main_content = soup.find('main') or soup.find('div', class_='content') or soup.body
                    if main_content:
                        paragraphs = main_content.find_all('p')
                        content = ' '.join([p.get_text().strip() for p in paragraphs])
                        return content
                        
                    return None
                    
        except Exception as e:
            self.logger.error(f"기사 내용 추출 오류: {url} - {str(e)}")
            return None
            
    async def fetch_related(self, keywords: List[str], sources: List[str], max_per_source: int = 5) -> List[Dict[str, Any]]:
        """키워드와 관련된 기사를 RSS 피드에서 검색합니다."""
        # 모든 소스에서 기사 가져오기 (최근 7일)
        all_articles = await self.fetch_multiple(sources, days=7)
        related_articles = []
        
        # 키워드를 소문자로 변환
        keywords_lower = [k.lower() for k in keywords]
        
        # 소스별 카운터
        source_counters = {}
        
        for article in all_articles:
            # 제목과 요약에서 키워드 검색
            title = article["title"].lower()
            summary = article["summary"].lower()
            
            is_related = any(kw in title or kw in summary for kw in keywords_lower)
            
            if is_related:
                source = article["source"]
                # 소스별 최대 개수 확인
                if source not in source_counters:
                    source_counters[source] = 0
                    
                if source_counters[source] < max_per_source:
                    related_articles.append(article)
                    source_counters[source] += 1
                    
        return related_articles 