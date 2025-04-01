import { prisma } from "@/lib/prisma"
import axios from "axios"

interface PublishingPlatform {
  id: string
  name: string
  type: "wordpress" | "medium" | "custom"
  config: {
    apiUrl: string
    apiKey?: string
    username?: string
    password?: string
  }
}

interface PublishSchedule {
  id: string
  articleId: string
  platformId: string
  scheduledAt: Date
  status: "pending" | "published" | "failed"
  error?: string
}

export class PublishingPipeline {
  private platforms: PublishingPlatform[]

  constructor() {
    this.platforms = []
  }

  async initialize() {
    // 플랫폼 목록 로드
    this.platforms = await prisma.publishingPlatform.findMany()
  }

  async publishArticle(
    articleId: string,
    platformId: string,
    scheduledAt?: Date
  ): Promise<PublishSchedule> {
    // 1. 기사 정보 조회
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    })

    if (!article) {
      throw new Error("기사를 찾을 수 없습니다.")
    }

    // 2. 플랫폼 정보 조회
    const platform = this.platforms.find(p => p.id === platformId)
    if (!platform) {
      throw new Error("플랫폼을 찾을 수 없습니다.")
    }

    // 3. 퍼블리싱 스케줄 생성
    const schedule = await prisma.publishSchedule.create({
      data: {
        articleId,
        platformId,
        scheduledAt: scheduledAt || new Date(),
        status: "pending"
      }
    })

    // 4. 즉시 발행인 경우 실행
    if (!scheduledAt || scheduledAt <= new Date()) {
      await this.executePublishing(schedule)
    }

    return schedule
  }

  private async executePublishing(schedule: PublishSchedule) {
    try {
      const article = await prisma.article.findUnique({
        where: { id: schedule.articleId }
      })

      if (!article) {
        throw new Error("기사를 찾을 수 없습니다.")
      }

      const platform = this.platforms.find(p => p.id === schedule.platformId)
      if (!platform) {
        throw new Error("플랫폼을 찾을 수 없습니다.")
      }

      // 플랫폼별 퍼블리싱 로직 실행
      await this.publishToPlatform(article, platform)

      // 스케줄 상태 업데이트
      await prisma.publishSchedule.update({
        where: { id: schedule.id },
        data: { status: "published" }
      })

      // 기사 상태 업데이트
      await prisma.article.update({
        where: { id: article.id },
        data: { status: "published" }
      })
    } catch (error) {
      // 에러 처리
      await prisma.publishSchedule.update({
        where: { id: schedule.id },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "알 수 없는 오류"
        }
      })
    }
  }

  private async publishToPlatform(
    article: any,
    platform: PublishingPlatform
  ): Promise<void> {
    switch (platform.type) {
      case "wordpress":
        await this.publishToWordPress(article, platform)
        break
      case "medium":
        await this.publishToMedium(article, platform)
        break
      case "custom":
        await this.publishToCustom(article, platform)
        break
      default:
        throw new Error(`지원하지 않는 플랫폼 타입: ${platform.type}`)
    }
  }

  private async publishToWordPress(
    article: any,
    platform: PublishingPlatform
  ): Promise<void> {
    const response = await axios.post(
      `${platform.config.apiUrl}/wp-json/wp/v2/posts`,
      {
        title: article.title,
        content: article.content,
        status: "publish"
      },
      {
        headers: {
          Authorization: `Bearer ${platform.config.apiKey}`
        }
      }
    )

    if (response.status !== 201) {
      throw new Error("WordPress 발행 실패")
    }
  }

  private async publishToMedium(
    article: any,
    platform: PublishingPlatform
  ): Promise<void> {
    // TODO: Medium API 연동 구현
  }

  private async publishToCustom(
    article: any,
    platform: PublishingPlatform
  ): Promise<void> {
    const response = await axios.post(
      platform.config.apiUrl,
      {
        title: article.title,
        content: article.content,
        metadata: article.metadata
      },
      {
        headers: {
          Authorization: `Bearer ${platform.config.apiKey}`
        }
      }
    )

    if (response.status !== 200) {
      throw new Error("커스텀 플랫폼 발행 실패")
    }
  }

  async addPlatform(platform: Omit<PublishingPlatform, "id">): Promise<PublishingPlatform> {
    const newPlatform = await prisma.publishingPlatform.create({
      data: platform
    })
    this.platforms.push(newPlatform)
    return newPlatform
  }

  async updatePlatform(
    id: string,
    updates: Partial<PublishingPlatform>
  ): Promise<PublishingPlatform> {
    const updatedPlatform = await prisma.publishingPlatform.update({
      where: { id },
      data: updates
    })
    const index = this.platforms.findIndex(p => p.id === id)
    if (index !== -1) {
      this.platforms[index] = updatedPlatform
    }
    return updatedPlatform
  }

  async removePlatform(id: string): Promise<void> {
    await prisma.publishingPlatform.delete({
      where: { id }
    })
    this.platforms = this.platforms.filter(p => p.id !== id)
  }
} 