'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Camera, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { PlaceImage } from '@/lib/supabase/types'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { uploadPlaceImageScoped } from '@/lib/supabase/storage'
import { database } from '@/lib/supabase/database'

const MAX_FILES = 5
const MAX_SIZE_MB = 10

interface PlaceImageGalleryProps {
  images: PlaceImage[]
  placeId: string
  placeName: string
  // Deferred mode: form owns upload, just collect files
  stagedPreviews?: string[]
  onAddFiles?: (files: File[]) => void
  onRemoveStagedFile?: (index: number) => void
  isUploading?: boolean
  // Admin only
  onDeleteImage?: (image: PlaceImage) => void
}

export default function PlaceImageGallery({
  images,
  placeId,
  placeName,
  stagedPreviews,
  onAddFiles,
  onRemoveStagedFile,
  isUploading: externalUploading,
  onDeleteImage,
}: PlaceImageGalleryProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [internalUploading, setInternalUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const isDeferred = !!onAddFiles
  const isUploading = isDeferred ? (externalUploading ?? false) : internalUploading

  const sorted = [...images].sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1
    return a.sort_order - b.sort_order
  })

  const staged = stagedPreviews ?? []
  const hasAnyImage = sorted.length > 0 || staged.length > 0

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const prevImage = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i - 1 + sorted.length) % sorted.length : null)),
    [sorted.length]
  )
  const nextImage = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i + 1) % sorted.length : null)),
    [sorted.length]
  )

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'ArrowRight') nextImage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, closeLightbox, prevImage, nextImage])

  useEffect(() => {
    document.body.style.overflow = lightboxIndex !== null ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxIndex])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, MAX_FILES)
    e.target.value = ''

    const valid = selected.filter((f) => f.type.startsWith('image/') && f.size <= MAX_SIZE_MB * 1024 * 1024)
    if (valid.length < selected.length) {
      toast({ title: 'Einige Dateien übersprungen', description: `Nur Bilder bis ${MAX_SIZE_MB} MB erlaubt.`, variant: 'destructive' })
    }
    if (valid.length === 0) return

    if (isDeferred) {
      onAddFiles!(valid)
      return
    }

    // Auto-upload mode (place detail page)
    setInternalUploading(true)
    try {
      for (const file of valid) {
        if (user) {
          const result = await uploadPlaceImageScoped(file, placeId)
          await database.community.submitPlaceImageAdd(placeId, result.path, result.url, user.id)
        } else {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('placeId', placeId)
          const res = await fetch('/api/guest/submit-image', { method: 'POST', body: formData })
          if (!res.ok) {
            const json = await res.json()
            throw new Error(json.error || 'Upload fehlgeschlagen')
          }
        }
      }
      toast({
        title: valid.length === 1 ? 'Foto eingereicht!' : `${valid.length} Fotos eingereicht!`,
        description: 'Deine Fotos werden geprüft und danach veröffentlicht.',
      })
    } catch (err) {
      toast({ title: 'Fehler beim Hochladen', description: err instanceof Error ? err.message : 'Unbekannter Fehler', variant: 'destructive' })
    } finally {
      setInternalUploading(false)
    }
  }

  const cameraIcon = isUploading
    ? <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
    : <Camera className="h-5 w-5 text-muted-foreground/40" />

  const addPhotoTile = (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={isUploading}
      className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:border-primary/50 hover:bg-muted/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Foto hinzufügen"
    >
      {cameraIcon}
    </button>
  )

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} disabled={isUploading} />

      <div className="space-y-2">
        {hasAnyImage ? (
          <>
            {/* Cover — first DB image, or first staged preview when no DB images yet */}
            <div
              className={`relative w-full aspect-[16/9] rounded-xl overflow-hidden ${sorted.length > 0 ? 'cursor-pointer' : ''}`}
              onClick={() => sorted.length > 0 && setLightboxIndex(0)}
            >
              <img
                src={sorted.length > 0 ? sorted[0].url : staged[0]}
                alt={placeName}
                className="w-full h-full object-cover"
              />
              {sorted.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/55 text-white text-xs px-2 py-0.5 rounded-full">
                  1 / {sorted.length}
                </div>
              )}
              {onDeleteImage && sorted.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteImage(sorted[0]) }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-red-600/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {/* DB thumbnails (skip cover) */}
              {sorted.slice(1).map((img, i) => (
                <div key={img.id} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setLightboxIndex(i + 1)}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                  {onDeleteImage && (
                    <button
                      type="button"
                      onClick={() => onDeleteImage(img)}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-red-600/80 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {/* Staged previews (when no DB cover, skip first; otherwise show all) */}
              {(sorted.length > 0 ? staged : staged.slice(1)).map((url, i) => {
                const idx = sorted.length > 0 ? i : i + 1
                return (
                  <div key={`staged-${i}`} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {onRemoveStagedFile && (
                      <button
                        type="button"
                        onClick={() => onRemoveStagedFile(idx)}
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )
              })}
              {addPhotoTile}
            </div>
          </>
        ) : (
          /* Empty state */
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="w-full h-[88px] rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center gap-2 hover:border-primary/40 hover:bg-muted/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading
              ? <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
              : <>
                  <Camera className="h-5 w-5 text-muted-foreground/40" />
                  <span className="text-sm text-muted-foreground">Foto hinzufügen</span>
                </>
            }
          </button>
        )}
      </div>

      {/* Lightbox (DB images only) */}
      {lightboxIndex !== null && sorted.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={closeLightbox}>
          <button type="button" className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors" onClick={closeLightbox} aria-label="Schließen">
            <X className="h-6 w-6" />
          </button>
          {sorted.length > 1 && (
            <>
              <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-2" onClick={(e) => { e.stopPropagation(); prevImage() }} aria-label="Vorheriges Bild">
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-2" onClick={(e) => { e.stopPropagation(); nextImage() }} aria-label="Nächstes Bild">
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}
          <img src={sorted[lightboxIndex].url} alt={placeName} className="max-w-full max-h-full object-contain px-14 py-12" onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-4 text-white/50 text-sm select-none">
            {lightboxIndex + 1} / {sorted.length}
          </div>
        </div>
      )}
    </>
  )
}
