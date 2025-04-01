import { prisma } from "@/lib/prisma"
import axios from "axios"
import { RSSParser, RSSFeed, RSSItem } from "./rss-parser"

// 일시적인 메모리 저장소 (실제로는 DB 사용)
const dataSources: DataSource[] = [];

interface DataSource {
  id: string
  name: string
  type: "news_api" | "rss" | "social_media" | "custom"
  url: string
  apiKey?: string
  config: Record<string, any>
  lastFetch: Date
  status: "active" | "inactive" | "error"
}

interface CollectedData {
  id: string
  sourceId: string
  title: string
  content: string
  url: string
  publishedAt: Date
  metadata: {
    author?: string
    category?: string
    tags?: string[]
    sentiment?: number
    language?: string
  }
  rawData: any
  createdAt: Date
  updatedAt: Date
}

export class DataCollectionPipeline {
  private sources: DataSource[]
  private rssParser: RSSParser

  constructor() {
    this.sources = []
    this.rssParser = new RSSParser()
  }

  async initialize() {
    // 데이터베이스에서 데이터 소스를 가져오는 로직
    // 임시로 메모리 저장소 사용
    this.sources = dataSources.filter(source => source.status === "active");
    
    // 실제 데이터베이스 구현 시 아래 코드 사용
    // this.sources = await prisma.dataSource.findMany({
    //   where: { status: "active" }
    // })
  }

  async collectData(): Promise<CollectedData[]> {
    const results: CollectedData[] = []

    // 각 소스별로 데이터 수집
    for (const source of this.sources) {
      try {
        const data = await this.collectFromSource(source)
        results.push(...data)
      } catch (error) {
        console.error(`데이터 수집 실패 (${source.name}):`, error)
        await this.updateSourceStatus(source.id, "error")
      }
    }

    // 데이터 전처리 및 저장
    const processedData = await this.preprocessData(results)
    return this.saveData(processedData)
  }

  private async collectFromSource(source: DataSource): Promise<CollectedData[]> {
    switch (source.type) {
      case "news_api":
        return this.collectFromNewsAPI(source)
      case "rss":
        return this.collectFromRSS(source)
      case "social_media":
        return this.collectFromSocialMedia(source)
      case "custom":
        return this.collectFromCustom(source)
      default:
        throw new Error(`지원하지 않는 소스 타입: ${source.type}`)
    }
  }

  private async collectFromNewsAPI(source: DataSource): Promise<CollectedData[]> {
    const response = await axios.get(source.url, {
      headers: {
        Authorization: `Bearer ${source.apiKey}`
      }
    })

    return response.data.articles.map((article: any) => ({
      sourceId: source.id,
      title: article.title,
      content: article.content,
      url: article.url,
      publishedAt: new Date(article.publishedAt),
      metadata: {
        author: article.author,
        category: article.category,
        tags: article.tags,
        sentiment: article.sentiment,
        language: article.language
      },
      rawData: article,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  }

  private async collectFromRSS(source: DataSource): Promise<CollectedData[]> {
    try {
      // 개선된 RSS 파서 사용
      const feed = await this.rssParser.fetchAndParse(source.url)
      
      // RSS 아이템을 CollectedData 형식으로 변환
      return feed.items.map(item => this.convertRssItemToCollectedData(item, source.id))
    } catch (error) {
      console.error(`RSS 피드 수집 오류 (${source.url}):`, error)
      throw error
    }
  }

  private convertRssItemToCollectedData(item: RSSItem, sourceId: string): CollectedData {
    return {
      id: item.id,
      sourceId,
      title: item.title,
      content: item.content || item.description,
      url: item.link,
      publishedAt: item.pubDate,
      metadata: {
        author: item.creator,
        category: item.categories[0],
        tags: item.categories,
        language: 'auto-detect' // 언어 자동 감지 표시
      },
      rawData: item,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private async collectFromSocialMedia(source: DataSource): Promise<CollectedData[]> {
    // TODO: 소셜 미디어 API 연동 구현
    return []
  }

  private async collectFromCustom(source: DataSource): Promise<CollectedData[]> {
    const response = await axios.get(source.url, {
      headers: source.config.headers
    })

    return response.data.map((item: any) => ({
      sourceId: source.id,
      title: item.title,
      content: item.content,
      url: item.url,
      publishedAt: new Date(item.publishedAt),
      metadata: {
        author: item.author,
        category: item.category,
        tags: item.tags,
        sentiment: item.sentiment,
        language: item.language
      },
      rawData: item,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  }

  private async preprocessData(data: CollectedData[]): Promise<CollectedData[]> {
    // 1. 중복 제거
    const uniqueData = this.removeDuplicates(data)

    // 2. 텍스트 정규화
    const normalizedData = uniqueData.map(item => ({
      ...item,
      title: this.normalizeText(item.title),
      content: this.normalizeText(item.content)
    }))

    // 3. 메타데이터 보강
    return normalizedData.map(item => ({
      ...item,
      metadata: {
        ...item.metadata,
        sentiment: item.metadata.sentiment ?? this.analyzeSentiment(item.content),
        language: item.metadata.language === 'auto-detect' ? this.detectLanguage(item.content) : item.metadata.language
      }
    }))
  }

  private removeDuplicates(data: CollectedData[]): CollectedData[] {
    const seen = new Set<string>()
    return data.filter(item => {
      const key = `${item.title}-${item.url}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private normalizeText(text: string): string {
    if (!text) return ''
    return text
      .replace(/\s+/g, " ")
      .replace(/[^\w\s.,!?-]/g, "")
      .trim()
  }

  private analyzeSentiment(text: string): number {
    // TODO: 감정 분석 구현
    return 0
  }

  private detectLanguage(text: string): string {
    // TODO: 언어 감지 구현
    return "ko"
  }

  private async saveData(data: CollectedData[]): Promise<CollectedData[]> {
    // 실제 구현에서는 이 부분을 데이터베이스 저장 로직으로 대체
    // 지금은 로그만 남기고 데이터 반환
    console.log(`${data.length}개의 데이터 항목 저장 완료`)
    return data
  }

  private async updateSourceStatus(
    sourceId: string,
    status: "active" | "inactive" | "error"
  ): Promise<void> {
    // 메모리 저장소에서 소스 상태 업데이트
    const sourceIndex = dataSources.findIndex(s => s.id === sourceId);
    if (sourceIndex >= 0) {
      dataSources[sourceIndex].status = status;
    }
    
    // 실제 데이터베이스 구현 시 아래 코드 사용
    // await prisma.dataSource.update({
    //   where: { id: sourceId },
    //   data: { status }
    // })
  }

  async addSource(source: Omit<DataSource, "id">): Promise<DataSource> {
    // 임시 ID 생성 및 메모리 저장소에 추가
    const newSource = {
      ...source,
      id: Math.random().toString(36).substring(2, 9)
    } as DataSource;
    
    dataSources.push(newSource);
    this.sources.push(newSource);
    
    // 실제 데이터베이스 구현 시 아래 코드 사용
    // const newSource = await prisma.dataSource.create({
    //   data: source
    // })
    // this.sources.push(newSource)
    
    return newSource;
  }

  async updateSource(
    id: string,
    updates: Partial<DataSource>
  ): Promise<DataSource> {
    // 메모리 저장소에서 소스 업데이트
    const sourceIndex = dataSources.findIndex(s => s.id === id);
    if (sourceIndex >= 0) {
      dataSources[sourceIndex] = { ...dataSources[sourceIndex], ...updates };
      
      // 메모리 내 소스 목록 업데이트
      const index = this.sources.findIndex(source => source.id === id);
      if (index !== -1) {
        this.sources[index] = dataSources[sourceIndex];
      }
      
      return dataSources[sourceIndex];
    }
    
    throw new Error(`소스를 찾을 수 없음: ${id}`);
    
    // 실제 데이터베이스 구현 시 아래 코드 사용
    // const updatedSource = await prisma.dataSource.update({
    //   where: { id },
    //   data: updates
    // })
    // 
    // // 메모리 내 소스 목록 업데이트
    // const index = this.sources.findIndex(source => source.id === id)
    // if (index !== -1) {
    //   this.sources[index] = updatedSource
    // }
    // 
    // return updatedSource
  }

  async removeSource(id: string): Promise<void> {
    await prisma.dataSource.delete({
      where: { id }
    })
    this.sources = this.sources.filter(s => s.id !== id)
  }
} 