'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { mediaManager } from '@/lib/media'
import type { MediaItem } from '@/lib/media'
import { MediaView } from './media-view'
import { MediaUpload } from './media-upload'
import { Grid } from '@/components/responsive/Grid'
import { Stack } from '@/components/responsive/Stack'
import { Container } from '@/components/responsive/Container'
import { Button } from '@/components/ui/button'
import { Loader2, Plus } from 'lucide-react'

interface MediaGalleryProps {
  onSelect?: (id: string) => void
  selectedIds?: string[]
  maxSelect?: number
  showUpload?: boolean
}

export function MediaGallery({
  onSelect,
  selectedIds = [],
  maxSelect = 1,
  showUpload = true
}: MediaGalleryProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [showUploader, setShowUploader] = useState(false)

  useEffect(() => {
    loadMedia()
  }, [])

  const loadMedia = async () => {
    try {
      const items = await mediaManager.getAllMedia()
      setMediaItems(items)
    } catch (error) {
      setError('미디어 로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (id: string) => {
    await loadMedia()
    onSelect?.(id)
  }

  const handleError = (error: Error) => {
    setError(error.message)
  }

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelect?.(id)
    } else if (selectedIds.length < maxSelect) {
      onSelect?.(id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-4 text-center text-destructive">
        {error}
      </Card>
    )
  }

  return (
    <Container>
      <Stack gap={4}>
        {showUpload && (
          <div className="flex justify-end">
            <Button
              onClick={() => setShowUploader(!showUploader)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              {showUploader ? '업로드 닫기' : '새 미디어 업로드'}
            </Button>
          </div>
        )}

        {showUploader && (
          <MediaUpload
            onUpload={handleUpload}
            onError={handleError}
            maxFiles={1}
          />
        )}

        <Grid
          cols={{
            xs: 1,
            sm: 2,
            md: 3,
            lg: 4
          }}
          gap={4}
        >
          {mediaItems.map(item => (
            <Card
              key={item.id}
              className={`relative overflow-hidden cursor-pointer transition-all
                ${selectedIds.includes(item.id) ? 'ring-2 ring-primary' : ''}
                ${selectedIds.length >= maxSelect && !selectedIds.includes(item.id) ? 'opacity-50' : ''}
              `}
              onClick={() => handleSelect(item.id)}
            >
              <div className="aspect-square">
                <MediaView
                  id={item.id}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm truncate">
                {item.metadata.name}
              </div>
            </Card>
          ))}
        </Grid>
      </Stack>
    </Container>
  )
} 