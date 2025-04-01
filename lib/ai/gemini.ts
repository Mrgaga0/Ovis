import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set')
}

if (!process.env.GEMINI_MODEL) {
  throw new Error('GEMINI_MODEL is not set')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL })

export async function generateContent(prompt: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Error generating content:', error)
    throw error
  }
}

export async function analyzeContent(content: string): Promise<any> {
  try {
    const prompt = `Analyze the following content and provide structured information:
    ${content}
    
    Please provide:
    1. Main topics
    2. Key entities
    3. Sentiment analysis
    4. Content quality assessment
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    return JSON.parse(response.text())
  } catch (error) {
    console.error('Error analyzing content:', error)
    throw error
  }
}

export async function extractEntities(text: string): Promise<any[]> {
  try {
    const prompt = `Extract entities from the following text:
    ${text}
    
    Please provide a list of entities with their types and attributes.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return JSON.parse(response.text())
  } catch (error) {
    console.error('Error extracting entities:', error)
    throw error
  }
}

export async function identifyConcepts(text: string): Promise<any[]> {
  try {
    const prompt = `Identify main concepts from the following text:
    ${text}
    
    Please provide a list of concepts with their descriptions and relevance scores.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return JSON.parse(response.text())
  } catch (error) {
    console.error('Error identifying concepts:', error)
    throw error
  }
} 