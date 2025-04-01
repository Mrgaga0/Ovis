import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadata = JSON.parse(formData.get('metadata') as string)

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    // 파일 저장 경로 설정
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const path = join(process.cwd(), 'public/uploads', file.name)

    // 파일 저장
    await writeFile(path, buffer)

    // 데이터베이스에 메타데이터 저장
    const media = await prisma.media.create({
      data: {
        name: metadata.name,
        size: metadata.size,
        mimeType: metadata.mimeType,
        path: `/uploads/${file.name}`,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration
      }
    })

    return NextResponse.json(media)
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: '업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 