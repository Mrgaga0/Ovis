import { Agent, AgentResult, AgentContext } from './registry';
import { AgentRegistry } from './registry';
import { StepType } from '../workflow/executor';
import { BraveSearchAPI, SearchOptions, SearchResult } from '@/services/api/brave-search';

/**
 * 연구 에이전트 클래스
 * 웹 검색, 시장 조사, 콘텐츠 연구, 트렌드 조사 기능 제공
 */
export class ResearchAgent implements Agent {
  id: string;
  name: string;
  description: string;
  type: StepType;
  capabilities: string[];
  private braveSearchAPI: BraveSearchAPI | null = null;

  constructor(name: string, description: string) {
    this.id = `research-${Date.now()}`;
    this.name = name;
    this.description = description;
    this.type = 'research';
    this.capabilities = [
      'webSearch',
      'marketResearch',
      'contentResearch',
      'trendResearch',
      'competitorAnalysis',
      'keywordResearch'
    ];

    // 에이전트 레지스트리에 등록
    AgentRegistry.getInstance().registerAgent(this);
    this.initializeAPIs();
  }

  private async initializeAPIs() {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (apiKey) {
      this.braveSearchAPI = new BraveSearchAPI(apiKey);
    } else {
      console.warn('Brave 검색 API 키가 설정되지 않았습니다.');
    }
  }

  /**
   * 에이전트 실행 메서드
   * 수신된 작업 유형에 따라 적절한 메서드를 호출
   */
  async execute(config: any, context?: AgentContext): Promise<AgentResult> {
    console.log(`연구 에이전트 실행: ${config.task || '알 수 없는 작업'}`);

    try {
      switch (config.task) {
        case 'webSearch':
          return await this.performWebSearch(config.query, config.limit, config.options);
        case 'contentResearch':
          return await this.researchContent(config.topic, config.depth);
        case 'marketResearch':
          return await this.researchMarket(config.industry, config.focusAreas);
        case 'trendResearch':
          return await this.researchTrends(config.topic, config.timeframe);
        case 'competitorAnalysis':
          return await this.analyzeCompetitors(config.competitors, config.aspects);
        case 'keywordResearch':
          return await this.researchKeywords(config.topic, config.intent);
        default:
          throw new Error(`지원되지 않는 연구 작업: ${config.task}`);
      }
    } catch (error) {
      console.error('연구 에이전트 실행 오류:', error);
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 웹 검색 수행
   * @param query 검색 쿼리
   * @param limit 결과 제한 수
   * @param options 추가 검색 옵션
   */
  async performWebSearch(query: string, limit: number = 5, options?: SearchOptions): Promise<AgentResult> {
    if (!query) {
      return {
        success: false,
        result: null,
        error: '검색어를 입력해주세요.'
      };
    }

    try {
      if (!this.braveSearchAPI) {
        await this.initializeAPIs();
        if (!this.braveSearchAPI) {
          throw new Error('Brave 검색 API 초기화 실패');
        }
      }

      const searchOptions: SearchOptions = {
        count: limit,
        ...options
      };

      const searchResult = await this.braveSearchAPI.search(query, searchOptions);
      
      return {
        success: true,
        result: {
          query: searchResult.query,
          results: searchResult.results,
          totalResults: searchResult.totalResults,
          searchTime: searchResult.searchTime
        }
      };
    } catch (error) {
      console.error('웹 검색 오류:', error);
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : '검색 중 오류 발생'
      };
    }
  }

  /**
   * 콘텐츠 연구 수행
   * @param topic 연구 주제
   * @param depth 연구 깊이 (basic, intermediate, deep)
   */
  async researchContent(topic: string, depth: 'basic' | 'intermediate' | 'deep' = 'intermediate'): Promise<AgentResult> {
    if (!topic) {
      return {
        success: false,
        result: null,
        error: '연구 주제를 입력해주세요.'
      };
    }

    console.log(`콘텐츠 연구 수행: "${topic}" (깊이: ${depth})`);

    // 예시 결과
    const resultDepth = depth === 'basic' ? 3 : depth === 'intermediate' ? 5 : 8;
    
    return {
      success: true,
      result: {
        topic: topic,
        depth: depth,
        insights: [
          `${topic}에 관한 주요 개념 이해`,
          `${topic}의 역사적 발전 과정`,
          `${topic}의 현재 동향과 미래 전망`
        ].slice(0, resultDepth),
        sources: [
          {
            title: `${topic} 개론`,
            url: 'https://example.com/source1',
            reliability: 'high'
          },
          {
            title: `${topic}에 관한 연구`,
            url: 'https://example.com/source2',
            reliability: 'medium'
          }
        ],
        researchTime: depth === 'basic' ? 0.8 : depth === 'intermediate' ? 1.5 : 3.2
      }
    };
  }

  /**
   * 시장 조사 수행
   * @param industry 조사할 산업 분야
   * @param focusAreas 관심 영역 (예: 성장률, 경쟁사, 소비자 동향 등)
   */
  async researchMarket(industry: string, focusAreas: string[] = ['growth', 'competitors']): Promise<AgentResult> {
    if (!industry) {
      return {
        success: false,
        result: null,
        error: '산업 분야를 입력해주세요.'
      };
    }

    console.log(`시장 조사 수행: "${industry}" (관심 영역: ${focusAreas.join(', ')})`);

    // 예시 결과 
    return {
      success: true,
      result: {
        industry: industry,
        marketSize: '$XX 억',
        growth: {
          current: '연간 X.X%',
          forecast: '향후 5년간 연평균 X.X%'
        },
        keyPlayers: [
          {
            name: 'Company A',
            marketShare: 'XX%',
            strengths: ['기술 혁신', '광범위한 고객층']
          },
          {
            name: 'Company B',
            marketShare: 'XX%',
            strengths: ['가격 경쟁력', '유통망']
          }
        ],
        trends: [
          `${industry} 산업의 디지털 전환 가속화`,
          `${industry} 분야의 지속 가능성 중요성 증가`
        ],
        challenges: [
          '규제 환경 변화',
          '신기술 도입 비용'
        ],
        opportunities: [
          '신흥 시장 진출',
          '고객 경험 혁신'
        ],
        researchDate: new Date().toISOString().split('T')[0]
      }
    };
  }

  /**
   * 트렌드 조사 수행
   * @param topic 트렌드 주제
   * @param timeframe 시간 범위 (short, medium, long)
   */
  async researchTrends(topic: string, timeframe: 'short' | 'medium' | 'long' = 'medium'): Promise<AgentResult> {
    if (!topic) {
      return {
        success: false,
        result: null,
        error: '트렌드 주제를 입력해주세요.'
      };
    }

    console.log(`트렌드 조사 수행: "${topic}" (시간 범위: ${timeframe})`);

    // 기간별 설명 텍스트
    const timeframeText = {
      short: '최근 6개월',
      medium: '최근 2년',
      long: '최근 5년'
    };

    // 예시 결과
    return {
      success: true,
      result: {
        topic: topic,
        timeframe: timeframeText[timeframe],
        trendingTopics: [
          `${topic}의 디지털 혁신`,
          `${topic}에서의 AI 활용`,
          `${topic}의 지속가능성`
        ],
        popularityTrend: {
          overall: timeframe === 'short' ? '급증' : timeframe === 'medium' ? '점진적 증가' : '안정적 성장',
          regions: {
            asia: 'high',
            northAmerica: 'medium',
            europe: 'high',
            others: 'low'
          }
        },
        relatedTopics: [
          `${topic} 인프라`,
          `${topic} 투자`,
          `${topic} 규제`
        ],
        predictedDevelopments: [
          `향후 ${topic}에서 AI의 역할 확대`,
          `${topic} 관련 신기술 등장`
        ],
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * 경쟁사 분석 수행
   * @param competitors 경쟁사 목록
   * @param aspects 분석할 측면 (예: 제품, 가격, 마케팅 등)
   */
  async analyzeCompetitors(competitors: string[], aspects: string[] = ['products', 'pricing', 'marketing']): Promise<AgentResult> {
    if (!competitors || competitors.length === 0) {
      return {
        success: false,
        result: null,
        error: '경쟁사 목록을 제공해주세요.'
      };
    }

    console.log(`경쟁사 분석 수행: [${competitors.join(', ')}] (분석 측면: ${aspects.join(', ')})`);

    // 예시 결과
    const results = competitors.map(competitor => ({
      name: competitor,
      overview: `${competitor}는 해당 산업의 주요 플레이어로, 특히 X, Y, Z 영역에서 강점을 보입니다.`,
      strengths: ['브랜드 인지도', '기술력', '유통망'],
      weaknesses: ['가격대', '고객 서비스', '혁신 속도'],
      products: {
        mainOfferings: [`${competitor} 주요 제품 1`, `${competitor} 주요 제품 2`],
        uniqueSellingPoints: `${competitor}의 제품은 A, B, C 특성으로 차별화됩니다.`
      },
      marketStrategy: `${competitor}는 D, E, F 전략으로 시장에 접근하고 있습니다.`,
      customerSegments: ['기업', '소비자', '정부 기관'],
      recentDevelopments: [`${competitor}의 최근 인수합병`, `${competitor}의 신제품 출시`]
    }));

    return {
      success: true,
      result: {
        competitors: results,
        comparisonMatrix: {
          pricing: {
            competitor1: 'high',
            competitor2: 'medium'
          },
          quality: {
            competitor1: 'medium',
            competitor2: 'high'
          },
          marketShare: {
            competitor1: 'large',
            competitor2: 'growing'
          }
        },
        recommendations: [
          '차별화 전략 강화',
          '가격 전략 재검토',
          '고객 경험 개선'
        ],
        analysisDate: new Date().toISOString().split('T')[0]
      }
    };
  }

  /**
   * 키워드 연구 수행
   * @param topic 키워드 주제
   * @param intent 키워드 의도 (informational, commercial, navigational)
   */
  async researchKeywords(topic: string, intent: 'informational' | 'commercial' | 'navigational' = 'informational'): Promise<AgentResult> {
    if (!topic) {
      return {
        success: false,
        result: null,
        error: '키워드 주제를 입력해주세요.'
      };
    }

    console.log(`키워드 연구 수행: "${topic}" (의도: ${intent})`);

    // 의도별 문구
    const intentPhrases = {
      informational: ['방법', '가이드', '튜토리얼', '의미', '비교'],
      commercial: ['구매', '가격', '리뷰', '최고', '추천'],
      navigational: ['로그인', '웹사이트', '공식', '계정', '위치']
    };

    // 의도에 맞는 문구 선택
    const phrases = intentPhrases[intent];

    // 예시 키워드 생성
    const keywords = phrases.map(phrase => `${topic} ${phrase}`);

    // 예시 결과
    return {
      success: true,
      result: {
        topic: topic,
        intent: intent,
        primaryKeywords: [
          {
            keyword: topic,
            searchVolume: 'XX,XXX/월',
            competition: 'high',
            difficulty: 85
          }
        ],
        secondaryKeywords: keywords.map((keyword, index) => ({
          keyword: keyword,
          searchVolume: `${Math.floor(Math.random() * 10000)}/월`,
          competition: index % 2 === 0 ? 'medium' : 'low',
          difficulty: Math.floor(Math.random() * 70) + 30
        })),
        relatedQuestions: [
          `${topic}란 무엇인가?`,
          `${topic}의 장점은?`,
          `최고의 ${topic}는?`,
          `${topic} 가격은?`
        ],
        seasonalTrends: {
          highSeason: ['1월', '12월'],
          lowSeason: ['6월', '7월']
        },
        lastUpdated: new Date().toISOString()
      }
    };
  }
} 