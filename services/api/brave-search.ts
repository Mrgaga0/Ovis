import axios from 'axios';

export interface SearchOptions {
  count?: number;
  offset?: number;
  language?: string;
  country?: string;
  safeSearch?: boolean;
  freshness?: 'day' | 'week' | 'month' | 'year';
}

export interface SearchResultItem {
  title: string;
  url: string;
  description: string;
  publishedDate?: string;
  source?: string;
  position: number;
}

export interface SearchResult {
  query: string;
  results: SearchResultItem[];
  totalResults: number;
  searchTime: number;
}

export class BraveSearchAPI {
  private apiKey: string;
  private baseUrl = 'https://api.search.brave.com/res/v1/web/search';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    try {
      const response = await axios.get(this.baseUrl, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey
        },
        params: {
          q: query,
          count: options.count || 10,
          offset: options.offset || 0,
          language: options.language || 'ko-KR',
          country: options.country || 'KR',
          safe_search: options.safeSearch !== undefined ? options.safeSearch : true,
          freshness: options.freshness
        }
      });
      
      return this.processResults(query, response.data);
    } catch (error) {
      console.error('Brave Search API 오류:', error);
      throw new Error('검색 API 요청 중 오류가 발생했습니다.');
    }
  }
  
  private processResults(query: string, data: any): SearchResult {
    try {
      // Brave API 응답 구조에 맞게 데이터 정규화
      const results = data.web?.results?.map((item: any, index: number) => ({
        title: item.title || '',
        url: item.url || '',
        description: item.description || '',
        publishedDate: item.published_date,
        source: item.source,
        position: index + 1
      })) || [];
      
      return {
        query,
        results,
        totalResults: data.web?.total_results || 0,
        searchTime: data.search_info?.time_taken_ms / 1000 || 0
      };
    } catch (error) {
      console.error('검색 결과 처리 오류:', error);
      return {
        query,
        results: [],
        totalResults: 0,
        searchTime: 0
      };
    }
  }
  
  async searchNews(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/news/search', {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey
        },
        params: {
          q: query,
          count: options.count || 10,
          offset: options.offset || 0,
          language: options.language || 'ko-KR',
          country: options.country || 'KR',
          freshness: options.freshness || 'week'
        }
      });
      
      return this.processNewsResults(query, response.data);
    } catch (error) {
      console.error('Brave News API 오류:', error);
      throw new Error('뉴스 API 요청 중 오류가 발생했습니다.');
    }
  }
  
  private processNewsResults(query: string, data: any): SearchResult {
    try {
      const results = data.results?.map((item: any, index: number) => ({
        title: item.title || '',
        url: item.url || '',
        description: item.description || '',
        publishedDate: item.published_date,
        source: item.source,
        position: index + 1
      })) || [];
      
      return {
        query,
        results,
        totalResults: data.total_results || 0,
        searchTime: data.search_info?.time_taken_ms / 1000 || 0
      };
    } catch (error) {
      console.error('뉴스 검색 결과 처리 오류:', error);
      return {
        query,
        results: [],
        totalResults: 0,
        searchTime: 0
      };
    }
  }
} 