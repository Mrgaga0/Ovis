import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentContext, AgentResult, AgentRegistry } from './registry';

/**
 * 분석 에이전트 클래스
 * 데이터 분석, 인사이트 추출, 트렌드 분석 등을 담당
 */
export class AnalysisAgent implements Agent {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly type = 'analysis' as const;
  public readonly capabilities: string[];

  /**
   * 생성자
   */
  constructor(name?: string, description?: string, id?: string) {
    this.id = id || `analysis-agent-${uuidv4()}`;
    this.name = name || '분석 에이전트';
    this.description = description || '데이터 분석, 인사이트 추출 및 트렌드 분석을 수행하는 에이전트';
    this.capabilities = [
      'data-analysis',
      'insight-extraction',
      'trend-analysis',
      'sentiment-analysis',
      'market-research'
    ];
    
    // 레지스트리에 자동 등록
    this.register();
  }

  /**
   * 에이전트 레지스트리에 등록
   */
  private register(): void {
    const registry = AgentRegistry.getInstance();
    registry.registerAgent(this);
  }

  /**
   * 에이전트 실행 메서드
   */
  public async execute(config: any, context: AgentContext): Promise<AgentResult> {
    console.log(`AnalysisAgent executing step: ${context.stepId}`);
    
    try {
      // 작업 타입에 따라 다른 메서드 호출
      if (config.task === 'data-analysis') {
        return await this.analyzeData(config, context);
      } else if (config.task === 'insight') {
        return await this.extractInsights(config, context);
      } else if (config.task === 'trend') {
        return await this.analyzeTrends(config, context);
      } else if (config.task === 'sentiment') {
        return await this.analyzeSentiment(config, context);
      } else if (config.task === 'market') {
        return await this.researchMarket(config, context);
      } else {
        throw new Error(`알 수 없는 작업 유형: ${config.task}`);
      }
    } catch (error) {
      console.error('AnalysisAgent 실행 중 오류:', error);
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 데이터 분석
   */
  private async analyzeData(config: any, context: AgentContext): Promise<AgentResult> {
    console.log('데이터 분석 중...');
    
    // 필수 파라미터 확인
    if (!config.data) {
      return {
        success: false,
        result: null,
        error: '분석할 데이터가 필요합니다.'
      };
    }
    
    const data = config.data;
    const analysisTypes = config.analysisTypes || ['descriptive', 'comparative'];
    
    // TODO: 실제 데이터 분석 로직 구현
    // 현재는 데모 목적으로 더미 분석 결과 반환
    
    // 기본 통계 계산 (예시)
    const calculateBasicStats = (values: number[]) => {
      if (values.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      
      // 중앙값 계산
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
      
      return { min, max, avg, median };
    };
    
    // 숫자 데이터 추출 (간단한 예시)
    const extractNumericalData = (data: any): number[] => {
      if (Array.isArray(data)) {
        return data.filter(item => typeof item === 'number');
      } else if (typeof data === 'object' && data !== null) {
        return Object.values(data).filter(item => typeof item === 'number') as number[];
      }
      return [];
    };
    
    const numericalData = extractNumericalData(data);
    const stats = calculateBasicStats(numericalData);
    
    // 최종 분석 결과 생성
    const analysis = {
      statistics: analysisTypes.includes('descriptive') ? stats : undefined,
      correlation: analysisTypes.includes('correlation') ? {
        strength: Math.random() * 2 - 1, // -1 ~ 1 사이의 값
        significance: Math.random()
      } : undefined,
      comparative: analysisTypes.includes('comparative') ? {
        differences: ['차이점1', '차이점2', '차이점3'],
        similarities: ['유사점1', '유사점2']
      } : undefined,
      dataPoints: numericalData.length,
      analyzedAt: new Date().toISOString()
    };
    
    return {
      success: true,
      result: analysis
    };
  }

  /**
   * 인사이트 추출
   */
  private async extractInsights(config: any, context: AgentContext): Promise<AgentResult> {
    console.log('인사이트 추출 중...');
    
    // 필수 파라미터 확인
    if (!config.data) {
      return {
        success: false,
        result: null,
        error: '인사이트 추출을 위한 데이터가 필요합니다.'
      };
    }
    
    const data = config.data;
    const insightDepth = config.depth || 'standard'; // standard, deep
    
    // TODO: 실제 인사이트 추출 로직 구현
    // 현재는 데모 목적으로 더미 인사이트 반환
    
    const insights = [
      {
        title: '주요 인사이트 1',
        description: '첫 번째 주요 인사이트에 대한 설명입니다.',
        importance: 0.9,
        confidence: 0.85,
        relatedData: ['관련 데이터1', '관련 데이터2']
      },
      {
        title: '주요 인사이트 2',
        description: '두 번째 주요 인사이트에 대한 설명입니다.',
        importance: 0.8,
        confidence: 0.75,
        relatedData: ['관련 데이터3', '관련 데이터4']
      },
      {
        title: '주요 인사이트 3',
        description: '세 번째 주요 인사이트에 대한 설명입니다.',
        importance: 0.7,
        confidence: 0.9,
        relatedData: ['관련 데이터5', '관련 데이터6']
      }
    ];
    
    if (insightDepth === 'deep') {
      insights.push(
        {
          title: '심층 인사이트 1',
          description: '심층 분석을 통한 첫 번째 인사이트입니다.',
          importance: 0.6,
          confidence: 0.7,
          relatedData: ['심층 데이터1', '심층 데이터2']
        },
        {
          title: '심층 인사이트 2',
          description: '심층 분석을 통한 두 번째 인사이트입니다.',
          importance: 0.5,
          confidence: 0.8,
          relatedData: ['심층 데이터3', '심층 데이터4']
        }
      );
    }
    
    return {
      success: true,
      result: {
        insights,
        summary: '전체 인사이트에 대한 요약 내용입니다.',
        dataPoints: typeof data === 'object' ? Object.keys(data).length : 1,
        insightDepth,
        extractedAt: new Date().toISOString()
      }
    };
  }

  /**
   * 트렌드 분석
   */
  private async analyzeTrends(config: any, context: AgentContext): Promise<AgentResult> {
    console.log('트렌드 분석 중...');
    
    // 필수 파라미터 확인
    if (!config.data) {
      return {
        success: false,
        result: null,
        error: '트렌드 분석을 위한 데이터가 필요합니다.'
      };
    }
    
    const data = config.data;
    const timeRange = config.timeRange || 'month'; // day, week, month, year
    const trendTypes = config.trendTypes || ['rising', 'falling', 'seasonal'];
    
    // TODO: 실제 트렌드 분석 로직 구현
    // 현재는 데모 목적으로 더미 트렌드 분석 결과 반환
    
    const trends = {
      rising: trendTypes.includes('rising') ? [
        { name: '상승 트렌드1', growth: '+25%', confidence: 0.9 },
        { name: '상승 트렌드2', growth: '+18%', confidence: 0.85 },
        { name: '상승 트렌드3', growth: '+12%', confidence: 0.75 }
      ] : [],
      
      falling: trendTypes.includes('falling') ? [
        { name: '하락 트렌드1', decline: '-15%', confidence: 0.8 },
        { name: '하락 트렌드2', decline: '-10%', confidence: 0.7 }
      ] : [],
      
      seasonal: trendTypes.includes('seasonal') ? [
        { name: '계절 트렌드1', pattern: '매년 12월 증가', confidence: 0.85 },
        { name: '계절 트렌드2', pattern: '매주 월요일 감소', confidence: 0.75 }
      ] : [],
      
      stable: trendTypes.includes('stable') ? [
        { name: '안정 트렌드1', variation: '±3%', confidence: 0.95 },
        { name: '안정 트렌드2', variation: '±5%', confidence: 0.9 }
      ] : []
    };
    
    return {
      success: true,
      result: {
        trends,
        timeRange,
        dataPoints: typeof data === 'object' ? Object.keys(data).length : 1,
        summary: `${timeRange} 기준 트렌드 분석 결과입니다.`,
        analyzedAt: new Date().toISOString()
      }
    };
  }

  /**
   * 감정 분석
   */
  private async analyzeSentiment(config: any, context: AgentContext): Promise<AgentResult> {
    console.log('감정 분석 중...');
    
    // 필수 파라미터 확인
    if (!config.text) {
      return {
        success: false,
        result: null,
        error: '감정 분석을 위한 텍스트가 필요합니다.'
      };
    }
    
    const text = config.text;
    const detailed = config.detailed === true;
    
    // TODO: 실제 감정 분석 로직 구현
    // 현재는 데모 목적으로 더미 감정 분석 결과 반환
    
    // 기본 감정 분석 결과
    const basicSentiment = {
      score: Math.random() * 2 - 1, // -1 (매우 부정) ~ 1 (매우 긍정)
      label: Math.random() > 0.5 ? '긍정적' : '부정적',
      confidence: 0.7 + Math.random() * 0.3 // 0.7 ~ 1.0
    };
    
    // 상세 감정 분석 (요청된 경우)
    const detailedSentiment = detailed ? {
      emotions: {
        joy: Math.random(),
        sadness: Math.random(),
        anger: Math.random(),
        fear: Math.random(),
        disgust: Math.random(),
        surprise: Math.random()
      },
      aspects: [
        { aspect: '측면1', sentiment: Math.random() * 2 - 1 },
        { aspect: '측면2', sentiment: Math.random() * 2 - 1 },
        { aspect: '측면3', sentiment: Math.random() * 2 - 1 }
      ],
      keyPhrases: [
        { phrase: '핵심 구문1', sentiment: Math.random() * 2 - 1 },
        { phrase: '핵심 구문2', sentiment: Math.random() * 2 - 1 },
        { phrase: '핵심 구문3', sentiment: Math.random() * 2 - 1 }
      ]
    } : undefined;
    
    return {
      success: true,
      result: {
        ...basicSentiment,
        detailed: detailedSentiment,
        textLength: text.length,
        analyzedAt: new Date().toISOString()
      }
    };
  }

  /**
   * 시장 조사
   */
  private async researchMarket(config: any, context: AgentContext): Promise<AgentResult> {
    console.log('시장 조사 중...');
    
    // 필수 파라미터 확인
    if (!config.market) {
      return {
        success: false,
        result: null,
        error: '시장 조사를 위한 시장 정보가 필요합니다.'
      };
    }
    
    const market = config.market;
    const researchAreas = config.areas || ['competitors', 'trends', 'audience'];
    const depth = config.depth || 'standard'; // standard, deep
    
    // TODO: 실제 시장 조사 로직 구현
    // 현재는 데모 목적으로 더미 시장 조사 결과 반환
    
    const research: Record<string, any> = {
      marketOverview: {
        name: market,
        size: '약 1,000억 원',
        growth: '+8.5% YoY',
        maturity: '성장기',
        description: `${market} 시장에 대한 간략한 설명입니다.`
      }
    };
    
    // 경쟁사 분석
    if (researchAreas.includes('competitors')) {
      research.competitors = [
        { name: '경쟁사1', marketShare: '35%', strengths: ['강점1', '강점2'], weaknesses: ['약점1'] },
        { name: '경쟁사2', marketShare: '25%', strengths: ['강점1'], weaknesses: ['약점1', '약점2'] },
        { name: '경쟁사3', marketShare: '15%', strengths: ['강점1', '강점2'], weaknesses: ['약점1'] }
      ];
      
      if (depth === 'deep') {
        research.competitorStrategies = {
          marketing: ['주요 마케팅 전략1', '주요 마케팅 전략2'],
          pricing: ['가격 전략1', '가격 전략2'],
          product: ['제품 전략1', '제품 전략2']
        };
      }
    }
    
    // 트렌드 분석
    if (researchAreas.includes('trends')) {
      research.trends = [
        { name: '트렌드1', impact: '높음', timeframe: '단기', description: '트렌드1에 대한 설명' },
        { name: '트렌드2', impact: '중간', timeframe: '중기', description: '트렌드2에 대한 설명' },
        { name: '트렌드3', impact: '낮음', timeframe: '장기', description: '트렌드3에 대한 설명' }
      ];
    }
    
    // 고객 분석
    if (researchAreas.includes('audience')) {
      research.audience = {
        segments: [
          { name: '세그먼트1', size: '40%', characteristics: ['특성1', '특성2'], needs: ['니즈1', '니즈2'] },
          { name: '세그먼트2', size: '35%', characteristics: ['특성3', '특성4'], needs: ['니즈3', '니즈4'] },
          { name: '세그먼트3', size: '25%', characteristics: ['특성5', '특성6'], needs: ['니즈5', '니즈6'] }
        ],
        demographics: {
          age: ['18-24 (20%)', '25-34 (35%)', '35-44 (25%)', '45+ (20%)'],
          gender: ['남성 (55%)', '여성 (45%)'],
          location: ['수도권 (60%)', '지방 (40%)']
        }
      };
    }
    
    // SWOT 분석 (심층 연구인 경우)
    if (depth === 'deep') {
      research.swot = {
        strengths: ['강점1', '강점2', '강점3'],
        weaknesses: ['약점1', '약점2'],
        opportunities: ['기회1', '기회2', '기회3'],
        threats: ['위협1', '위협2']
      };
    }
    
    return {
      success: true,
      result: {
        ...research,
        researchDepth: depth,
        researched: researchAreas,
        summary: `${market} 시장에 대한 ${depth} 수준의 연구 결과입니다.`,
        researchedAt: new Date().toISOString()
      }
    };
  }
} 