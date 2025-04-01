import { BaseAgent, IAgentConfig, IAgentMessage, IAgentResponse } from '../base-agent';

interface IContentSpec {
  id: string;
  type: 'article' | 'blog' | 'social' | 'script' | 'newsletter';
  title?: string;
  keywords?: string[];
  targetAudience?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  structure?: {
    sections?: string[];
    includeSummary?: boolean;
    includeHeadings?: boolean;
    includeKeyPoints?: boolean;
  };
  references?: {
    urls?: string[];
    citations?: string[];
  };
}

interface IContentResult {
  id: string;
  specId: string;
  type: string;
  content: {
    title: string;
    sections: {
      heading?: string;
      content: string;
      type: 'introduction' | 'body' | 'conclusion' | 'summary' | 'key_points';
    }[];
    metadata: {
      wordCount: number;
      readingTime: number;
      keywords: string[];
      seoScore?: number;
    };
  };
  metadata: {
    generatedAt: number;
    version: number;
    confidence: number;
  };
}

interface IContentTemplate {
  id: string;
  type: 'article' | 'blog' | 'social' | 'script' | 'newsletter';
  name: string;
  description: string;
  structure: {
    sections: string[];
    patterns: string[];
    examples: string[];
  };
  metadata: {
    created: number;
    lastUsed: number;
    usageCount: number;
    tags: string[];
  };
}

interface IContentAnalysis {
  specId: string;
  contentId: string;
  analysis: {
    clarity: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    engagement: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    seo: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    recommendations: string[];
  };
}

interface IContentTools {
  textTools: {
    analyzeReadability: (text: string) => { score: number; grade: string; issues: string[] };
    analyzeSentiment: (text: string) => { score: number; sentiment: 'positive' | 'neutral' | 'negative' };
    generateKeywords: (text: string, count?: number) => string[];
    summarizeText: (text: string, maxLength?: number) => string;
  };
  seoTools: {
    analyzeKeywordDensity: (text: string, keyword: string) => number;
    suggestKeywords: (topic: string, count?: number) => Promise<string[]>;
    optimizeHeadings: (headings: string[]) => string[];
    calculateSeoScore: (content: any) => number;
  };
  structureTools: {
    createOutline: (topic: string, sections?: number) => Promise<string[]>;
    suggestHeadlines: (topic: string, count?: number) => Promise<string[]>;
    improveIntroduction: (intro: string) => Promise<string>;
    improveConclusion: (conclusion: string) => Promise<string>;
  };
}

export class ContentAgent extends BaseAgent {
  private contentSpecs: Map<string, IContentSpec>;
  private contentResults: Map<string, IContentResult[]>;
  private templates: Map<string, IContentTemplate[]>;
  private tools: IContentTools;

  constructor(config: IAgentConfig) {
    super({
      ...config,
      capabilities: [
        'content_creation',
        'content_editing',
        'content_optimization',
        'keyword_research',
        'seo_optimization',
        'headline_generation',
        'content_structure'
      ],
    });
    this.contentSpecs = new Map();
    this.contentResults = new Map();
    this.templates = new Map();
    this.tools = this.initializeTools();
  }

  protected async onInitialize(): Promise<void> {
    // 콘텐츠 에이전트 초기화 로직
    await this.loadContentTemplates();
    await this.initializeContentTools();
  }

  protected async onShutdown(): Promise<void> {
    // 콘텐츠 에이전트 종료 로직
    this.contentSpecs.clear();
    this.contentResults.clear();
    this.templates.clear();
  }

  protected async onProcessMessage(message: IAgentMessage): Promise<any> {
    switch (message.type) {
      case 'CREATE_CONTENT_SPEC':
        return this.createContentSpec(message.content);
      case 'GENERATE_CONTENT':
        return this.generateContent(message.content);
      case 'ANALYZE_CONTENT':
        return this.analyzeContent(message.content);
      case 'OPTIMIZE_CONTENT':
        return this.optimizeContent(message.content);
      case 'GENERATE_HEADLINES':
        return this.generateHeadlines(message.content);
      case 'GET_CONTENT_HISTORY':
        return this.getContentHistory(message.content.specId);
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  private initializeTools(): IContentTools {
    return {
      textTools: {
        analyzeReadability: (text: string) => {
          // 간단한 가독성 점수 계산 (실제로는 더 복잡한 알고리즘 사용)
          const words = text.split(/\s+/).length;
          const sentences = text.split(/[.!?]+/).length;
          const avgWordsPerSentence = words / Math.max(1, sentences);
          
          let grade = 'Medium';
          let score = 70;
          let issues: string[] = [];
          
          if (avgWordsPerSentence > 20) {
            score -= 10;
            issues.push('문장이 너무 깁니다. 더 짧은 문장으로 나누세요.');
            grade = 'Hard';
          } else if (avgWordsPerSentence < 8) {
            grade = 'Easy';
            score += 10;
          }
          
          // 긴 단어 비율 체크 (예시로 6자 이상 단어를 "긴 단어"로 정의)
          const longWords = text.split(/\s+/).filter(w => w.length > 6).length;
          const longWordRatio = longWords / Math.max(1, words);
          
          if (longWordRatio > 0.2) {
            score -= 5;
            issues.push('긴 단어가 너무 많습니다. 더 간단한 단어로 대체하세요.');
          }
          
          return { score, grade, issues };
        },
        
        analyzeSentiment: (text: string) => {
          // 감정 분석을 수행하는 간단한 함수 (실제로는 ML 모델 사용)
          const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', '좋은', '훌륭한', '뛰어난'];
          const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'horrible', '나쁜', '형편없는', '끔찍한'];
          
          const words = text.toLowerCase().split(/\s+/);
          
          let positiveCount = 0;
          let negativeCount = 0;
          
          words.forEach(word => {
            if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
            if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
          });
          
          const sentimentScore = (positiveCount - negativeCount) / Math.max(1, words.length) * 100;
          
          let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
          if (sentimentScore > 5) sentiment = 'positive';
          else if (sentimentScore < -5) sentiment = 'negative';
          
          return { 
            score: sentimentScore,
            sentiment
          };
        },
        
        generateKeywords: (text: string, count: number = 5) => {
          // 텍스트에서 키워드 추출 (실제로는 TF-IDF와 같은 알고리즘 사용)
          const stopWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', '이', '그', '및', '은', '는'];
          const words = text.toLowerCase().split(/\s+/);
          
          const wordFreq: {[key: string]: number} = {};
          
          words.forEach(word => {
            if (word.length < 3) return; // 너무 짧은 단어 제외
            if (stopWords.includes(word)) return; // 불용어 제외
            
            wordFreq[word] = (wordFreq[word] || 0) + 1;
          });
          
          // 빈도수에 따라 정렬하고 상위 n개 반환
          return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(entry => entry[0]);
        },
        
        summarizeText: (text: string, maxLength: number = 200) => {
          // 텍스트 요약 (실제로는 추출 또는 추상적 요약 알고리즘 사용)
          const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
          
          // 매우 간단한 방식: 첫 번째와 마지막 문장, 그리고 중간 몇 개 가져오기
          let summary = "";
          
          if (sentences.length > 0) summary += sentences[0] + ". ";
          
          if (sentences.length > 3) {
            const middleIndex = Math.floor(sentences.length / 2);
            summary += sentences[middleIndex] + ". ";
          }
          
          if (sentences.length > 1) {
            summary += sentences[sentences.length - 1] + ".";
          }
          
          // 최대 길이로 자르기
          if (summary.length > maxLength) {
            summary = summary.substring(0, maxLength) + "...";
          }
          
          return summary;
        }
      },
      
      seoTools: {
        analyzeKeywordDensity: (text: string, keyword: string) => {
          const words = text.toLowerCase().split(/\s+/);
          const keywordCount = words.filter(word => word === keyword.toLowerCase()).length;
          return (keywordCount / Math.max(1, words.length)) * 100;
        },
        
        suggestKeywords: async (topic: string, count?: number) => {
          // 실제로는 키워드 도구 API를 호출하거나 머신러닝 모델 사용
          // 지금은 간단한 예시로 관련 키워드 목록 반환
          const keywordsByTopic: {[key: string]: string[]} = {
            'technology': ['artificial intelligence', 'blockchain', 'cloud computing', 'data science', 'cybersecurity', 'machine learning', 'IoT'],
            'health': ['wellness', 'nutrition', 'fitness', 'mental health', 'healthcare', 'medicine', 'diet'],
            'business': ['entrepreneurship', 'marketing', 'finance', 'strategy', 'leadership', 'innovation', 'management'],
            'travel': ['destination', 'adventure', 'tourism', 'vacation', 'culture', 'exploration', 'trip planning'],
            'food': ['cuisine', 'recipes', 'cooking', 'baking', 'nutrition', 'gastronomy', 'restaurants']
          };
          
          // topic이 키워드 딕셔너리에 있으면 해당 리스트 반환, 없으면 기본 키워드 반환
          const keywords = keywordsByTopic[topic.toLowerCase()] || 
            ['guide', 'tips', 'how to', 'best practices', 'examples', 'tutorial', 'benefits'];
          
          return keywords.slice(0, count || 5);
        },
        
        optimizeHeadings: (headings: string[]) => {
          // 헤딩 최적화 (더 SEO 친화적으로 변경)
          return headings.map(heading => {
            // 1. 너무 짧은 헤딩 처리
            if (heading.length < 5) {
              return heading + " - Complete Guide";
            }
            
            // 2. 숫자 추가 (리스트 형식은 SEO에 좋음)
            if (!heading.match(/^\d+\s/) && Math.random() > 0.5) {
              const num = Math.floor(Math.random() * 10) + 1;
              return `${num} ${heading}`;
            }
            
            // 3. 감성 키워드 추가
            if (Math.random() > 0.7) {
              const emotions = ['Ultimate', 'Essential', 'Complete', 'Definitive', 'Expert'];
              const emotion = emotions[Math.floor(Math.random() * emotions.length)];
              return `${emotion} ${heading}`;
            }
            
            return heading;
          });
        },
        
        calculateSeoScore: (content: any) => {
          // 콘텐츠의 SEO 점수 계산
          let score = 70; // 기본 점수
          
          // 1. 제목 길이 체크
          if (content.title) {
            const titleLength = content.title.length;
            if (titleLength >= 40 && titleLength <= 60) {
              score += 5; // 이상적인 제목 길이
            } else if (titleLength < 20 || titleLength > 70) {
              score -= 5; // 너무 짧거나 긴 제목
            }
          } else {
            score -= 10; // 제목 없음
          }
          
          // 2. 콘텐츠 길이 체크
          let totalContentLength = 0;
          if (content.sections) {
            content.sections.forEach((section: any) => {
              if (section.content) {
                totalContentLength += section.content.length;
              }
            });
            
            if (totalContentLength > 1500) {
              score += 10; // 긴 콘텐츠는 SEO에 유리
            } else if (totalContentLength < 500) {
              score -= 10; // 너무 짧은 콘텐츠
            }
          }
          
          // 3. 섹션 및 헤딩 구조 체크
          if (content.sections) {
            const hasHeadings = content.sections.some((section: any) => section.heading);
            if (hasHeadings) {
              score += 5; // 헤딩 사용
            }
            
            if (content.sections.length >= 3) {
              score += 5; // 적절한 섹션 수
            }
          }
          
          // 4. 키워드 체크
          if (content.metadata && content.metadata.keywords && content.metadata.keywords.length > 0) {
            score += 5; // 키워드 있음
          }
          
          return Math.min(100, Math.max(0, score)); // 점수는 0-100 사이
        }
      },
      
      structureTools: {
        createOutline: async (topic: string, sections: number = 5) => {
          // 주제에 따른 아웃라인 생성 (실제로는 AI 모델 사용)
          const outlineTemplates: {[key: string]: string[]} = {
            'how-to': [
              'Introduction: Why This Skill Matters',
              'Understanding the Basics',
              'Step-by-Step Guide',
              'Common Challenges and Solutions',
              'Advanced Techniques',
              'Tools and Resources',
              'Conclusion: Taking Your Skills Further'
            ],
            'guide': [
              'Introduction to {topic}',
              'The History and Evolution of {topic}',
              'Key Components of {topic}',
              'Benefits and Applications',
              'Challenges and Limitations',
              'Future Trends',
              'Conclusion: The Impact of {topic}'
            ],
            'comparison': [
              'Introduction: Understanding the Options',
              'Overview of Option A',
              'Overview of Option B',
              'Key Differences',
              'Performance Comparison',
              'Cost Analysis',
              'Conclusion: Making the Right Choice'
            ],
            'list': [
              'Introduction: Why These {topic} Matter',
              'Top Selection Criteria',
              'Item 1-3 Details',
              'Item 4-6 Details',
              'Item 7-10 Details',
              'Honorable Mentions',
              'Conclusion: How to Choose'
            ]
          };
          
          // 랜덤으로 아웃라인 템플릿 선택
          const templateKeys = Object.keys(outlineTemplates);
          const selectedTemplate = outlineTemplates[templateKeys[Math.floor(Math.random() * templateKeys.length)]];
          
          // 주제로 치환하고 섹션 수에 맞게 자르기
          const outline = selectedTemplate
            .map(item => item.replace('{topic}', topic))
            .slice(0, Math.max(2, sections)); // 적어도 서론과 한 개의 섹션은 포함
          
          return outline;
        },
        
        suggestHeadlines: async (topic: string, count: number = 5) => {
          // 주제에 따른 헤드라인 제안 (실제로는 AI 모델 사용)
          const headlineTemplates = [
            'The Ultimate Guide to {topic}',
            '{topic}: Everything You Need to Know',
            '10 Ways to Master {topic}',
            'How {topic} is Changing the Future',
            'Why {topic} Matters More Than Ever',
            'The Secret to Successful {topic}',
            'Understanding {topic}: A Beginner\'s Guide',
            '{topic} 101: Essential Tips and Tricks',
            'The Complete {topic} Handbook',
            'How to Leverage {topic} for Maximum Results'
          ];
          
          // 무작위로 템플릿 선택하고 주제로 치환
          const headlines = [];
          const usedIndexes = new Set<number>();
          
          while (headlines.length < count && headlines.length < headlineTemplates.length) {
            let randomIndex;
            do {
              randomIndex = Math.floor(Math.random() * headlineTemplates.length);
            } while (usedIndexes.has(randomIndex));
            
            usedIndexes.add(randomIndex);
            headlines.push(headlineTemplates[randomIndex].replace('{topic}', topic));
          }
          
          return headlines;
        },
        
        improveIntroduction: async (intro: string) => {
          // 서론 개선 (실제로는 AI 모델 사용)
          // 여기서는 간단한 템플릿 기반 개선만 적용
          
          // 시작 문장 강화
          if (intro.length < 100) {
            return `Did you know that experts consider this topic one of the most important in the field? ${intro} Understanding this concept can dramatically improve your results and give you an edge over competitors.`;
          }
          
          // 질문 추가
          if (!intro.includes('?')) {
            const questions = [
              'Have you ever wondered why this matters so much?',
              'What makes this topic so essential for success?',
              'Why do professionals invest so much time mastering this skill?'
            ];
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            return `${randomQuestion} ${intro}`;
          }
          
          // 통계 추가
          if (!intro.includes('%') && !intro.includes('percent')) {
            return `According to recent studies, over 85% of industry leaders emphasize the importance of this topic. ${intro}`;
          }
          
          return intro; // 이미 좋은 서론이면 그대로 반환
        },
        
        improveConclusion: async (conclusion: string) => {
          // 결론 개선 (실제로는 AI 모델 사용)
          // 여기서는 간단한 템플릿 기반 개선만 적용
          
          // 콜 투 액션 추가
          if (!conclusion.includes('now') && !conclusion.includes('today') && !conclusion.includes('start')) {
            return `${conclusion} Start implementing these strategies today and see the difference they can make in your results.`;
          }
          
          // 요약 강화
          if (conclusion.length < 100) {
            return `${conclusion} Remember, mastering this topic is not just about knowledge, but about consistent application and refinement of techniques. The principles we've discussed serve as a foundation for continued growth and success.`;
          }
          
          // 미래 전망 추가
          if (!conclusion.includes('future') && !conclusion.includes('coming') && !conclusion.includes('next')) {
            return `${conclusion} As we look to the future, these concepts will only become more important, positioning early adopters for significant advantages in the coming years.`;
          }
          
          return conclusion; // 이미 좋은 결론이면 그대로 반환
        }
      }
    };
  }

  private async loadContentTemplates(): Promise<void> {
    // 템플릿 로드 구현 (실제로는 DB나 파일에서 로드)
    const articleTemplates: IContentTemplate[] = [
      {
        id: '1',
        type: 'article',
        name: '표준 뉴스 기사',
        description: '표준 뉴스 기사 구조를 따르는 템플릿',
        structure: {
          sections: ['headline', 'summary', 'introduction', 'main_points', 'details', 'quotes', 'context', 'conclusion'],
          patterns: ['who', 'what', 'when', 'where', 'why', 'how'],
          examples: ['example_news_1', 'example_news_2']
        },
        metadata: {
          created: Date.now(),
          lastUsed: Date.now(),
          usageCount: 0,
          tags: ['news', 'journalism', 'article']
        }
      },
      {
        id: '2',
        type: 'blog',
        name: '하우투 블로그',
        description: '단계별 가이드 형식의 블로그 포스트',
        structure: {
          sections: ['catchy_title', 'introduction', 'problem_statement', 'steps', 'tips', 'conclusion', 'call_to_action'],
          patterns: ['step_by_step', 'numbered_list', 'headings_subheadings'],
          examples: ['example_blog_1', 'example_blog_2']
        },
        metadata: {
          created: Date.now(),
          lastUsed: Date.now(),
          usageCount: 0,
          tags: ['blog', 'how-to', 'guide', 'tutorial']
        }
      }
    ];

    this.templates.set('article', articleTemplates);
  }

  private async initializeContentTools(): Promise<void> {
    // 추가적인 도구 초기화 (필요시)
    console.log('Content tools initialized');
  }

  public async createContentSpec(params: any): Promise<IContentSpec> {
    const { type, title, keywords, targetAudience, tone, length, structure, references } = params;
    
    if (!type) {
      throw new Error('Content type is required');
    }
    
    const id = `spec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const newSpec: IContentSpec = {
      id,
      type,
      title,
      keywords,
      targetAudience,
      tone,
      length,
      structure,
      references
    };
    
    this.contentSpecs.set(id, newSpec);
    this.contentResults.set(id, []);
    
    return newSpec;
  }

  public async generateContent(params: any): Promise<IContentResult> {
    const { specId, type } = params;
    
    const spec = this.contentSpecs.get(specId);
    if (!spec) {
      throw new Error(`Content spec with ID ${specId} not found`);
    }
    
    // 콘텐츠 ID 생성
    const contentId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 콘텐츠 생성 로직 (실제로는 AI 모델 호출)
    // 여기서는 더미 콘텐츠를 생성
    const result: IContentResult = {
      id: contentId,
      specId,
      type: spec.type,
      content: {
        title: spec.title || `Sample ${spec.type} about ${spec.keywords?.join(', ')}`,
        sections: [
          {
            type: 'introduction',
            content: `This is an introduction to ${spec.keywords?.join(', ')}. It aims to provide a comprehensive overview for ${spec.targetAudience}.`
          },
          {
            type: 'body',
            heading: 'Main Content',
            content: `Here's the main content about ${spec.keywords?.join(', ')}. This section would contain detailed information and analysis.`
          },
          {
            type: 'conclusion',
            content: `In conclusion, we've explored ${spec.keywords?.join(', ')} and its importance for ${spec.targetAudience}.`
          }
        ],
        metadata: {
          wordCount: 150,
          readingTime: 1,
          keywords: spec.keywords || [],
          seoScore: 70
        }
      },
      metadata: {
        generatedAt: Date.now(),
        version: 1,
        confidence: 0.8
      }
    };
    
    // 콘텐츠 저장
    const existingResults = this.contentResults.get(specId) || [];
    existingResults.push(result);
    this.contentResults.set(specId, existingResults);
    
    return result;
  }

  public async analyzeContent(params: any): Promise<IContentAnalysis> {
    const { specId, contentId } = params;
    
    // 스펙과 콘텐츠 확인
    const spec = this.contentSpecs.get(specId);
    if (!spec) {
      throw new Error(`Content spec with ID ${specId} not found`);
    }
    
    const resultList = this.contentResults.get(specId) || [];
    const content = resultList.find(r => r.id === contentId);
    
    if (!content) {
      throw new Error(`Content with ID ${contentId} not found`);
    }
    
    // 텍스트 추출
    let fullText = '';
    content.content.sections.forEach(section => {
      fullText += section.content + ' ';
    });
    
    // 가독성 분석
    const readability = this.tools.textTools.analyzeReadability(fullText);
    
    // 감성 분석
    const sentiment = this.tools.textTools.analyzeSentiment(fullText);
    
    // SEO 점수 계산
    const seoScore = this.tools.seoTools.calculateSeoScore(content.content);
    
    // 분석 결과 생성
    const analysis: IContentAnalysis = {
      specId,
      contentId,
      analysis: {
        clarity: {
          score: readability.score,
          issues: readability.issues,
          recommendations: [
            '더 짧은 문장을 사용하세요.',
            '불필요한 수식어를 제거하세요.',
            '전문 용어 사용을 줄이세요.'
          ]
        },
        engagement: {
          score: Math.min(100, Math.max(0, 50 + sentiment.score)),
          issues: sentiment.sentiment === 'negative' ? ['부정적인 어조가 지나치게 많습니다.'] : [],
          recommendations: [
            '질문을 통해 독자의 참여를 유도하세요.',
            '개인적인 이야기나 예시를 추가하세요.',
            '직접적인 어투를 사용하세요.'
          ]
        },
        seo: {
          score: seoScore,
          issues: seoScore < 70 ? ['키워드 밀도가 낮습니다.', '제목이 최적화되지 않았습니다.'] : [],
          recommendations: [
            '제목에 주요 키워드를 포함하세요.',
            '소제목(H2, H3)을 추가하세요.',
            '내부 및 외부 링크를 추가하세요.'
          ]
        },
        recommendations: [
          '전반적으로 콘텐츠의 길이를 늘리세요.',
          '독자층에 맞는 어휘를 사용하세요.',
          '시각적 요소(이미지, 차트 등)를 추가하세요.'
        ]
      }
    };
    
    return analysis;
  }

  public async optimizeContent(params: any): Promise<IContentResult> {
    const { specId, contentId, optimizationGoals } = params;
    
    // 스펙과 콘텐츠 확인
    const spec = this.contentSpecs.get(specId);
    if (!spec) {
      throw new Error(`Content spec with ID ${specId} not found`);
    }
    
    const resultList = this.contentResults.get(specId) || [];
    const contentIndex = resultList.findIndex(r => r.id === contentId);
    
    if (contentIndex === -1) {
      throw new Error(`Content with ID ${contentId} not found`);
    }
    
    const originalContent = resultList[contentIndex];
    
    // 최적화 목표에 따라 콘텐츠 개선
    const goals = optimizationGoals || ['clarity', 'engagement', 'seo'];
    const optimizedContent: IContentResult = {
      ...originalContent,
      id: `optimized_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      content: {
        ...originalContent.content,
        sections: [...originalContent.content.sections]
      },
      metadata: {
        ...originalContent.metadata,
        version: originalContent.metadata.version + 1,
        generatedAt: Date.now()
      }
    };
    
    // 각 섹션 최적화
    for (let i = 0; i < optimizedContent.content.sections.length; i++) {
      const section = optimizedContent.content.sections[i];
      let content = section.content;
      
      // 목표에 따른 최적화
      if (goals.includes('clarity')) {
        // 가독성 향상
        content = content.replace(/very /g, ''); // 불필요한 수식어 제거
        content = content.replace(/([.!?]) /g, '$1\n'); // 문장 구분을 위한 줄바꿈 추가
        content = content.split('\n').map(s => s.trim()).join('\n'); // 정리
      }
      
      if (goals.includes('engagement')) {
        // 참여도 향상
        if (section.type === 'introduction') {
          content = await this.tools.structureTools.improveIntroduction(content);
        } else if (section.type === 'conclusion') {
          content = await this.tools.structureTools.improveConclusion(content);
        }
        
        // 질문 추가 (100자마다 하나씩)
        if (content.length > 100 && !content.includes('?')) {
          const questions = [
            'Isn\'t that fascinating?',
            'What does this mean for you?',
            'How can you apply this in your own context?'
          ];
          const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
          content += ` ${randomQuestion} `;
        }
      }
      
      if (goals.includes('seo')) {
        // SEO 향상
        if (spec.keywords && spec.keywords.length > 0) {
          // 주요 키워드 강조 (굵게 표시)
          const primaryKeyword = spec.keywords[0];
          if (!content.toLowerCase().includes(primaryKeyword.toLowerCase())) {
            content += ` This is particularly important when considering ${primaryKeyword}.`;
          } else {
            content = content.replace(
              new RegExp(`(${primaryKeyword})`, 'gi'),
              '**$1**'
            );
          }
        }
        
        // 섹션에 헤딩 추가
        if (!section.heading && section.type === 'body') {
          section.heading = 'Important Considerations';
        }
      }
      
      // 최적화된 콘텐츠 업데이트
      optimizedContent.content.sections[i] = {
        ...section,
        content
      };
    }
    
    // 최적화된 메타데이터 업데이트
    let wordCount = 0;
    optimizedContent.content.sections.forEach(section => {
      wordCount += section.content.split(/\s+/).length;
    });
    
    optimizedContent.content.metadata.wordCount = wordCount;
    optimizedContent.content.metadata.readingTime = Math.ceil(wordCount / 200); // 200wpm 기준
    optimizedContent.content.metadata.seoScore = this.tools.seoTools.calculateSeoScore(optimizedContent.content);
    
    // 최적화된 콘텐츠 저장
    resultList.push(optimizedContent);
    this.contentResults.set(specId, resultList);
    
    return optimizedContent;
  }

  public async generateHeadlines(params: any): Promise<string[]> {
    const { topic, count } = params;
    
    if (!topic) {
      throw new Error('Topic is required for headline generation');
    }
    
    return this.tools.structureTools.suggestHeadlines(topic, count || 5);
  }

  public getContentHistory(specId: string): IContentResult[] {
    const resultList = this.contentResults.get(specId);
    
    if (!resultList) {
      return [];
    }
    
    return resultList;
  }
  
  // 콘텐츠 템플릿 관리 메서드들
  public getTemplatesByType(type: string): IContentTemplate[] {
    return this.templates.get(type) || [];
  }
  
  public getTemplateById(templateId: string): IContentTemplate | null {
    // Map.entries()를 직접 순회하는 대신 Array.from으로 변환하여 사용
    const allTemplateEntries = Array.from(this.templates.entries());
    for (const [type, templates] of allTemplateEntries) {
      const template = templates.find((t: IContentTemplate) => t.id === templateId);
      if (template) {
        return template;
      }
    }
    return null;
  }
  
  public addTemplate(template: IContentTemplate): void {
    const templates = this.templates.get(template.type) || [];
    templates.push(template);
    this.templates.set(template.type, templates);
  }
  
  public updateTemplateUsage(templateId: string): void {
    // Map.entries()를 직접 순회하는 대신 Array.from으로 변환하여 사용
    const allTemplateEntries = Array.from(this.templates.entries());
    for (const [type, templates] of allTemplateEntries) {
      const index = templates.findIndex((t: IContentTemplate) => t.id === templateId);
      if (index !== -1) {
        templates[index].metadata.lastUsed = Date.now();
        templates[index].metadata.usageCount += 1;
        this.templates.set(type, templates);
        break;
      }
    }
  }
} 