'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mediaManager } from '@/lib/media'

interface MediaUploadProps {
  onUpload?: (id: string) => void
  onError?: (error: Error) => void
  maxFiles?: number
  accept?: Record<string, string[]>
}

export function MediaUpload({
  onUpload,
  onError,
  maxFiles = 1,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    'video/*': ['.mp4', '.webm', '.ogg'],
    'application/pdf': ['.pdf']
  }
}: MediaUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles].slice(0, maxFiles))
  }, [maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    accept
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    setUploading(true)
    try {
      for (const file of files) {
        const id = await mediaManager.saveMedia(file)
        onUpload?.(id)
      }
      setFiles([])
    } catch (error) {
      onError?.(error as Error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`p-8 text-center border-dashed cursor-pointer transition-colors
          ${isDragActive ? 'border-primary' : 'border-border'}
          ${files.length >= maxFiles ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          {isDragActive
            ? '파일을 여기에 놓으세요'
            : '파일을 드래그하거나 클릭하여 업로드하세요'}
        </p>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <Card key={index} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}

          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? '업로드 중...' : '업로드'}
          </Button>
        </div>
      )}
    </div>
  )
} 