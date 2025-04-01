import { v4 as uuidv4 } from 'uuid';
import { Workflow } from './executor';
import { useWorkflowStore } from './store';

/**
 * 예제 워크플로우를 생성하고 스토어에 저장하는 함수
 */
export function createExampleWorkflows() {
  const store = useWorkflowStore.getState();
  const now = new Date().toISOString();
  
  // 1. 블로그 콘텐츠 생성 워크플로우
  const blogWorkflow: Workflow = {
    id: `wf-${uuidv4()}`,
    name: '블로그 콘텐츠 작성 워크플로우',
    description: '블로그 콘텐츠를 생성하고 최적화하는 워크플로우',
    steps: [
      {
        id: 'step-1',
        type: 'content',
        name: '블로그 콘텐츠 생성',
        config: {
          task: 'generate',
          topic: '인공지능 개발 동향',
          contentType: 'blog-post',
          wordCount: 1000,
          keywords: ['AI', 'machine learning', '딥러닝', '자연어 처리'],
          tone: 'informative'
        },
        dependencies: []
      },
      {
        id: 'step-2',
        type: 'analysis',
        name: 'SEO 분석',
        config: {
          task: 'data-analysis',
          data: {
            // 콘텐츠 분석 데이터는 이전 단계에서 가져옴
            // 더미 데이터 설정
            seoTargets: ['검색 엔진 최적화', '콘텐츠 마케팅'],
            checkReadability: true
          },
          analysisTypes: ['readability', 'keywords']
        },
        dependencies: ['step-1']
      },
      {
        id: 'step-3',
        type: 'content',
        name: '콘텐츠 최적화',
        config: {
          task: 'optimize',
          optimizationTypes: ['readability', 'seo']
          // content는 이전 단계의 결과에서 가져옴
        },
        dependencies: ['step-2']
      },
      {
        id: 'step-4',
        type: 'content',
        name: '헤드라인 생성',
        config: {
          task: 'headline',
          count: 5,
          styles: ['informative', 'engaging', 'question']
          // topic 또는 content는 이전 단계에서 가져옴
        },
        dependencies: ['step-3']
      }
    ],
    createdAt: now,
    updatedAt: now,
    status: 'idle'
  };
  
  // 2. 시장 조사 워크플로우
  const marketResearchWorkflow: Workflow = {
    id: `wf-${uuidv4()}`,
    name: '시장 조사 워크플로우',
    description: '특정 시장에 대한 포괄적인 조사 및 분석을 수행하는 워크플로우',
    steps: [
      {
        id: 'step-1',
        type: 'analysis',
        name: '시장 조사',
        config: {
          task: 'market',
          market: '인공지능 소프트웨어',
          areas: ['competitors', 'trends', 'audience'],
          depth: 'deep'
        },
        dependencies: []
      },
      {
        id: 'step-2',
        type: 'analysis',
        name: '트렌드 분석',
        config: {
          task: 'trend',
          timeRange: 'year',
          trendTypes: ['rising', 'falling', 'seasonal']
          // data는 이전 단계의 결과에서 가져옴
        },
        dependencies: ['step-1']
      },
      {
        id: 'step-3',
        type: 'content',
        name: '시장 보고서 작성',
        config: {
          task: 'generate',
          contentType: 'report',
          wordCount: 2000,
          tone: 'professional'
          // 데이터는 이전 단계의 결과에서 가져옴
        },
        dependencies: ['step-2']
      },
      {
        id: 'step-4',
        type: 'analysis',
        name: '인사이트 추출',
        config: {
          task: 'insight',
          depth: 'deep'
          // data는 이전 단계의 결과에서 가져옴
        },
        dependencies: ['step-3']
      }
    ],
    createdAt: now,
    updatedAt: now,
    status: 'idle'
  };
  
  // 3. 콘텐츠 분석 워크플로우
  const contentAnalysisWorkflow: Workflow = {
    id: `wf-${uuidv4()}`,
    name: '콘텐츠 분석 워크플로우',
    description: '기존 콘텐츠를 분석하고 개선 방안을 제시하는 워크플로우',
    steps: [
      {
        id: 'step-1',
        type: 'analysis',
        name: '콘텐츠 감정 분석',
        config: {
          task: 'sentiment',
          text: '이 제품은 정말 좋습니다. 기능이 다양하고 사용하기 쉽습니다. 다만, 가격이 조금 비싸다는 단점이 있습니다.',
          detailed: true
        },
        dependencies: []
      },
      {
        id: 'step-2',
        type: 'content',
        name: '콘텐츠 분석',
        config: {
          task: 'analyze',
          analysisTypes: ['readability', 'sentiment', 'keywords']
          // content는 이전 단계의 결과에서 가져옴
        },
        dependencies: ['step-1']
      },
      {
        id: 'step-3',
        type: 'content',
        name: 'SEO 최적화',
        config: {
          task: 'seo',
          targetKeywords: ['제품', '기능', '사용성', '가격']
          // content는 이전 단계의 결과에서 가져옴
        },
        dependencies: ['step-2']
      }
    ],
    createdAt: now,
    updatedAt: now,
    status: 'idle'
  };
  
  // 4. 웹 리서치 워크플로우 (연구 에이전트 활용)
  const webResearchWorkflow: Workflow = {
    id: `wf-${uuidv4()}`,
    name: '웹 리서치 워크플로우',
    description: '연구 에이전트를 활용한 웹 리서치 및 콘텐츠 생성 워크플로우',
    steps: [
      {
        id: 'step-1',
        type: 'research',
        name: '웹 검색',
        config: {
          task: 'webSearch',
          query: '최신 인공지능 기술 트렌드',
          limit: 10
        },
        dependencies: []
      },
      {
        id: 'step-2',
        type: 'research',
        name: '콘텐츠 리서치',
        config: {
          task: 'contentResearch',
          topic: '인공지능 기술',
          depth: 'deep'
        },
        dependencies: ['step-1']
      },
      {
        id: 'step-3',
        type: 'research',
        name: '키워드 연구',
        config: {
          task: 'keywordResearch',
          topic: '인공지능 기술',
          intent: 'informational'
        },
        dependencies: ['step-2']
      },
      {
        id: 'step-4',
        type: 'content',
        name: '리서치 기반 콘텐츠 생성',
        config: {
          task: 'generate',
          contentType: 'article',
          wordCount: 1500,
          tone: 'educational'
          // 키워드는 이전 단계에서 가져옴
        },
        dependencies: ['step-3']
      }
    ],
    createdAt: now,
    updatedAt: now,
    status: 'idle'
  };
  
  // 5. 경쟁사 분석 워크플로우 (연구 에이전트 활용)
  const competitorAnalysisWorkflow: Workflow = {
    id: `wf-${uuidv4()}`,
    name: '경쟁사 분석 워크플로우',
    description: '연구 에이전트를 활용한 경쟁사 분석 및 시장 전략 수립 워크플로우',
    steps: [
      {
        id: 'step-1',
        type: 'research',
        name: '경쟁사 분석',
        config: {
          task: 'competitorAnalysis',
          competitors: ['CompanyA', 'CompanyB', 'CompanyC'],
          aspects: ['products', 'pricing', 'marketing', 'strengths']
        },
        dependencies: []
      },
      {
        id: 'step-2',
        type: 'research',
        name: '시장 트렌드 조사',
        config: {
          task: 'trendResearch',
          topic: '인공지능 소프트웨어 시장',
          timeframe: 'medium'
        },
        dependencies: ['step-1']
      },
      {
        id: 'step-3',
        type: 'analysis',
        name: '경쟁 우위 분석',
        config: {
          task: 'data-analysis',
          analysisType: 'competitive'
          // 데이터는 이전 단계에서 가져옴
        },
        dependencies: ['step-2']
      },
      {
        id: 'step-4',
        type: 'content',
        name: '경쟁 전략 보고서 생성',
        config: {
          task: 'generate',
          contentType: 'report',
          wordCount: 1200,
          tone: 'analytical'
          // 분석 결과는 이전 단계에서 가져옴
        },
        dependencies: ['step-3']
      }
    ],
    createdAt: now,
    updatedAt: now,
    status: 'idle'
  };
  
  // 스토어에 워크플로우 추가
  store.addWorkflow(blogWorkflow);
  store.addWorkflow(marketResearchWorkflow);
  store.addWorkflow(contentAnalysisWorkflow);
  store.addWorkflow(webResearchWorkflow);
  store.addWorkflow(competitorAnalysisWorkflow);
  
  console.log('예제 워크플로우가 생성되었습니다.');
  return [
    blogWorkflow.id, 
    marketResearchWorkflow.id, 
    contentAnalysisWorkflow.id,
    webResearchWorkflow.id,
    competitorAnalysisWorkflow.id
  ];
} 