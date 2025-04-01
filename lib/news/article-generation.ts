import { OpenAI } from "openai"
import { prisma } from "@/lib/prisma"

interface ArticleTemplate {
  id: string
  name: string
  structure: {
    sections: Array<{
      name: string
      type: "text" | "quote" | "list" | "image"
      required: boolean
      maxLength?: number
    }>
  }
  style: {
    tone: "formal" | "casual" | "technical"
    language: "ko" | "en"
    targetAudience: string
  }
}

interface GeneratedArticle {
  id: string
  topicId: string
  templateId: string
  title: string
  content: string
  sections: Array<{
    name: string
    content: string
    type: string
  }>
  metadata: {
    keywords: string[]
    readingTime: number
    wordCount: number
  }
  status: "draft" | "review" | "published"
}

export class ArticleGenerationSystem {
  private openai: OpenAI
  private templates: ArticleTemplate[]

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.templates = []
  }

  async initialize() {
    // 템플릿 로드
    this.templates = await prisma.articleTemplate.findMany()
  }

  async generateArticle(
    topicId: string,
    templateId: string
  ): Promise<GeneratedArticle> {
    // 1. 토픽 정보 조회
    const topic = await prisma.topic.findUnique({
      where: { id: topicId }
    })

    if (!topic) {
      throw new Error("토픽을 찾을 수 없습니다.")
    }

    // 2. 템플릿 조회
    const template = this.templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error("템플릿을 찾을 수 없습니다.")
    }

    // 3. 기사 생성
    const article = await this.generateContent(topic, template)

    // 4. 데이터베이스에 저장
    return this.saveArticle(article)
  }

  private async generateContent(
    topic: any,
    template: ArticleTemplate
  ): Promise<Omit<GeneratedArticle, "id">> {
    const prompt = `
      다음 토픽에 대한 기사를 생성하세요:
      제목: ${topic.title}
      설명: ${topic.description}
      키워드: ${topic.keywords.join(", ")}

      템플릿 구조:
      ${JSON.stringify(template.structure, null, 2)}

      스타일:
      ${JSON.stringify(template.style, null, 2)}

      각 섹션에 대해 적절한 내용을 생성하고, 다음 형식으로 응답하세요:
      {
        "title": "기사 제목",
        "sections": [
          {
            "name": "섹션 이름",
            "content": "섹션 내용",
            "type": "섹션 타입"
          }
        ],
        "metadata": {
          "keywords": ["키워드1", "키워드2"],
          "readingTime": 읽기 시간(분),
          "wordCount": 단어 수
        }
      }
    `

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "당신은 전문적인 뉴스 기사 작성자입니다."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })

    const generatedContent = JSON.parse(
      response.choices[0].message.content || "{}"
    )

    return {
      topicId: topic.id,
      templateId: template.id,
      title: generatedContent.title,
      content: this.combineSections(generatedContent.sections),
      sections: generatedContent.sections,
      metadata: generatedContent.metadata,
      status: "draft"
    }
  }

  private combineSections(sections: Array<{ content: string }>): string {
    return sections.map(section => section.content).join("\n\n")
  }

  private async saveArticle(
    article: Omit<GeneratedArticle, "id">
  ): Promise<GeneratedArticle> {
    return prisma.article.create({
      data: article
    })
  }

  async updateArticle(
    id: string,
    updates: Partial<GeneratedArticle>
  ): Promise<GeneratedArticle> {
    return prisma.article.update({
      where: { id },
      data: updates
    })
  }

  async addTemplate(template: Omit<ArticleTemplate, "id">): Promise<ArticleTemplate> {
    const newTemplate = await prisma.articleTemplate.create({
      data: template
    })
    this.templates.push(newTemplate)
    return newTemplate
  }

  async updateTemplate(
    id: string,
    updates: Partial<ArticleTemplate>
  ): Promise<ArticleTemplate> {
    const updatedTemplate = await prisma.articleTemplate.update({
      where: { id },
      data: updates
    })
    const index = this.templates.findIndex(t => t.id === id)
    if (index !== -1) {
      this.templates[index] = updatedTemplate
    }
    return updatedTemplate
  }
} 