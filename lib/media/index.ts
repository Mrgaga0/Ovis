import { openDB, IDBPDatabase } from 'idb'

interface MediaItem {
  id: string
  type: 'image' | 'video' | 'document'
  file: Blob
  thumbnail?: Blob
  metadata: {
    name: string
    size: number
    mimeType: string
    width?: number
    height?: number
    duration?: number
  }
  timestamp: Date
  status: 'pending' | 'uploaded' | 'failed'
  variants?: {
    original: string
    thumbnail?: string
    preview?: string
    optimized?: string
  }
  cacheKey?: string
}

interface MediaOptions {
  maxFileSize?: number
  allowedTypes?: string[]
  generateThumbnails?: boolean
  compressionQuality?: number
  cacheTTL?: number
  parallelProcessing?: number
  adaptiveStreaming?: boolean
  lazyLoading?: boolean
}

// 메모리 캐시 관리
class MemoryCache<T> {
  private cache: Map<string, { data: T, expires: number }> = new Map()
  private maxSize: number
  private defaultTTL: number

  constructor(maxSize = 100, defaultTTL = 300000) { // 기본 5분
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
    // 주기적으로 캐시 정리
    setInterval(() => this.cleanup(), 60000) // 1분마다 정리
  }

  set(key: string, data: T, ttl = this.defaultTTL): void {
    // 캐시가 꽉 찼으면 가장 오래된 항목 제거
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestKey()
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    })
  }

  get<R = T>(key: string): R | null {
    const item = this.cache.get(key)
    if (!item) return null

    // 만료되었으면 제거하고 null 반환
    if (item.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }

    return item.data as unknown as R
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    if (item.expires < Date.now()) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (item.expires < now) {
        this.cache.delete(key)
      }
    }
  }

  private findOldestKey(): string | undefined {
    let oldestKey: string | undefined
    let oldestTime = Infinity

    for (const [key, item] of this.cache.entries()) {
      if (item.expires < oldestTime) {
        oldestTime = item.expires
        oldestKey = key
      }
    }

    return oldestKey
  }
}

// 작업 스케줄러 - 동시 실행 작업 수 제한
class TaskScheduler {
  private queue: Array<() => Promise<void>> = []
  private running: number = 0
  private maxConcurrent: number

  constructor(maxConcurrent = 4) {
    this.maxConcurrent = maxConcurrent
  }

  enqueue(task: () => Promise<void>): void {
    this.queue.push(task)
    this.processNext()
  }

  private async processNext(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    this.running++
    const task = this.queue.shift()!

    try {
      await task()
    } catch (error) {
      console.error('Task error:', error)
    } finally {
      this.running--
      this.processNext()
    }
  }

  get pendingCount(): number {
    return this.queue.length
  }

  get activeCount(): number {
    return this.running
  }
}

class MediaManager {
  private db: IDBPDatabase | null = null
  private options: Required<MediaOptions>
  private memoryCache: MemoryCache<MediaItem>
  private taskScheduler: TaskScheduler
  private urlCache: Map<string, string> = new Map()

  constructor(options: MediaOptions = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      allowedTypes: options.allowedTypes || ['image/*', 'video/*', 'application/pdf'],
      generateThumbnails: options.generateThumbnails ?? true,
      compressionQuality: options.compressionQuality || 0.8,
      cacheTTL: options.cacheTTL || 300000, // 5분
      parallelProcessing: options.parallelProcessing || 2,
      adaptiveStreaming: options.adaptiveStreaming ?? true,
      lazyLoading: options.lazyLoading ?? true
    }

    this.memoryCache = new MemoryCache<MediaItem>(50, this.options.cacheTTL)
    this.taskScheduler = new TaskScheduler(this.options.parallelProcessing)

    // 브라우저 메모리 압박 감지
    if (typeof window !== 'undefined' && 'performance' in window) {
      const memoryInfo = (performance as any).memory
      if (memoryInfo) {
        setInterval(() => this.monitorMemoryUsage(memoryInfo), 10000)
      }
    }
  }

  // DB 초기화
  async init() {
    if (this.db) return this.db

    this.db = await openDB('ovis-media', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('media-items')) {
          db.createObjectStore('media-items', { keyPath: 'id' })
        }
      },
    })

    return this.db
  }

  // 미디어 파일 저장
  async saveMedia(file: File): Promise<string> {
    if (!this.db) await this.init()

    // 파일 유효성 검사
    if (!this.validateFile(file)) {
      throw new Error('Invalid file')
    }

    const id = crypto.randomUUID()
    const item: MediaItem = {
      id,
      type: this.getMediaType(file.type),
      file: file,
      metadata: {
        name: file.name,
        size: file.size,
        mimeType: file.type
      },
      timestamp: new Date(),
      status: 'pending'
    }

    // 작업 스케줄링
    await new Promise<void>((resolve) => {
      this.taskScheduler.enqueue(async () => {
        try {
          // 이미지나 비디오인 경우 메타데이터 추가
          if (item.type === 'image' || item.type === 'video') {
            const metadata = await this.getMediaMetadata(file)
            item.metadata = { ...item.metadata, ...metadata }
          }

          // 썸네일 생성
          if (this.options.generateThumbnails && (item.type === 'image' || item.type === 'video')) {
            item.thumbnail = await this.generateThumbnail(file)
          }

          // 압축
          if (item.type === 'image') {
            item.file = await this.compressImage(file)
          } else if (item.type === 'video' && this.options.adaptiveStreaming) {
            // 비디오 포맷에 따라 최적화 오버헤드가 크면 별도 버전 생성
            item.variants = {
              original: URL.createObjectURL(file)
            }
          }

          // DB에 저장
          await this.db!.add('media-items', item)
          
          // 메모리 캐시에 추가
          this.memoryCache.set(id, item)
          
          // 업로드 처리
          this.uploadMedia(id).catch(console.error)
          
          resolve()
        } catch (error) {
          console.error('Media processing error:', error)
          resolve()
        }
      })
    })

    return id
  }

  // 미디어 파일 업로드
  private async uploadMedia(id: string) {
    if (!this.db) await this.init()

    // 메모리 캐시 확인
    let item = this.memoryCache.get<MediaItem>(id)
    
    if (!item) {
      // DB에서 가져오기
      item = await this.db!.get('media-items', id)
      if (!item) return
    }

    try {
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('metadata', JSON.stringify(item.metadata))

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      item.status = 'uploaded'
      
      // DB 및 캐시 업데이트
      await this.db!.put('media-items', item)
      this.memoryCache.set(id, item)
      
      // 업로드 완료 후 Blob URL 최적화
      if (item.variants?.original && item.variants.original.startsWith('blob:')) {
        URL.revokeObjectURL(item.variants.original)
        item.variants.original = `/api/media/${id}/original`
      }
    } catch (error) {
      item.status = 'failed'
      await this.db!.put('media-items', item)
      this.memoryCache.set(id, item)
      throw error
    }
  }

  // 파일 유효성 검사
  private validateFile(file: File): boolean {
    if (file.size > this.options.maxFileSize) return false
    return this.options.allowedTypes.some(type => {
      const [category, subtype] = type.split('/')
      const [fileCategory, fileSubtype] = file.type.split('/')
      return category === fileCategory && (subtype === '*' || subtype === fileSubtype)
    })
  }

  // 미디어 타입 결정
  private getMediaType(mimeType: string): MediaItem['type'] {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    return 'document'
  }

  // 미디어 메타데이터 추출
  private async getMediaMetadata(file: File): Promise<{ width?: number, height?: number, duration?: number }> {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const img = new Image()
        
        // 메모리 누수 방지를 위한 타임아웃
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(img.src)
          reject(new Error('Image metadata extraction timeout'))
        }, 10000)
        
        img.onload = () => {
          clearTimeout(timeout)
          const result = { width: img.width, height: img.height }
          URL.revokeObjectURL(img.src)
          resolve(result)
        }
        
        img.onerror = (err) => {
          clearTimeout(timeout)
          URL.revokeObjectURL(img.src)
          reject(err)
        }
        
        img.src = URL.createObjectURL(file)
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        
        // 메모리 누수 방지를 위한 타임아웃
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(video.src)
          reject(new Error('Video metadata extraction timeout'))
        }, 20000)
        
        video.onloadedmetadata = () => {
          clearTimeout(timeout)
          const result = {
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration
          }
          URL.revokeObjectURL(video.src)
          resolve(result)
        }
        
        video.onerror = (err) => {
          clearTimeout(timeout)
          URL.revokeObjectURL(video.src)
          reject(err)
        }
        
        video.src = URL.createObjectURL(file)
        video.load() // 명시적 로딩 시작
      } else {
        resolve({})
      }
    })
  }

  // 썸네일 생성
  private async generateThumbnail(file: File): Promise<Blob> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context not available')

    if (file.type.startsWith('image/')) {
      // 이미지 썸네일 생성 처리
      let img: ImageBitmap | null = null
      try {
        img = await createImageBitmap(file)
        canvas.width = 200
        canvas.height = (img.height / img.width) * 200
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      } finally {
        // 메모리 정리
        if (img) img.close()
      }
    } else if (file.type.startsWith('video/')) {
      // 비디오 썸네일 생성 처리
      const video = document.createElement('video')
      const objUrl = URL.createObjectURL(file)
      
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video thumbnail generation timeout'))
          }, 20000)
          
          video.onloadeddata = () => {
            clearTimeout(timeout)
            resolve(null)
          }
          
          video.onerror = (err) => {
            clearTimeout(timeout)
            reject(err)
          }
          
          video.src = objUrl
          video.load() // 명시적 로딩 시작
        })
        
        // 비디오의 1초 지점 프레임 사용
        video.currentTime = 1
        await new Promise(resolve => setTimeout(resolve, 100)) // 프레임 업데이트 대기
        
        canvas.width = 200
        canvas.height = (video.videoHeight / video.videoWidth) * 200
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      } finally {
        URL.revokeObjectURL(objUrl)
        video.src = '' // 비디오 리소스 해제
      }
    }

    // 최적화된 썸네일 생성
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        // 메모리 정리
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
        resolve(blob!)
      }, 'image/jpeg', 0.7)
    })
  }

  // 이미지 압축
  private async compressImage(file: File): Promise<Blob> {
    let img: ImageBitmap | null = null
    
    try {
      img = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')

      // 이미지 크기 제한 (메모리 사용량 관리)
      const MAX_DIMENSION = 3000
      let width = img.width
      let height = img.height
      
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width / height) * MAX_DIMENSION)
          height = MAX_DIMENSION
        }
      }
      
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      return new Promise(resolve => {
        canvas.toBlob(
          blob => {
            // 메모리 정리
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            resolve(blob!)
          },
          'image/webp', // WebP 사용 (더 좋은 압축률)
          this.options.compressionQuality
        )
      })
    } finally {
      // 메모리 정리
      if (img) img.close()
    }
  }

  // 미디어 파일 가져오기 (성능 최적화)
  async getMedia(id: string): Promise<MediaItem | undefined> {
    // 메모리 캐시 확인
    const cachedItem = this.memoryCache.get<MediaItem>(id)
    if (cachedItem) return cachedItem

    // DB에서 가져오기
    if (!this.db) await this.init()
    const item = await this.db!.get('media-items', id)
    
    if (item) {
      // 캐시에 추가
      this.memoryCache.set(id, item)
    }
    
    return item
  }
  
  // 미디어 URL 가져오기 (성능 최적화)
  async getMediaUrl(id: string, variant: 'original' | 'thumbnail' | 'preview' | 'optimized' = 'optimized'): Promise<string | null> {
    // URL 캐시 확인
    const cacheKey = `${id}:${variant}`
    if (this.urlCache.has(cacheKey)) {
      return this.urlCache.get(cacheKey) || null
    }
    
    const item = await this.getMedia(id)
    if (!item) return null
    
    let url: string | null = null
    
    // 변형 파일 경로 있는 경우
    if (item.variants && item.variants[variant]) {
      url = item.variants[variant]
    } 
    // Blob 직접 사용 (메모리에 있는 경우)
    else if (item.file) {
      url = URL.createObjectURL(item.file)
      
      // 메모리 관리를 위해 자동 해제 설정
      setTimeout(() => {
        URL.revokeObjectURL(url!)
        this.urlCache.delete(cacheKey)
      }, this.options.cacheTTL)
    }
    // 서버 경로 사용
    else if (item.status === 'uploaded') {
      url = `/api/media/${id}/${variant}`
    }
    
    if (url) {
      this.urlCache.set(cacheKey, url)
    }
    
    return url
  }

  // 모든 미디어 파일 가져오기 (페이지네이션 지원)
  async getAllMedia(options: { offset?: number, limit?: number, type?: MediaItem['type'] } = {}): Promise<MediaItem[]> {
    if (!this.db) await this.init()
    
    const { offset = 0, limit = 50, type } = options
    
    // DB에서 모든 항목 가져오기
    let items = await this.db!.getAll('media-items')
    
    // 타입 필터링
    if (type) {
      items = items.filter(item => item.type === type)
    }
    
    // 최신순 정렬
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    // 페이지네이션 적용
    items = items.slice(offset, offset + limit)
    
    // 메모리 캐시에 추가
    for (const item of items) {
      this.memoryCache.set(item.id, item)
    }
    
    return items
  }

  // 미디어 파일 삭제
  async deleteMedia(id: string): Promise<void> {
    if (!this.db) await this.init()
    
    // 메모리 캐시에서 삭제
    this.memoryCache.delete(id)
    
    // URL 캐시에서 관련 항목 삭제
    for (const key of this.urlCache.keys()) {
      if (key.startsWith(`${id}:`)) {
        const url = this.urlCache.get(key)
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
        this.urlCache.delete(key)
      }
    }
    
    // DB에서 삭제
    await this.db!.delete('media-items', id)
    
    // 서버 API 호출
    try {
      await fetch(`/api/media/${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Failed to delete media from server:', error)
    }
  }

  // 실패한 업로드 재시도
  async retryFailedUploads(): Promise<void> {
    if (!this.db) await this.init()

    const tx = this.db!.transaction('media-items', 'readonly')
    const store = tx.objectStore('media-items')
    const items = await store.getAll()

    const failedItems = items.filter(item => item.status === 'failed')
    
    // 재시도 작업을 스케줄러에 등록
    failedItems.forEach(item => {
      this.taskScheduler.enqueue(async () => {
        try {
          await this.uploadMedia(item.id)
        } catch (error) {
          console.error(`Failed to retry upload for ${item.id}:`, error)
        }
      })
    })
  }
  
  // 메모리 사용량 모니터링 및 관리
  private monitorMemoryUsage(memoryInfo: any): void {
    // 메모리 사용률 계산
    const usedJSHeapSize = memoryInfo.usedJSHeapSize
    const jsHeapSizeLimit = memoryInfo.jsHeapSizeLimit
    const memoryUsage = usedJSHeapSize / jsHeapSizeLimit
    
    // 메모리 압박 감지 (90% 이상 사용 중)
    if (memoryUsage > 0.9) {
      // 메모리 캐시 정리
      this.memoryCache.clear()
      
      // Blob URL 해제
      for (const [key, url] of this.urlCache.entries()) {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      }
      this.urlCache.clear()
      
      console.warn('Memory pressure detected, cache cleared')
    }
  }
  
  // 비디오 스트리밍 최적화를 위한 HLS URL 생성
  async getHlsStreamUrl(id: string): Promise<string | null> {
    const item = await this.getMedia(id)
    if (!item || item.type !== 'video') return null
    
    // 이미 업로드된 경우 서버의 HLS 스트림 URL 반환
    if (item.status === 'uploaded') {
      return `/api/media/${id}/stream/main.m3u8`
    }
    
    return null
  }
  
  // 백그라운드 작업 큐 상태 확인
  getQueueStatus(): { pending: number, active: number } {
    return {
      pending: this.taskScheduler.pendingCount,
      active: this.taskScheduler.activeCount
    }
  }
  
  // 리소스 정리
  cleanup(): void {
    // 메모리 캐시 정리
    this.memoryCache.clear()
    
    // URL 캐시 정리
    for (const url of this.urlCache.values()) {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    }
    this.urlCache.clear()
  }
}

// 싱글톤 인스턴스 생성
const mediaManager = new MediaManager()

export { mediaManager, type MediaItem, type MediaOptions } 