'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import LoginPromptBottomSheet from './login-prompt-bottom-sheet-vaul'
import ReportPlaceBottomSheet from './report-place-bottom-sheet-vaul'
import PlaceTypeInfoSheet from './place-type-info-sheet'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Share2, Heart, Pencil, X, Image, Loader2, Maximize2, Flag, Phone, Mail, Globe, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Calendar } from 'lucide-react'
import { PlaceWithCourts, PlaceMarker, OpeningHours, PlaceImage } from '@/lib/supabase/types'
import { rowsToAttributeMap, getActiveAttributeKeys, ATTRIBUTE_DEFINITIONS } from '@/lib/attributes/definitions'
import { AttributeIconRow } from '@/components/attributes/attribute-icons'
import { getOpeningStatus, getCurrentDayKey, DAY_ORDER, DAY_SHORT_DE } from '@/lib/utils/opening-hours'
import { cn } from '@/lib/utils'
import { sportNames, sportIcons, getPlaceTypeBadgeClasses, placeTypeLabels, placeTypeIcons, PlaceType } from '@/lib/utils/sport-utils'
import { Badge } from '@/components/ui/badge'
import { getDistanceText } from '@/lib/utils/distance'
import { uploadCourtImage } from '@/lib/supabase/storage'
import { database } from '@/lib/supabase/database'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PlaceEventsSection from '@/components/places/place-events-section'
import ScheduleDisplay from '@/components/events/schedule-display'
import Link from 'next/link'

function EventOnlyContent({ eventId, userLocation, onClose }: { eventId: string; userLocation: { lat: number; lng: number } | null; onClose: () => void }) {
  const { toast } = useToast()
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => database.events.getEvent(eventId, undefined),
    staleTime: 5 * 60 * 1000,
  })

  const { data: organizers = [] } = useQuery({
    queryKey: ['organizers-for-event', event?.organizer_ids],
    queryFn: () => database.organizers.getAll(),
    enabled: !!event?.organizer_ids?.length,
    staleTime: 60_000,
    select: (all) => all.filter(o => event?.organizer_ids?.includes(o.id)),
  })

  return (
    <>
      <DrawerHeader>
        <div className="flex items-center justify-between overflow-hidden gap-3">
          <div className="min-w-0 text-left">
            <DrawerTitle className="text-[18px] text-left truncate">
              {isLoading ? <span className="h-5 w-40 bg-muted animate-pulse rounded inline-block" /> : event?.title}
            </DrawerTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="glass-secondary"
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={() => {
                const shareUrl = `${window.location.origin}/?place=${eventId}`
                if (navigator.share) {
                  navigator.share({ title: event?.title ?? '', url: shareUrl }).catch(() => {})
                } else {
                  navigator.clipboard.writeText(shareUrl)
                    .then(() => toast({ title: 'Link kopiert!' }))
                    .catch(() => toast({ title: 'Link konnte nicht kopiert werden', variant: 'destructive' }))
                }
              }}
              title="Teilen"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="glass-secondary" size="icon" className="rounded-full h-10 w-10" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DrawerHeader>

      <div className="flex flex-col gap-4 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded-lg" />
          </div>
        ) : event ? (
          <>
            {/* Cover image */}
            {event.image_url && (
              <div className="-mx-4 overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.image_url} alt={event.title} className="w-full object-contain block" />
              </div>
            )}

            {/* Sport badges */}
            <div className="flex flex-wrap gap-1.5">
              {event.sports.map(sport => (
                <Badge key={sport} variant="secondary">
                  {sportIcons[sport]} {sportNames[sport]}
                </Badge>
              ))}
              {event.location_type === 'indoor' && <Badge variant="secondary">🏠 Indoor</Badge>}
              {event.location_type === 'outdoor' && <Badge variant="secondary">☀️ Outdoor</Badge>}
              {event.gender_restriction === 'male' && <Badge variant="secondary">♂ Nur Männer</Badge>}
              {event.gender_restriction === 'female' && <Badge variant="secondary">♀ Nur Frauen</Badge>}
              {event.age_restriction?.type === 'min' && event.age_restriction.min && (
                <Badge variant="secondary">👤 Ab {event.age_restriction.min} Jahren</Badge>
              )}
              {event.age_restriction?.type === 'range' && event.age_restriction.min && event.age_restriction.max && (
                <Badge variant="secondary">👤 {event.age_restriction.min}–{event.age_restriction.max} Jahre</Badge>
              )}
            </div>

            {/* Schedule */}
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Datum & Uhrzeit</p>
              <ScheduleDisplay schedule={event.schedule} />
            </div>

            {/* Location */}
            {event.inline_location && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ort</p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm">{event.inline_location.name}</p>
                    {[
                      event.inline_location.street && event.inline_location.house_number
                        ? `${event.inline_location.street} ${event.inline_location.house_number}`
                        : event.inline_location.street,
                      [event.inline_location.postcode, event.inline_location.city].filter(Boolean).join(' '),
                    ].filter(Boolean).map((line, i) => (
                      <p key={i} className="text-sm text-muted-foreground">{line}</p>
                    ))}
                    {userLocation && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {getDistanceText(userLocation, { lat: event.inline_location.latitude, lng: event.inline_location.longitude })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Beschreibung</p>
                <div className="relative">
                  <p className={`text-sm text-muted-foreground whitespace-pre-line${isDescriptionExpanded ? '' : ' line-clamp-4'}`}>
                    {event.description}
                  </p>
                  {!isDescriptionExpanded && event.description.length > 200 && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/[.72] dark:from-[#1c1c1e]/[.55] to-transparent pointer-events-none" />
                  )}
                </div>
                {event.description.length > 200 && (
                  <div>
                    <button
                      onClick={() => setIsDescriptionExpanded(prev => !prev)}
                      className="flex items-center gap-1 text-xs border rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isDescriptionExpanded ? 'rotate-180' : ''}`} />
                      {isDescriptionExpanded ? 'Weniger' : 'Mehr lesen'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Organizers */}
            {organizers.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Veranstalter</p>
                {organizers.map(org => (
                  <div key={org.id} className="flex items-center gap-3">
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo_url} alt={org.name} className="h-9 w-9 rounded-full object-contain flex-shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center bg-muted text-muted-foreground font-bold text-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{org.name}</p>
                      <div className="flex items-center gap-3 flex-wrap mt-0.5">
                        {org.website && (
                          <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Website
                          </a>
                        )}
                        {org.instagram && (
                          <a href={`https://instagram.com/${org.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                            {org.instagram.startsWith('@') ? org.instagram : `@${org.instagram}`}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => {
                  const lat = event.inline_location?.latitude ?? 0
                  const lng = event.inline_location?.longitude ?? 0
                  window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank', 'noopener,noreferrer')
                }}
              >
                <Navigation className="h-4 w-4 mr-1" />
                Route
              </Button>
              <Button variant="glass-secondary" className="flex-1" asChild>
                <Link href={`/events/${event.id}`}>
                  <Calendar className="h-4 w-4 mr-1" />
                  Zum Event
                </Link>
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

interface PlaceSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedCourt: PlaceMarker | null
  userLocation: { lat: number; lng: number } | null
  user: { id: string } | null
  profile: { user_role?: string } | null
  showFavorite?: boolean
}

export default function PlaceSheet({
  isOpen,
  onOpenChange,
  selectedCourt,
  userLocation,
  user,
  profile,
  showFavorite = true,
}: PlaceSheetProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isSaveLoginPromptOpen, setIsSaveLoginPromptOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isPlaceTypeInfoOpen, setIsPlaceTypeInfoOpen] = useState(false)
  const [isHoursExpanded, setIsHoursExpanded] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const { data: placeData, isLoading: isLoadingPlace } = useQuery({
    queryKey: ['place-with-attrs', selectedCourt?.id],
    queryFn: async () => {
      const place = await database.courts.getCourt(selectedCourt!.id)
      const courtIds = (place?.courts ?? []).map(c => c.id)
      const [placeAttrs, courtAttrs] = await Promise.all([
        database.attributes.getPlaceAttributes(selectedCourt!.id),
        courtIds.length > 0 ? database.attributes.getCourtAttributes(courtIds) : Promise.resolve([]),
      ])
      return { place, placeAttrs, courtAttrs }
    },
    enabled: !!selectedCourt && !selectedCourt.is_event_only,
    staleTime: 5 * 60 * 1000,
  })

  const fullPlace = placeData?.place
  const placeAttrActiveKeys = getActiveAttributeKeys(rowsToAttributeMap(placeData?.placeAttrs ?? []))
  const courtAttrMap = (placeData?.courtAttrs ?? []).reduce((acc, row) => {
    if (!acc[row.court_id]) acc[row.court_id] = {} as Record<string, boolean>
    if (row.value === 'true') acc[row.court_id][row.key] = true
    return acc
  }, {} as Record<string, Record<string, boolean>>)

  const place: PlaceWithCourts | null = fullPlace ?? (selectedCourt as PlaceWithCourts | null)

  const { data: isFavorited = false } = useQuery({
    queryKey: ['favorite', user?.id, selectedCourt?.id],
    queryFn: () => database.favorites.isFavorite(user!.id, selectedCourt!.id),
    enabled: !!user && !!selectedCourt && !selectedCourt.is_event_only,
  })

  const favoriteMutation = useMutation({
    mutationFn: () => isFavorited
      ? database.favorites.removeFavorite(user!.id, selectedCourt!.id)
      : database.favorites.addFavorite(user!.id, selectedCourt!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite', user?.id, selectedCourt?.id] })
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] })
      toast({ title: isFavorited ? 'Aus gespeicherten Orten entfernt' : 'Gespeichert!' })
    },
    onError: () => {
      toast({ title: 'Etwas ist schiefgelaufen', variant: 'destructive' })
    },
  })

  const { data: placeImages = [] } = useQuery<PlaceImage[]>({
    queryKey: ['place-images', selectedCourt?.id],
    queryFn: () => database.community.getPlaceImages(selectedCourt!.id),
    enabled: !!selectedCourt && !selectedCourt.is_event_only,
    staleTime: 5 * 60 * 1000,
  })

  const galleryImages: PlaceImage[] = placeImages.length > 0
    ? [...placeImages].sort((a, b) => {
        if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1
        return a.sort_order - b.sort_order
      })
    : place?.image_url
      ? [{ id: 'legacy', place_id: selectedCourt?.id ?? '', storage_path: '', url: place.image_url, is_cover: true, sort_order: 0, uploaded_by: null, created_at: '' }]
      : []

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const prevImage = useCallback(
    () => setLightboxIndex(i => (i !== null ? (i - 1 + galleryImages.length) % galleryImages.length : null)),
    [galleryImages.length]
  )
  const nextImage = useCallback(
    () => setLightboxIndex(i => (i !== null ? (i + 1) % galleryImages.length : null)),
    [galleryImages.length]
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
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightboxIndex])

  const attrLabel = (key: string) => ATTRIBUTE_DEFINITIONS.find(d => d.key === key)?.label ?? key

  return (
    <>
    <LoginPromptBottomSheet
      isOpen={isSaveLoginPromptOpen}
      onOpenChange={setIsSaveLoginPromptOpen}
      title="Ort speichern"
      description="Melde dich an, um Orte als Favoriten zu speichern."
      icon={Heart}
    />
    <ReportPlaceBottomSheet
      isOpen={isReportOpen}
      onOpenChange={setIsReportOpen}
      placeId={selectedCourt?.id ?? null}
      placeName={selectedCourt?.name ?? null}
      userId={user?.id ?? null}
    />
    <PlaceTypeInfoSheet
      isOpen={isPlaceTypeInfoOpen}
      onOpenChange={setIsPlaceTypeInfoOpen}
    />

    {/* Lightbox */}
    {lightboxIndex !== null && galleryImages[lightboxIndex] && (
      <div
        className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
        onClick={closeLightbox}
      >
        <button
          type="button"
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          onClick={closeLightbox}
          aria-label="Schließen"
        >
          <X className="h-6 w-6" />
        </button>
        {galleryImages.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-2"
              onClick={(e) => { e.stopPropagation(); prevImage() }}
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-2"
              onClick={(e) => { e.stopPropagation(); nextImage() }}
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        )}
        <img
          src={galleryImages[lightboxIndex].url}
          alt={place?.name ?? ''}
          className="max-w-full max-h-full object-contain px-14 py-12"
          onClick={(e) => e.stopPropagation()}
        />
        {galleryImages.length > 1 && (
          <div className="absolute bottom-4 text-white/50 text-sm select-none">
            {lightboxIndex + 1} / {galleryImages.length}
          </div>
        )}
      </div>
    )}

    <Drawer open={isOpen} onOpenChange={onOpenChange} modal={false} shouldScaleBackground={false}>
      <DrawerContent hideOverlay className="max-h-[92dvh] max-w-2xl mx-auto border-x-0">
        {selectedCourt && selectedCourt.is_event_only ? (
          <EventOnlyContent
            eventId={selectedCourt.id}
            userLocation={userLocation}
            onClose={() => onOpenChange(false)}
          />
        ) : selectedCourt && (
          <>
            {/* ── Header ── */}
            <DrawerHeader>
              <div className="flex items-center justify-between overflow-hidden gap-3">
                <div className="min-w-0 text-left">
                  <DrawerTitle className="text-[18px] text-left truncate">
                    {selectedCourt.name}
                  </DrawerTitle>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="glass-secondary"
                    size="icon"
                    className="rounded-full h-10 w-10"
                    onClick={() => { window.location.href = `/places/${selectedCourt.id}/edit` }}
                    title="Bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="glass-secondary"
                    size="icon"
                    className="rounded-full h-10 w-10"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/?place=${selectedCourt.id}`
                      if (navigator.share) {
                        navigator.share({ title: selectedCourt.name, text: `Check out ${selectedCourt.name}`, url: shareUrl })
                          .catch(err => console.log('Share failed:', err))
                      } else {
                        navigator.clipboard.writeText(shareUrl)
                          .then(() => toast({ title: 'Link kopiert!' }))
                          .catch(() => toast({ title: 'Link konnte nicht kopiert werden', variant: 'destructive' }))
                      }
                    }}
                    title="Teilen"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DrawerHeader>

            <div className="flex flex-col gap-4 p-4 overflow-y-auto">

              {/* ── Hero row: thumbnail · place type badge · address ── */}
              <div className="flex gap-3 items-start">
                {isLoadingPlace && galleryImages.length === 0 ? (
                  <div className="shrink-0 w-[80px] h-[80px] rounded-[10px] bg-muted animate-pulse" />
                ) : galleryImages.length > 0 ? (
                  <button
                    type="button"
                    className="relative shrink-0 w-[80px] h-[80px] rounded-[10px] overflow-hidden block"
                    onClick={() => setLightboxIndex(0)}
                  >
                    <img
                      src={galleryImages[0].url}
                      alt={place?.name ?? ''}
                      className="w-full h-full object-cover"
                    />
                    {galleryImages.length > 1 ? (
                      <span className="absolute bottom-1 right-1 bg-black/55 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                        1 / {galleryImages.length}
                      </span>
                    ) : (
                      <span className="absolute top-1 right-1 bg-black/40 rounded p-0.5">
                        <Maximize2 className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </button>
                ) : (
                  <div
                    className="shrink-0 w-[80px] h-[80px] rounded-[10px] border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)' }}
                  >
                    <Image className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}

                <div className="flex flex-col gap-1 min-w-0 pt-0.5">
                  {place?.place_type && (
                    <button onClick={() => setIsPlaceTypeInfoOpen(true)} className="self-start">
                      <Badge className={`text-sm cursor-pointer pl-2 ${getPlaceTypeBadgeClasses(place.place_type)}`}>
                        {placeTypeIcons[place.place_type as PlaceType] || ''} {placeTypeLabels[place.place_type as PlaceType] || place.place_type}
                      </Badge>
                    </button>
                  )}
                  {(() => {
                    const quickAddress = [place?.street, place?.district || place?.city].filter(Boolean).join(', ')
                    if (!quickAddress) return null
                    return (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {quickAddress}
                      </p>
                    )
                  })()}
                  {userLocation && (
                    <p className="text-sm text-muted-foreground">
                      {getDistanceText(userLocation, { lat: selectedCourt.latitude, lng: selectedCourt.longitude })}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Place attributes ── */}
              {!isLoadingPlace && placeAttrActiveKeys.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ausstattung</p>
                  <AttributeIconRow activeKeys={placeAttrActiveKeys} size="md" />
                </div>
              )}

              {/* ── Plätze ── */}
              {!isLoadingPlace && (place?.courts?.length ?? 0) > 0 && (() => {
                const grouped = new Map<string, NonNullable<typeof place>['courts']>()
                for (const court of place?.courts ?? []) {
                  const key = court.sport === 'other' ? (court.custom_sport_name || 'other') : court.sport
                  if (!grouped.has(key)) grouped.set(key, [])
                  grouped.get(key)!.push(court)
                }
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2.5">
                      {[...grouped.entries()].map(([sportKey, courts]) => (
                        <div key={sportKey} className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[15px] leading-none">{sportIcons[sportKey] || '🏅'}</span>
                            <span className="text-sm font-medium">{sportNames[sportKey] || sportKey}</span>
                          </div>
                          {courts!.map((court, idx) => {
                            const activeKeys = Object.entries(courtAttrMap[court.id] ?? {}).filter(([, v]) => v).map(([k]) => k)
                              .sort((a, b) => ATTRIBUTE_DEFINITIONS.findIndex(d => d.key === a) - ATTRIBUTE_DEFINITIONS.findIndex(d => d.key === b))
                            const isUnknownSurface = !court.surface || court.surface.trim().toLowerCase() === 'unbekannt'
                            const surfaceLabel = isUnknownSurface ? 'Unbekannt' : court.surface!
                            return (
                              <div key={court.id} className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                                <span className="text-sm text-muted-foreground shrink-0">Platz {idx + 1}</span>
                                <span className="text-sm text-muted-foreground glass-chip rounded px-1.5 py-0.5 shrink-0">{surfaceLabel}</span>
                                {activeKeys.map((key, i) => (
                                  <Fragment key={key}>
                                    {i > 0 && <span className="text-sm text-muted-foreground/40">·</span>}
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{attrLabel(key)}</span>
                                  </Fragment>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      ))}

                    </div>
                  </div>
                )
              })()}

              {/* ── Opening hours ── */}
              {!isLoadingPlace && (() => {
                const hoursData = (place?.opening_hours ?? null) as OpeningHours | null
                if (!hoursData) return null
                const status = getOpeningStatus(hoursData)
                const todayKey = getCurrentDayKey()
                return (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Öffnungszeiten</p>
                    <button
                      className="flex items-center justify-between w-full text-left"
                      onClick={() => setIsHoursExpanded(prev => !prev)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full shrink-0', status.isOpen ? 'bg-green-500' : status.isUnknown ? 'bg-amber-400' : 'bg-muted-foreground/50')} />
                        <span className="text-sm text-muted-foreground">{status.statusText}</span>
                      </div>
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isHoursExpanded && 'rotate-180')} />
                    </button>
                    {isHoursExpanded && (
                      <div className="flex flex-col gap-1 pt-1 pl-4">
                        {DAY_ORDER.map(key => {
                          const day = hoursData[key]
                          const isToday = key === todayKey
                          return (
                            <div key={key} className={cn('flex justify-between text-sm', isToday ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                              <span>{DAY_SHORT_DE[key]}</span>
                              {day === undefined
                                ? <span className="text-muted-foreground/40 font-normal">–</span>
                                : day.closed || !day.open || !day.close
                                  ? <span className={isToday ? 'text-muted-foreground font-normal' : ''}>Geschlossen</span>
                                  : <span>{day.open} – {day.close} Uhr</span>
                              }
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── Description ── */}
              {!isLoadingPlace && place?.description && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Beschreibung</p>
                  <p className="text-sm text-muted-foreground">{place.description}</p>
                </div>
              )}

              {/* ── Contact ── */}
              {!isLoadingPlace && (place?.contact_phone || place?.contact_email || place?.contact_website) && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kontakt</p>
                  <div className="flex flex-col gap-1.5">
                    {place.contact_phone && (
                      <a href={`tel:${place.contact_phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{place.contact_phone}</span>
                      </a>
                    )}
                    {place.contact_email && (
                      <a href={`mailto:${place.contact_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span>{place.contact_email}</span>
                      </a>
                    )}
                    {place.contact_website && (
                      <a href={place.contact_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <Globe className="h-4 w-4 shrink-0" />
                        <span className="truncate">{place.contact_website.replace(/^https?:\/\//, '')}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* ── Footer links ── */}
              {/* {!isLoadingPlace && (
                <div className="flex items-center gap-4">
                  <button
                    className="flex items-center gap-1.5 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    onClick={() => setIsReportOpen(true)}
                  >
                    <Flag className="h-3 w-3" />
                    <span>Melden</span>
                  </button>
                </div>
              )} */}

              {/* ── Events at this place ── */}
              {selectedCourt && (
                <PlaceEventsSection placeId={selectedCourt.id} userId={user?.id} />
              )}

              {/* ── Action buttons ── */}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1 text-base"
                  onClick={() => {
                    const url = `https://maps.google.com/?q=${selectedCourt.latitude},${selectedCourt.longitude}`
                    window.open(url, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Route
                </Button>
                {showFavorite && (
                  <Button
                    variant="glass-secondary"
                    className="flex-1 text-base"
                    onClick={() => {
                      if (!user) { setIsSaveLoginPromptOpen(true); return }
                      favoriteMutation.mutate()
                    }}
                    disabled={favoriteMutation.isPending}
                  >
                    {favoriteMutation.isPending
                      ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      : <Heart className={`h-4 w-4 mr-1 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />}
                    {isFavorited ? 'Gespeichert' : 'Speichern'}
                  </Button>
                )}
              </div>

            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
    </>
  )
}
