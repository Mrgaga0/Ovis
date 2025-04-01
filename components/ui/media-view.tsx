'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { mediaManager } from '@/lib/media'
import type { MediaItem } from '@/lib/media'

interface MediaViewProps {
  id: string
  width?: number
  height?: number
  className?: string
}

export function MediaView({ id, width, height, className }: MediaViewProps) {
  const [media, setMedia] = useState<MediaItem>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const loadMedia = async () => {
      try {
        const item = await mediaManager.getMedia(id)
        if (item) {
          setMedia(item)
        } else {
          setError('미디어를 찾을 수 없습니다.')
        }
      } catch (error) {
        setError('미디어 로드 중 오류가 발생했습니다.')
      }
    }

    loadMedia()
  }, [id])

  if (error) {
    return (
      <Card className={`p-4 text-center text-destructive ${className}`}>
        {error}
      </Card>
    )
  }

  if (!media) {
    return (
      <Card className={`p-4 text-center ${className}`}>
        로딩 중...
      </Card>
    )
  }

  const style = {
    width: width || media.metadata.width || 'auto',
    height: height || media.metadata.height || 'auto',
    maxWidth: '100%'
  }

  switch (media.type) {
    case 'image':
      return (
        <img
          src={media.file instanceof Blob ? URL.createObjectURL(media.file) : media.file}
          alt={media.metadata.name}
          style={style}
          className={className}
        />
      )

    case 'video':
      return (
        <video
          src={media.file instanceof Blob ? URL.createObjectURL(media.file) : media.file}
          controls
          style={style}
          className={className}
        />
      )

    case 'document':
      if (media.metadata.mimeType === 'application/pdf') {
        return (
          <iframe
            src={media.file instanceof Blob ? URL.createObjectURL(media.file) : media.file}
            style={style}
            className={className}
          />
        )
      }
      return (
        <Card className={`p-4 text-center ${className}`}>
          <a
            href={media.file instanceof Blob ? URL.createObjectURL(media.file) : media.file}
            download={media.metadata.name}
            className="text-primary hover:underline"
          >
            {media.metadata.name} 다운로드
          </a>
        </Card>
      )

    default:
      return (
        <Card className={`p-4 text-center ${className}`}>
          지원하지 않는 미디어 형식입니다.
        </Card>
      )
  }
} 