import { ProcessingOptions } from '@/lib/processing/lite-options'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import { tmpdir } from 'os'
import { join } from 'path'
import { promises as fs } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import NodeCache from 'node-cache'

export interface MediaConfig {
  maxSize: number
  allowedTypes: string[]
  compressionOptions: {
    quality: number
    format: 'jpeg' | 'webp' | 'png'
  }
  storageOptions: {
    local: boolean
    cloud: boolean
    cacheDuration: number
  }
}

export interface MediaMetadata {
  id: string
  type: string
  size: number
  dimensions?: {
    width: number
    height: number
  }
  duration?: number
  format: string
  createdAt: Date
  modifiedAt: Date
  variants?: {
    original: string
    thumbnail?: string
    preview?: string
    optimized?: string
  }
  tags?: string[]
}

interface ImageProcessingOptions {
  resize?: {
    width?: number
    height?: number
    fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside'
  }
  format?: 'jpeg' | 'webp' | 'png' | 'avif'
  quality?: number
  progressive?: boolean
  withMetadata?: boolean
}

interface VideoProcessingOptions {
  resize?: {
    width?: number
    height?: number
    maintainAspectRatio?: boolean
  }
  format?: 'mp4' | 'webm'
  quality?: 'low' | 'medium' | 'high'
  fps?: number
  audioCodec?: string
  videoCodec?: string
  generatePreview?: boolean
}

export class MediaManager {
  private config: MediaConfig
  private processingOptions: ProcessingOptions
  private mediaCache: NodeCache
  private processingQueue: Map<string, Promise<any>>

  constructor(config: MediaConfig, options: ProcessingOptions) {
    this.config = config
    this.processingOptions = options
    this.mediaCache = new NodeCache({
      stdTTL: config.storageOptions.cacheDuration,
      checkperiod: Math.floor(config.storageOptions.cacheDuration / 10),
      useClones: false
    })
    this.processingQueue = new Map()
  }

  // 이미지 변형 프리셋 정의
  private get imagePresets(): Record<string, ImageProcessingOptions> {
    return {
      thumbnail: {
        resize: { width: 200, height: 200, fit: 'cover' },
        format: 'webp',
        quality: 80,
        progressive: true
      },
      preview: {
        resize: { width: 600, height: 600, fit: 'inside' },
        format: 'webp',
        quality: 85,
        progressive: true,
        withMetadata: true
      },
      optimized: {
        format: 'webp',
        quality: 90,
        progressive: true,
        withMetadata: true
      }
    }
  }

  // 비디오 변형 프리셋 정의
  private get videoPresets(): Record<string, VideoProcessingOptions> {
    return {
      thumbnail: {
        generatePreview: true
      },
      preview: {
        resize: { width: 640, height: 360, maintainAspectRatio: true },
        format: 'mp4',
        quality: 'medium',
        fps: 24
      },
      optimized: {
        format: 'mp4',
        quality: 'high',
        videoCodec: 'libx264',
        audioCodec: 'aac'
      }
    }
  }

  /**
   * 미디어 파일 업로드 및 처리
   */
  async uploadMedia(file: File): Promise<MediaMetadata> {
    if (!this.validateFile(file)) {
      throw new Error(`Invalid file: ${file.name} (${file.type}, ${file.size} bytes)`)
    }

    const fileBuffer = await file.arrayBuffer()
    const fileId = uuidv4()
    
    // 메타데이터 추출
    const metadata = await this.extractMetadata(file)
    metadata.id = fileId
    
    // 작업 등록
    const processingPromise = this.processMedia(fileBuffer, file.type, metadata)
    this.processingQueue.set(fileId, processingPromise)
    
    try {
      const processedMetadata = await processingPromise
      
      if (this.config.storageOptions.local) {
        await this.saveLocally(processedMetadata)
      }
  
      if (this.config.storageOptions.cloud) {
        await this.uploadToCloud(processedMetadata)
      }
      
      // 캐시에 메타데이터 저장
      this.mediaCache.set(fileId, processedMetadata)
      
      return processedMetadata
    } finally {
      // 작업 완료 후 큐에서 제거
      this.processingQueue.delete(fileId)
    }
  }

  /**
   * 미디어 파일 처리 (이미지/비디오 최적화)
   */
  private async processMedia(
    fileBuffer: ArrayBuffer, 
    mimeType: string, 
    metadata: MediaMetadata
  ): Promise<MediaMetadata> {
    const buffer = Buffer.from(fileBuffer)
    const tempDir = join(tmpdir(), `ovis-media-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })
    
    try {
      const variants: MediaMetadata['variants'] = { original: `${metadata.id}.${metadata.format}` }
      
      // 이미지 처리
      if (mimeType.startsWith('image/')) {
        const results = await this.processImage(buffer, metadata, tempDir)
        variants.thumbnail = results.thumbnail
        variants.preview = results.preview
        variants.optimized = results.optimized
      } 
      // 비디오 처리
      else if (mimeType.startsWith('video/')) {
        const results = await this.processVideo(buffer, metadata, tempDir)
        variants.thumbnail = results.thumbnail
        variants.preview = results.preview
        variants.optimized = results.optimized
      }
      
      return {
        ...metadata,
        variants,
        modifiedAt: new Date()
      }
    } finally {
      // 임시 디렉토리 정리
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (err) {
        console.error('Error cleaning up temp directory:', err)
      }
    }
  }

  /**
   * 이미지 최적화 및 변형 생성
   */
  private async processImage(
    buffer: Buffer, 
    metadata: MediaMetadata,
    tempDir: string
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {}
    const { id, format } = metadata

    try {
      // 이미지 처리를 위한 Sharp 인스턴스 생성
      let image = sharp(buffer)
      
      // 이미지 메타데이터 업데이트
      const imageMetadata = await image.metadata()
      if (imageMetadata.width && imageMetadata.height) {
        metadata.dimensions = {
          width: imageMetadata.width,
          height: imageMetadata.height
        }
      }
      
      // 썸네일 생성
      const thumbnailOptions = this.imagePresets.thumbnail
      const thumbnailPath = `${id}-thumbnail.${thumbnailOptions.format || 'webp'}`
      await image
        .clone()
        .resize(thumbnailOptions.resize)
        .toFormat(thumbnailOptions.format || 'webp', { quality: thumbnailOptions.quality })
        .toFile(join(tempDir, thumbnailPath))
      results.thumbnail = thumbnailPath
      
      // 미리보기 생성
      const previewOptions = this.imagePresets.preview
      const previewPath = `${id}-preview.${previewOptions.format || 'webp'}`
      await image
        .clone()
        .resize(previewOptions.resize)
        .toFormat(previewOptions.format || 'webp', { 
          quality: previewOptions.quality,
          progressive: previewOptions.progressive 
        })
        .toFile(join(tempDir, previewPath))
      results.preview = previewPath
      
      // 최적화된 버전 생성
      const optimizedOptions = this.imagePresets.optimized
      const optimizedFormat = optimizedOptions.format || this.config.compressionOptions.format
      const optimizedPath = `${id}-optimized.${optimizedFormat}`
      await image
        .clone()
        .toFormat(optimizedFormat, { 
          quality: optimizedOptions.quality || this.config.compressionOptions.quality,
          progressive: optimizedOptions.progressive 
        })
        .toFile(join(tempDir, optimizedPath))
      results.optimized = optimizedPath
      
      return results
    } catch (error) {
      console.error('Image processing error:', error)
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 비디오 최적화 및 변형 생성
   */
  private async processVideo(
    buffer: Buffer, 
    metadata: MediaMetadata,
    tempDir: string
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {}
    const { id } = metadata
    
    try {
      // 원본 비디오 임시 저장
      const inputPath = join(tempDir, `${id}-input.mp4`)
      await fs.writeFile(inputPath, buffer)
      
      // 썸네일 이미지 생성 (첫 프레임 또는 중간 프레임)
      const thumbnailPath = `${id}-thumbnail.jpg`
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: ['10%'],
            filename: thumbnailPath,
            folder: tempDir,
            size: '200x?'
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
      })
      results.thumbnail = thumbnailPath
      
      // 미리보기 버전 생성 (저해상도, 짧은 구간)
      const previewOptions = this.videoPresets.preview
      const previewPath = `${id}-preview.${previewOptions.format}`
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .output(join(tempDir, previewPath))
          .videoCodec(previewOptions.videoCodec || 'libx264')
          .audioCodec(previewOptions.audioCodec || 'aac')
          .size(previewOptions.resize?.width ? `${previewOptions.resize.width}x?` : null)
          .fps(previewOptions.fps || 24)
          .duration(30) // 30초 미리보기
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      })
      results.preview = previewPath
      
      // 최적화된 버전 생성
      const optimizedOptions = this.videoPresets.optimized
      const optimizedPath = `${id}-optimized.${optimizedOptions.format}`
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .output(join(tempDir, optimizedPath))
          .videoCodec(optimizedOptions.videoCodec || 'libx264')
          .audioCodec(optimizedOptions.audioCodec || 'aac')
          // 적응형 비트레이트 설정
          .addOptions([
            '-profile:v main',
            '-level 3.1',
            '-movflags faststart',
            '-pix_fmt yuv420p',
            '-crf 23'
          ])
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      })
      results.optimized = optimizedPath
      
      // 비디오 메타데이터 업데이트
      const videoInfo = await this.getVideoMetadata(inputPath)
      if (videoInfo) {
        metadata.dimensions = {
          width: videoInfo.width,
          height: videoInfo.height
        }
        metadata.duration = videoInfo.duration
      }
      
      return results
    } catch (error) {
      console.error('Video processing error:', error)
      throw new Error(`Failed to process video: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 비디오 메타데이터 추출
   */
  private getVideoMetadata(filePath: string): Promise<{ width: number, height: number, duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err)
        
        const videoStream = metadata.streams.find(s => s.codec_type === 'video')
        if (!videoStream) return reject(new Error('No video stream found'))
        
        resolve({
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          duration: metadata.format.duration || 0
        })
      })
    })
  }

  /**
   * 파일 유효성 검사
   */
  private validateFile(file: File): boolean {
    return (
      file.size <= this.config.maxSize &&
      this.config.allowedTypes.some(type => {
        // MIME 타입 패턴 매칭 (예: image/* 는 모든 이미지 형식)
        const [category, subtype] = type.split('/')
        const [fileCategory, fileSubtype] = file.type.split('/')
        return (
          category === fileCategory &&
          (subtype === '*' || subtype === fileSubtype)
        )
      })
    )
  }

  /**
   * 메타데이터 추출
   */
  private async extractMetadata(file: File): Promise<MediaMetadata> {
    const now = new Date()
    const metadata: MediaMetadata = {
      id: '',  // 나중에 채워짐
      type: file.type,
      size: file.size,
      format: file.type.split('/')[1],
      createdAt: now,
      modifiedAt: now,
      tags: []
    }

    // 기본 메타데이터 추출
    try {
      if (file.type.startsWith('image/')) {
        const imageBuffer = await file.arrayBuffer()
        const imageInfo = await sharp(Buffer.from(imageBuffer)).metadata()
        
        metadata.dimensions = {
          width: imageInfo.width || 0,
          height: imageInfo.height || 0
        }
      }
    } catch (error) {
      console.warn('Metadata extraction warning:', error)
    }

    return metadata
  }

  /**
   * 로컬 저장소에 저장
   */
  private async saveLocally(metadata: MediaMetadata): Promise<void> {
    // TODO: 변형 파일들을 로컬 저장소에 저장
    console.log('Saving media locally:', metadata.id)
  }

  /**
   * 클라우드 저장소에 업로드
   */
  private async uploadToCloud(metadata: MediaMetadata): Promise<void> {
    // TODO: 변형 파일들을 클라우드 저장소에 업로드
    console.log('Uploading media to cloud:', metadata.id)
  }

  /**
   * 미디어 조회 (캐싱 적용)
   */
  async getMedia(id: string): Promise<MediaMetadata | null> {
    // 캐시에서 먼저 확인
    const cachedItem = this.mediaCache.get<MediaMetadata>(id)
    if (cachedItem) {
      return cachedItem
    }
    
    // 진행 중인 처리 작업 확인
    const pendingProcess = this.processingQueue.get(id)
    if (pendingProcess) {
      return pendingProcess
    }
    
    // TODO: 실제 저장소에서 데이터 조회 구현
    return null
  }

  /**
   * 미디어 파일 삭제
   */
  async deleteMedia(id: string): Promise<void> {
    // 캐시에서 삭제
    this.mediaCache.del(id)
    
    // TODO: 로컬 및 클라우드 저장소에서 삭제 구현
  }

  /**
   * 메타데이터 업데이트
   */
  async updateMetadata(id: string, updates: Partial<MediaMetadata>): Promise<MediaMetadata> {
    const media = await this.getMedia(id)
    if (!media) {
      throw new Error(`Media not found: ${id}`)
    }
    
    // 업데이트 금지 필드
    const { id: _, type: __, size: ___, createdAt: ____, ...allowedUpdates } = updates
    
    const updatedMetadata = {
      ...media,
      ...allowedUpdates,
      modifiedAt: new Date()
    }
    
    // 캐시 업데이트
    this.mediaCache.set(id, updatedMetadata)
    
    // TODO: 저장소 업데이트 구현
    
    return updatedMetadata
  }

  /**
   * 적응형 스트리밍을 위한 매니페스트 생성
   */
  async createStreamingManifest(id: string): Promise<string> {
    const media = await this.getMedia(id)
    if (!media || !media.type.startsWith('video/')) {
      throw new Error(`Video not found or invalid media type: ${id}`)
    }
    
    // TODO: HLS 또는 DASH 매니페스트 생성 구현
    return `manifest_${id}.m3u8`
  }
  
  /**
   * 캐시 정리
   */
  clearCache(): void {
    this.mediaCache.flushAll()
  }
} 