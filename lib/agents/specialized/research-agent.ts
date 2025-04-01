import { BaseAgent, AgentType, IAgentConfig, IAgentMessage, IAgentResponse, LogLevel } from '../base-agent';
import { BraveSearchAPI } from '../../apis/brave-search';
import { YouTubeAPI } from '../../apis/youtube';
import { RSSParser } from '../../utils/rss-parser';
import { ContextManager } from '../../context/manager';
import { GeminiService } from '../../services/gemini';

/**
 * 연구 에이전트 설정 인터페이스
 */
export interface IResearchAgentConfig extends IAgentConfig {
  braveSearchApiKey: string;
  youtubeApiKey: string;
  geminiApiKey: string;
}

/**
 * 연구 요청 인터페이스
 */
export interface IResearchRequest {
  query: string;
  sources?: string[];
  limit?: number;
  filters?: Record<string, any>;
}

/**
 * 연구 결과 인터페이스
 */
export interface IResearchResult {
  query: string;
  sources: string[];
  results: any[];
  summary?: string;
  timestamp: number;
}

/**
 * 키워드 연구 결과 인터페이스
 */
export interface IKeywordResearchResult {
  mainKeyword: string;
  relatedKeywords: string[];
  volumeData?: Record<string, number>;
  trends?: any[];
  recommendations?: string[];
}

/**
 * 에이전트 결과 인터페이스
 */
export interface IAgentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 연구 에이전트 클래스
 * 웹 검색, 뉴스 검색, YouTube 검색, RSS 피드 수집 등의 연구 작업을 수행합니다.
 */
export class ResearchAgent extends BaseAgent {
  private braveSearch: BraveSearchAPI;
  private youtubeAPI: YouTubeAPI;
  private rssParser: RSSParser;
  private gemini: GeminiService;
  private context: ContextManager;

  constructor(config: IResearchAgentConfig) {
    super({
      ...config,
      type: 'research' as AgentType, // 타입 단언
      capabilities: [
        'web_search',
        'news_search',
        'youtube_search',
        'rss_feed_processing',
        'trend_analysis',
        'keyword_research'
      ]
    });

    // API 클라이언트 초기화
    this.braveSearch = new BraveSearchAPI(config.braveSearchApiKey);
    this.youtubeAPI = new YouTubeAPI(config.youtubeApiKey);
    this.rssParser = new RSSParser();
    this.gemini = new GeminiService(config.geminiApiKey);
    this.context = new ContextManager();
    
    // 핸들러 등록
    this.registerMessageHandler('WEB_SEARCH', this.handleWebSearch.bind(this));
    this.registerMessageHandler('NEWS_SEARCH', this.handleNewsSearch.bind(this));
    this.registerMessageHandler('YOUTUBE_SEARCH', this.handleYouTubeSearch.bind(this));
    this.registerMessageHandler('RSS_FETCH', this.handleRSSFetch.bind(this));
    this.registerMessageHandler('KEYWORD_RESEARCH', this.handleKeywordResearch.bind(this));
    this.registerMessageHandler('RESEARCH_TOPIC', this.handleTopicResearch.bind(this));
  }

  /**
   * 웹 검색 핸들러
   */
  private async handleWebSearch(message: IAgentMessage): Promise<any> {
    const { query, limit = 10, ...options } = message.content;
    return this.performWebSearch(query, limit, options);
  }

  /**
   * 뉴스 검색 핸들러
   */
  private async handleNewsSearch(message: IAgentMessage): Promise<any> {
    const { query, limit = 10, ...options } = message.content;
    return this.performNewsSearch(query, limit, options);
  }

  /**
   * YouTube 검색 핸들러
   */
  private async handleYouTubeSearch(message: IAgentMessage): Promise<any> {
    const { query, limit = 10, ...options } = message.content;
    return this.performYouTubeSearch(query, limit, options);
  }

  /**
   * RSS 피드 수집 핸들러
   */
  private async handleRSSFetch(message: IAgentMessage): Promise<any> {
    const { feedUrls, limit = 10 } = message.content;
    return this.fetchRSSFeeds(feedUrls, limit);
  }

  /**
   * 키워드 연구 핸들러
   */
  private async handleKeywordResearch(message: IAgentMessage): Promise<any> {
    const { keyword, options = {} } = message.content;
    return this.researchKeywords(keyword, options);
  }

  /**
   * 주제 연구 핸들러
   */
  private async handleTopicResearch(message: IAgentMessage): Promise<any> {
    const { topic, depth = 'medium', options = {} } = message.content;
    return this.researchTopic(topic, depth, options);
  }

  /**
   * 에이전트 초기화
   */
  protected async onInitialize(): Promise<void> {
    this.log(LogLevel.INFO, `연구 에이전트 초기화 중...`);
    
    // API 클라이언트 검증
    try {
      await this.testApiConnections();
      this.log(LogLevel.INFO, `연구 에이전트 초기화 완료`);
    } catch (error) {
      this.log(LogLevel.ERROR, `연구 에이전트 초기화 실패: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * API 연결 테스트
   */
  private async testApiConnections(): Promise<void> {
    // 간단한 연결 테스트
    try {
      await this.braveSearch.testConnection();
      this.log(LogLevel.INFO, `BraveSearch API 연결 성공`);
    } catch (error) {
      this.log(LogLevel.ERROR, `BraveSearch API 연결 실패`, { error });
      throw error;
    }
    
    try {
      await this.youtubeAPI.testConnection();
      this.log(LogLevel.INFO, `YouTube API 연결 성공`);
    } catch (error) {
      this.log(LogLevel.ERROR, `YouTube API 연결 실패`, { error });
      throw error;
    }
  }

  /**
   * 에이전트 종료
   */
  protected async onShutdown(): Promise<void> {
    this.log(LogLevel.INFO, `연구 에이전트 종료 중...`);
    
    try {
      // 컨텍스트 정리
      await this.context.clear();
      this.log(LogLevel.INFO, `연구 에이전트 종료 완료`);
    } catch (error) {
      this.log(LogLevel.ERROR, `연구 에이전트 종료 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 메시지 처리
   */
  protected async onProcessMessage(message: IAgentMessage): Promise<any> {
    this.log(LogLevel.INFO, `메시지 처리 중: ${message.type}`);
    
    // 메시지 타입에 따라 처리
    switch (message.type) {
      case 'COMPREHENSIVE_RESEARCH':
        return this.performComprehensiveResearch(message.content);
      default:
        throw new Error(`지원하지 않는 메시지 타입: ${message.type}`);
    }
  }

  /**
   * 웹 검색 수행
   */
  public async performWebSearch(query: string, limit = 10, options = {}): Promise<IResearchResult> {
    this.log(LogLevel.INFO, `웹 검색 수행: ${query}`, { limit, options });
    
    try {
      const searchResult = await this.withRetry(
        () => this.braveSearch.search(query, { count: limit, ...options }),
        {
          maxRetries: 3,
          onRetry: (attempt) => this.log(LogLevel.WARN, `웹 검색 재시도 (${attempt})`, { query })
        }
      );
      
      // 검색 결과를 컨텍스트에 저장
      await this.context.addItem({
        type: 'web_search',
        content: searchResult,
        metadata: {
          query,
          timestamp: Date.now(),
          source: 'brave'
        }
      });
      
      return {
        query,
        sources: ['brave_web'],
        results: searchResult.results || [],
        timestamp: Date.now()
      };
    } catch (error) {
      this.log(LogLevel.ERROR, `웹 검색 오류: ${error instanceof Error ? error.message : String(error)}`, { query });
      throw error;
    }
  }

  /**
   * 뉴스 검색 수행
   */
  public async performNewsSearch(query: string, limit = 10, options = {}): Promise<IResearchResult> {
    this.log(LogLevel.INFO, `뉴스 검색 수행: ${query}`, { limit, options });
    
    try {
      const searchResult = await this.withRetry(
        () => this.braveSearch.searchNews(query, { count: limit, ...options }),
        {
          maxRetries: 3,
          onRetry: (attempt) => this.log(LogLevel.WARN, `뉴스 검색 재시도 (${attempt})`, { query })
        }
      );
      
      // 검색 결과를 컨텍스트에 저장
      await this.context.addItem({
        type: 'news_search',
        content: searchResult,
        metadata: {
          query,
          timestamp: Date.now(),
          source: 'brave'
        }
      });
      
      return {
        query,
        sources: ['brave_news'],
        results: searchResult.articles || [],
        timestamp: Date.now()
      };
    } catch (error) {
      this.log(LogLevel.ERROR, `뉴스 검색 오류: ${error instanceof Error ? error.message : String(error)}`, { query });
      throw error;
    }
  }

  /**
   * YouTube 검색 수행
   */
  public async performYouTubeSearch(query: string, limit = 10, options = {}): Promise<IResearchResult> {
    this.log(LogLevel.INFO, `YouTube 검색 수행: ${query}`, { limit, options });
    
    try {
      const searchResults = await this.withRetry(
        () => this.youtubeAPI.search(query, { maxResults: limit, ...options }),
        {
          maxRetries: 3,
          onRetry: (attempt) => this.log(LogLevel.WARN, `YouTube 검색 재시도 (${attempt})`, { query })
        }
      );
      
      // 검색 결과를 컨텍스트에 저장
      await this.context.addItem({
        type: 'youtube_search',
        content: searchResults,
        metadata: {
          query,
          timestamp: Date.now(),
          source: 'youtube'
        }
      });
      
      return {
        query,
        sources: ['youtube'],
        results: searchResults.items || [],
        timestamp: Date.now()
      };
    } catch (error) {
      this.log(LogLevel.ERROR, `YouTube 검색 오류: ${error instanceof Error ? error.message : String(error)}`, { query });
      throw error;
    }
  }

  /**
   * RSS 피드 수집
   */
  public async fetchRSSFeeds(feedUrls: string[], limit = 10): Promise<IResearchResult> {
    this.log(LogLevel.INFO, `RSS 피드 수집`, { feedCount: feedUrls.length, limit });
    
    try {
      const feedResults = [];
      
      for (const url of feedUrls) {
        try {
          const feedResult = await this.withRetry(
            () => this.rssParser.parse(url),
            {
              maxRetries: 2,
              onRetry: (attempt) => this.log(LogLevel.WARN, `RSS 파싱 재시도 (${attempt})`, { url })
            }
          );
          
          // 각 피드에서 최대 'limit' 개의 항목만 가져오기
          const items = feedResult.items?.slice(0, limit) || [];
          feedResults.push({
            feed: feedResult.feed,
            items,
            url
          });
        } catch (error) {
          this.log(LogLevel.ERROR, `RSS 피드 파싱 오류: ${error instanceof Error ? error.message : String(error)}`, { url });
          // 개별 피드 오류는 건너뛰고 계속 진행
        }
      }
      
      // RSS 결과를 컨텍스트에 저장
      await this.context.addItem({
        type: 'rss_feeds',
        content: feedResults,
        metadata: {
          timestamp: Date.now(),
          feedCount: feedUrls.length,
          successCount: feedResults.length
        }
      });
      
      return {
        query: 'rss_feeds',
        sources: feedUrls,
        results: feedResults,
        timestamp: Date.now()
      };
    } catch (error) {
      this.log(LogLevel.ERROR, `RSS 피드 수집 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 트렌딩 비디오 가져오기
   */
  public async getTrendingVideos(category = 'default', regionCode = 'US', limit = 10): Promise<IResearchResult> {
    this.log(LogLevel.INFO, `트렌딩 비디오 가져오기`, { category, regionCode, limit });
    
    try {
      const trendingVideos = await this.withRetry(
        () => this.youtubeAPI.getTrendingVideos(category, regionCode, limit),
        {
          maxRetries: 3,
          onRetry: (attempt) => this.log(LogLevel.WARN, `트렌딩 비디오 가져오기 재시도 (${attempt})`)
        }
      );
      
      // 트렌딩 비디오를 컨텍스트에 저장
      await this.context.addItem({
        type: 'youtube_trending',
        content: trendingVideos,
        metadata: {
          timestamp: Date.now(),
          category,
          regionCode
        }
      });
      
      return {
        query: 'trending_videos',
        sources: [`youtube_${category}_${regionCode}`],
        results: trendingVideos.items || [],
        timestamp: Date.now()
      };
    } catch (error) {
      this.log(LogLevel.ERROR, `트렌딩 비디오 가져오기 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 주제 연구 수행
   */
  public async researchTopic(
    topic: string,
    depth: 'shallow' | 'medium' | 'deep' = 'medium',
    options: { sources?: string[], filters?: Record<string, any> } = {}
  ): Promise<IResearchResult> {
    this.log(LogLevel.INFO, `주제 연구 수행: ${topic}`, { depth, options });
    
    try {
      // 연구 깊이에 따른 검색 항목 수 결정
      const limits = {
        shallow: { web: 5, news: 3, video: 2 },
        medium: { web: 10, news: 5, video: 3 },
        deep: { web: 20, news: 10, video: 5 }
      };
      
      const { web: webLimit, news: newsLimit, video: videoLimit } = limits[depth];
      
      // 병렬로 여러 소스에서 검색 수행
      const [webResults, newsResults, videoResults] = await Promise.all([
        this.performWebSearch(topic, webLimit, options.filters),
        this.performNewsSearch(topic, newsLimit, options.filters),
        this.performYouTubeSearch(topic, videoLimit, options.filters)
      ]);
      
      // 결과 통합
      const combinedResults = {
        topic,
        web: webResults.results,
        news: newsResults.results,
        videos: videoResults.results,
        sources: [...webResults.sources, ...newsResults.sources, ...videoResults.sources]
      };
      
      // 요약 생성 (Gemini 서비스 사용)
      const summary = await this.generateResearchSummary(topic, combinedResults);
      
      // 연구 결과를 컨텍스트에 저장
      await this.context.addItem({
        type: 'topic_research',
        content: {
          ...combinedResults,
          summary
        },
        metadata: {
          topic,
          timestamp: Date.now(),
          depth
        }
      });
      
      return {
        query: topic,
        sources: combinedResults.sources,
        results: [
          { type: 'web', items: webResults.results },
          { type: 'news', items: newsResults.results },
          { type: 'videos', items: videoResults.results }
        ],
        summary,
        timestamp: Date.now()
      };
    } catch (error) {
      this.log(LogLevel.ERROR, `주제 연구 오류: ${error instanceof Error ? error.message : String(error)}`, { topic });
      throw error;
    }
  }

  /**
   * 키워드 연구 수행
   */
  public async researchKeywords(keyword: string, options: {
    related?: boolean;
    volume?: boolean;
    trends?: boolean;
    limit?: number;
  } = {}): Promise<IKeywordResearchResult> {
    this.log(LogLevel.INFO, `키워드 연구 수행: ${keyword}`, { options });
    
    try {
      const limit = options.limit || 10;
      
      // 관련 키워드 가져오기
      const relatedKeywords = await this.withRetry(
        () => this.getRelatedKeywords(keyword, limit),
        {
          maxRetries: 2,
          onRetry: (attempt) => this.log(LogLevel.WARN, `관련 키워드 가져오기 재시도 (${attempt})`, { keyword })
        }
      );
      
      // 키워드 연구 결과 생성
      const keywordResult: IKeywordResearchResult = {
        mainKeyword: keyword,
        relatedKeywords
      };
      
      // 키워드 연구 결과를 컨텍스트에 저장
      await this.context.addItem({
        type: 'keyword_research',
        content: keywordResult,
        metadata: {
          keyword,
          timestamp: Date.now()
        }
      });
      
      return keywordResult;
    } catch (error) {
      this.log(LogLevel.ERROR, `키워드 연구 오류: ${error instanceof Error ? error.message : String(error)}`, { keyword });
      throw error;
    }
  }

  /**
   * 포괄적인 연구 수행
   */
  public async performComprehensiveResearch(params: {
    topic: string;
    depth?: 'shallow' | 'medium' | 'deep';
    includeSources?: string[];
    excludeSources?: string[];
    filters?: Record<string, any>;
    generateSummary?: boolean;
  }): Promise<IResearchResult> {
    const { 
      topic, 
      depth = 'medium', 
      includeSources = ['web', 'news', 'youtube'], 
      excludeSources = [],
      filters = {},
      generateSummary = true
    } = params;
    
    this.log(LogLevel.INFO, `포괄적인 연구 수행: ${topic}`, { depth, includeSources, excludeSources });
    
    try {
      // 수행할 소스 결정
      const sources = includeSources.filter(source => !excludeSources.includes(source));
      
      // 병렬로 여러 소스에서 검색 수행
      const results: Record<string, any> = {};
      const sourceResults: string[] = [];
      
      const tasks: Promise<void>[] = [];
      
      if (sources.includes('web')) {
        tasks.push(
          this.performWebSearch(topic, depth === 'deep' ? 20 : depth === 'medium' ? 10 : 5, filters)
            .then(res => {
              results.web = res.results;
              sourceResults.push(...res.sources);
            })
        );
      }
      
      if (sources.includes('news')) {
        tasks.push(
          this.performNewsSearch(topic, depth === 'deep' ? 10 : depth === 'medium' ? 5 : 3, filters)
            .then(res => {
              results.news = res.results;
              sourceResults.push(...res.sources);
            })
        );
      }
      
      if (sources.includes('youtube')) {
        tasks.push(
          this.performYouTubeSearch(topic, depth === 'deep' ? 5 : depth === 'medium' ? 3 : 2, filters)
            .then(res => {
              results.videos = res.results;
              sourceResults.push(...res.sources);
            })
        );
      }
      
      // 모든 작업 완료 대기
      await Promise.all(tasks);
      
      // 요약 생성
      let summary: string | undefined;
      if (generateSummary) {
        summary = await this.generateResearchSummary(topic, results);
      }
      
      // 최종 결과 구성
      const finalResult: IResearchResult = {
        query: topic,
        sources: sourceResults,
        results: Object.entries(results).map(([type, items]) => ({ type, items })),
        summary,
        timestamp: Date.now()
      };
      
      // 연구 결과를 컨텍스트에 저장
      await this.context.addItem({
        type: 'comprehensive_research',
        content: finalResult,
        metadata: {
          topic,
          timestamp: Date.now(),
          depth,
          sources
        }
      });
      
      return finalResult;
    } catch (error) {
      this.log(LogLevel.ERROR, `포괄적인 연구 오류: ${error instanceof Error ? error.message : String(error)}`, { topic });
      throw error;
    }
  }

  /**
   * 관련 키워드 가져오기
   */
  private async getRelatedKeywords(keyword: string, limit = 10): Promise<string[]> {
    // 웹 검색 결과에서 관련 키워드 추출
    const searchResult = await this.performWebSearch(keyword, 5);
    
    // Gemini 서비스를 사용하여 관련 키워드 추출
    const prompt = `
      다음 웹 검색 결과를 기반으로 "${keyword}"와 관련된 키워드를 최대 ${limit}개 추출해주세요.
      검색 결과:
      ${JSON.stringify(searchResult.results.slice(0, 3))}
      
      결과는, 배열 형태로 반환해주세요 예: ["키워드1", "키워드2", ...]
    `;
    
    const response = await this.gemini.generateText(prompt);
    
    try {
      // 응답에서 JSON 배열 부분 추출
      const match = response.match(/\[.*\]/s);
      if (match) {
        const keywordsArray = JSON.parse(match[0]);
        return keywordsArray.slice(0, limit);
      }
      
      // 정규식으로 추출 실패 시 줄바꿈으로 분리
      const lines = response.split('\n').filter(line => 
        line.trim().length > 0 && 
        !line.includes('키워드') && 
        !line.includes('관련') && 
        !line.includes(':')
      );
      
      const extractedKeywords = lines
        .map(line => line.replace(/^\d+\.\s*|"|-|\*/g, '').trim())
        .filter(k => k.length > 0)
        .slice(0, limit);
      
      return extractedKeywords;
    } catch (error) {
      this.log(LogLevel.ERROR, `관련 키워드 추출 오류: ${error instanceof Error ? error.message : String(error)}`);
      
      // 실패 시 기본 값 반환
      return [`${keyword} 가이드`, `${keyword} 튜토리얼`, `${keyword} 예제`, `${keyword} 최신`, `${keyword} 활용`];
    }
  }

  /**
   * 연구 요약 생성
   */
  private async generateResearchSummary(topic: string, results: Record<string, any>): Promise<string> {
    // 요약을 위한 결과 데이터 준비
    const webResults = results.web?.slice(0, 3) || [];
    const newsResults = results.news?.slice(0, 2) || [];
    const videoResults = results.videos?.slice(0, 1) || [];
    
    // Gemini 요약 프롬프트 작성
    const prompt = `
      주제 "${topic}"에 대해 수집된 정보를 바탕으로 종합적인 요약을 작성해주세요.
      
      웹 검색 결과:
      ${JSON.stringify(webResults)}
      
      뉴스 검색 결과:
      ${JSON.stringify(newsResults)}
      
      비디오 검색 결과:
      ${JSON.stringify(videoResults)}
      
      요약은 다음 구조로 작성해주세요:
      1. 주제 개요 (2-3문장)
      2. 주요 발견점 (3-5개 항목, 가장 중요한 정보)
      3. 최신 동향 (뉴스 및 동영상 기반)
      4. 결론 (1-2문장)
      
      전체 요약은 500단어 이내로 작성해주세요.
    `;
    
    try {
      const summary = await this.gemini.generateText(prompt);
      return summary.trim();
    } catch (error) {
      this.log(LogLevel.ERROR, `연구 요약 생성 오류: ${error instanceof Error ? error.message : String(error)}`);
      return `주제 "${topic}"에 대한 요약을 생성하는 중 오류가 발생했습니다.`;
    }
  }
} 