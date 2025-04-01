import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

// 컨텍스트 메시지 인터페이스
export interface IContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// 컨텍스트 항목 인터페이스
export interface IContextItem {
  id: string;
  type: string;
  content: any;
  timestamp: number;
  metadata?: Record<string, any>;
  tags?: string[];
  projectId?: string;
  relevance?: number;
}

// 데이터베이스 스키마
interface ContextDB extends DBSchema {
  conversations: {
    key: string;
    value: {
      id: string;
      messages: IContextMessage[];
      title: string;
      projectId?: string;
      metadata?: Record<string, any>;
      lastUpdated: number;
    };
    indexes: { 'by-last-updated': number; 'by-project': string };
  };
  contextItems: {
    key: string;
    value: IContextItem;
    indexes: { 'by-type': string; 'by-timestamp': number; 'by-project': string; 'by-tags': string[] };
  };
}

/**
 * 컨텍스트 관리 시스템
 * 단기 및 장기 메모리를 관리하고 관련 컨텍스트를 검색합니다.
 */
export class ContextManager {
  private static instance: ContextManager;
  private db: IDBPDatabase<ContextDB> | null = null;
  private shortTermMemory: Map<string, IContextItem> = new Map();
  private conversationCache: Map<string, IContextMessage[]> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private cacheExpiryTime: number = 30 * 60 * 1000; // 30분
  private shortTermMemoryLimit: number = 100;

  private constructor() {}

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * 컨텍스트 관리자 초기화
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeDB();
    await this.initPromise;
    this.initialized = true;
    this.initPromise = null;
  }

  /**
   * 데이터베이스 초기화
   */
  private async initializeDB(): Promise<void> {
    try {
      this.db = await openDB<ContextDB>('ovis-context-db', 1, {
        upgrade(db) {
          // 대화 저장소
          const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' });
          conversationStore.createIndex('by-last-updated', 'lastUpdated');
          conversationStore.createIndex('by-project', 'projectId');

          // 컨텍스트 항목 저장소
          const contextStore = db.createObjectStore('contextItems', { keyPath: 'id' });
          contextStore.createIndex('by-type', 'type');
          contextStore.createIndex('by-timestamp', 'timestamp');
          contextStore.createIndex('by-project', 'projectId');
          contextStore.createIndex('by-tags', 'tags', { multiEntry: true });
        }
      });
      console.log('컨텍스트 데이터베이스가 초기화되었습니다.');
    } catch (error) {
      console.error('컨텍스트 데이터베이스 초기화 오류:', error);
      throw new Error('컨텍스트 관리자를 초기화하는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 컨텍스트 항목 추가
   */
  public async addContextItem(item: Omit<IContextItem, 'id' | 'timestamp'>): Promise<string> {
    await this.ensureInitialized();

    const contextItem: IContextItem = {
      ...item,
      id: uuidv4(),
      timestamp: Date.now()
    };

    // 단기 메모리에 추가
    this.addToShortTermMemory(contextItem);

    // 장기 메모리(DB)에 저장
    if (this.db) {
      try {
        await this.db.put('contextItems', contextItem);
      } catch (error) {
        console.error('컨텍스트 항목 저장 오류:', error);
        // DB 저장 실패해도 단기 메모리에는 있으므로 ID 반환
      }
    }

    return contextItem.id;
  }

  /**
   * 단기 메모리에 컨텍스트 항목 추가
   */
  private addToShortTermMemory(item: IContextItem): void {
    // 메모리 제한 확인
    if (this.shortTermMemory.size >= this.shortTermMemoryLimit) {
      // 가장 오래된 항목 제거
      let oldestTimestamp = Infinity;
      let oldestId: string | null = null;

      this.shortTermMemory.forEach((contextItem, id) => {
        if (contextItem.timestamp < oldestTimestamp) {
          oldestTimestamp = contextItem.timestamp;
          oldestId = id;
        }
      });

      if (oldestId) {
        this.shortTermMemory.delete(oldestId);
      }
    }

    this.shortTermMemory.set(item.id, item);
  }

  /**
   * 컨텍스트 항목 가져오기
   */
  public async getContextItem(id: string): Promise<IContextItem | null> {
    await this.ensureInitialized();

    // 단기 메모리에서 확인
    if (this.shortTermMemory.has(id)) {
      return this.shortTermMemory.get(id) || null;
    }

    // 장기 메모리(DB)에서 확인
    if (this.db) {
      try {
        const item = await this.db.get('contextItems', id);
        if (item) {
          // 발견한 항목을 단기 메모리에 추가
          this.addToShortTermMemory(item);
          return item;
        }
      } catch (error) {
        console.error('컨텍스트 항목 조회 오류:', error);
      }
    }

    return null;
  }

  /**
   * 유형별 컨텍스트 항목 가져오기
   */
  public async getContextItemsByType(type: string, limit: number = 10): Promise<IContextItem[]> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const index = this.db.transaction('contextItems').store.index('by-type');
        return await index.getAll(type, limit);
      } catch (error) {
        console.error('유형별 컨텍스트 항목 조회 오류:', error);
      }
    }

    return [];
  }

  /**
   * 프로젝트별 컨텍스트 항목 가져오기
   */
  public async getContextItemsByProject(projectId: string, limit: number = 50): Promise<IContextItem[]> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const index = this.db.transaction('contextItems').store.index('by-project');
        return await index.getAll(projectId, limit);
      } catch (error) {
        console.error('프로젝트별 컨텍스트 항목 조회 오류:', error);
      }
    }

    return [];
  }

  /**
   * 태그별 컨텍스트 항목 가져오기
   */
  public async getContextItemsByTag(tag: string, limit: number = 20): Promise<IContextItem[]> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const index = this.db.transaction('contextItems').store.index('by-tags');
        return await index.getAll(IDBKeyRange.only(tag), limit);
      } catch (error) {
        console.error('태그별 컨텍스트 항목 조회 오류:', error);
      }
    }

    return [];
  }

  /**
   * 대화 생성 또는 가져오기
   */
  public async getOrCreateConversation(id?: string, metadata?: Record<string, any>): Promise<string> {
    await this.ensureInitialized();

    const conversationId = id || uuidv4();

    // 이미 캐시에 있는지 확인
    if (!id || !this.conversationCache.has(id)) {
      if (this.db) {
        try {
          // 기존 대화 가져오기
          if (id) {
            const conversation = await this.db.get('conversations', id);
            if (conversation) {
              this.conversationCache.set(id, conversation.messages);
              return id;
            }
          }

          // 새 대화 생성
          const newConversation = {
            id: conversationId,
            messages: [],
            title: metadata?.title || '새 대화',
            projectId: metadata?.projectId,
            metadata: metadata || {},
            lastUpdated: Date.now()
          };

          await this.db.put('conversations', newConversation);
          this.conversationCache.set(conversationId, []);
        } catch (error) {
          console.error('대화 생성 오류:', error);
        }
      } else {
        // DB가 없어도 캐시에 저장
        this.conversationCache.set(conversationId, []);
      }
    }

    return conversationId;
  }

  /**
   * 대화에 메시지 추가
   */
  public async addMessageToConversation(conversationId: string, message: Omit<IContextMessage, 'id' | 'timestamp'>): Promise<string> {
    await this.ensureInitialized();

    // 대화 존재 확인
    if (!this.conversationCache.has(conversationId)) {
      await this.getOrCreateConversation(conversationId);
    }

    const newMessage: IContextMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now()
    };

    // 캐시에 메시지 추가
    const messages = this.conversationCache.get(conversationId) || [];
    messages.push(newMessage);
    this.conversationCache.set(conversationId, messages);

    // DB에 대화 업데이트
    if (this.db) {
      try {
        const conversation = await this.db.get('conversations', conversationId);
        if (conversation) {
          conversation.messages = messages;
          conversation.lastUpdated = Date.now();
          await this.db.put('conversations', conversation);
        }
      } catch (error) {
        console.error('대화 메시지 추가 오류:', error);
      }
    }

    return newMessage.id;
  }

  /**
   * 대화 메시지 가져오기
   */
  public async getConversationMessages(conversationId: string): Promise<IContextMessage[]> {
    await this.ensureInitialized();

    // 캐시에서 확인
    if (this.conversationCache.has(conversationId)) {
      return this.conversationCache.get(conversationId) || [];
    }

    // DB에서 가져오기
    if (this.db) {
      try {
        const conversation = await this.db.get('conversations', conversationId);
        if (conversation) {
          this.conversationCache.set(conversationId, conversation.messages);
          return conversation.messages;
        }
      } catch (error) {
        console.error('대화 메시지 조회 오류:', error);
      }
    }

    return [];
  }

  /**
   * 최근 대화 목록 가져오기
   */
  public async getRecentConversations(limit: number = 10): Promise<Array<{ id: string; title: string; lastUpdated: number }>> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const index = this.db.transaction('conversations').store.index('by-last-updated');
        const conversations = await index.getAll(undefined, limit);

        return conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          lastUpdated: conv.lastUpdated
        }));
      } catch (error) {
        console.error('최근 대화 목록 조회 오류:', error);
      }
    }

    return [];
  }

  /**
   * 검색어와 관련된 컨텍스트 항목 가져오기
   * 실제 구현에서는 벡터 임베딩이나 키워드 매칭을 사용할 수 있음
   */
  public async getRelevantContext(query: string, options: { limit?: number; types?: string[]; projectId?: string } = {}): Promise<IContextItem[]> {
    await this.ensureInitialized();

    const { limit = 5, types, projectId } = options;
    const results: IContextItem[] = [];

    // 단순 구현: 단기 메모리에서 검색
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    // 단기 메모리에서 검색
    this.shortTermMemory.forEach(item => {
      // 유형 필터링
      if (types && !types.includes(item.type)) return;
      
      // 프로젝트 필터링
      if (projectId && item.projectId !== projectId) return;
      
      let relevance = 0;
      const content = JSON.stringify(item.content).toLowerCase();
      
      // 쿼리 용어 일치 여부 확인
      queryTerms.forEach(term => {
        if (content.includes(term)) {
          relevance += 1;
        }
      });
      
      // 태그 일치 확인
      queryTerms.forEach(term => {
        if (item.tags?.some(tag => tag.toLowerCase().includes(term))) {
          relevance += 2; // 태그 일치는 더 높은 관련성 부여
        }
      });
      
      if (relevance > 0) {
        results.push({
          ...item,
          relevance
        });
      }
    });
    
    // DB에서도 추가 검색 (간단한 구현)
    if (this.db) {
      try {
        const allItems = await this.db.getAll('contextItems');
        
        for (const item of allItems) {
          // 이미 결과에 있는지 확인
          if (results.some(r => r.id === item.id)) continue;
          
          // 유형 필터링
          if (types && !types.includes(item.type)) continue;
          
          // 프로젝트 필터링
          if (projectId && item.projectId !== projectId) continue;
          
          let relevance = 0;
          const content = JSON.stringify(item.content).toLowerCase();
          
          // 쿼리 용어 일치 여부 확인
          queryTerms.forEach(term => {
            if (content.includes(term)) {
              relevance += 1;
            }
          });
          
          // 태그 일치 확인
          queryTerms.forEach(term => {
            if (item.tags?.some(tag => tag.toLowerCase().includes(term))) {
              relevance += 2;
            }
          });
          
          if (relevance > 0) {
            // 단기 메모리에 추가
            this.addToShortTermMemory(item);
            
            results.push({
              ...item,
              relevance
            });
          }
        }
      } catch (error) {
        console.error('관련 컨텍스트 검색 오류:', error);
      }
    }
    
    // 관련성 기준으로 정렬하고 제한
    return results
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, limit);
  }

  /**
   * 단기 메모리 정리
   * 특정 시간이 지난 항목 제거
   */
  public cleanupShortTermMemory(): void {
    const now = Date.now();
    const expiryThreshold = now - this.cacheExpiryTime;

    this.shortTermMemory.forEach((item, id) => {
      if (item.timestamp < expiryThreshold) {
        this.shortTermMemory.delete(id);
      }
    });
  }

  /**
   * 초기화 확인
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
} 