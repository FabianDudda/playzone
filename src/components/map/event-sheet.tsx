'use client'

import { useState, useEffect } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import LoginPromptBottomSheet from './login-prompt-bottom-sheet-vaul'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Share2, Heart, X, Loader2, ChevronDown, ExternalLink, Image, Maximize2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'
import { getDistanceText } from '@/lib/utils/distance'
import { database } from '@/lib/supabase/database'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ScheduleDisplay from '@/components/events/schedule-display'

interface EventSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
  userLocation: { lat: number; lng: number } | null
  user: { id: string } | null
}

export default function EventSheet({ isOpen, onOpenChange, eventId, userLocation, user }: EventSheetProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isSaveLoginPromptOpen, setIsSaveLoginPromptOpen] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  useEffect(() => {
    setIsDescriptionExpanded(false)
  }, [eventId, isOpen])

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => database.events.getEvent(eventId!, undefined),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: organizers = [] } = useQuery({
    queryKey: ['organizers-for-event', event?.organizer_ids],
    queryFn: () => database.organizers.getAll(),
    enabled: !!event?.organizer_ids?.length,
    staleTime: 60_000,
    select: (all) => all.filter(o => event?.organizer_ids?.includes(o.id)),
  })

  const { data: isBookmarked = false } = useQuery({
    queryKey: ['event-bookmark', user?.id, eventId],
    queryFn: () => database.eventBookmarks.isBookmarked(user!.id, eventId!),
    enabled: !!user && !!eventId,
  })

  const bookmarkMutation = useMutation({
    mutationFn: () => isBookmarked
      ? database.eventBookmarks.unbookmarkEvent(user!.id, eventId!)
      : database.eventBookmarks.bookmarkEvent(user!.id, eventId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-bookmark', user?.id, eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      toast({ title: isBookmarked ? 'Aus gespeicherten Events entfernt' : 'Gespeichert!' })
    },
    onError: () => {
      toast({ title: 'Etwas ist schiefgelaufen', variant: 'destructive' })
    },
  })

  const showToggle = (event?.description?.length ?? 0) > 200 || organizers.length > 0

  const quickAddress = event?.inline_location
    ? [
        event.inline_location.street && event.inline_location.house_number
          ? `${event.inline_location.street} ${event.inline_location.house_number}`
          : event.inline_location.street,
        event.inline_location.city,
      ].filter(Boolean).join(', ')
    : null

  return (
    <>
      {isLightboxOpen && event?.image_url && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Schließen"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt={event.title}
            className="max-w-full max-h-full object-contain px-14 py-12"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <LoginPromptBottomSheet
        isOpen={isSaveLoginPromptOpen}
        onOpenChange={setIsSaveLoginPromptOpen}
        title="Event speichern"
        description="Melde dich an, um Events zu speichern."
        icon={Heart}
      />

      <Drawer open={isOpen} onOpenChange={onOpenChange} modal={false} shouldScaleBackground={false}>
        <DrawerContent hideOverlay className={`${isDescriptionExpanded ? 'max-h-[100dvh]' : 'max-h-[92dvh]'} max-w-2xl mx-auto border-x-0`}>

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
                  className="rounded-full h-9 w-9"
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
                <Button variant="glass-secondary" size="icon" className="rounded-full h-9 w-9" onClick={() => onOpenChange(false)}>
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
                {/* Hero row */}
                <div className="flex gap-3 items-start">
                  {event.image_url ? (
                    <button
                      type="button"
                      className="relative shrink-0 w-[80px] h-[80px] rounded-[10px] overflow-hidden block"
                      onClick={() => setIsLightboxOpen(true)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                      <span className="absolute top-1 right-1 bg-black/40 rounded p-0.5">
                        <Maximize2 className="h-3 w-3 text-white" />
                      </span>
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
                    <div className="flex flex-wrap gap-1">
                      {event.location_type === 'indoor' && <Badge variant="outline" className="text-sm pl-2 glass-border">🏠 Indoor</Badge>}
                      {event.location_type === 'outdoor' && <Badge variant="outline" className="text-sm pl-2 glass-border">☀️ Outdoor</Badge>}
                      {event.gender_restriction === 'male' && <Badge variant="outline" className="text-sm pl-2 glass-border">♂ Nur Männer</Badge>}
                      {event.gender_restriction === 'female' && <Badge variant="outline" className="text-sm pl-2 glass-border">♀ Nur Frauen</Badge>}
                      {event.age_restriction?.type === 'min' && event.age_restriction.min && (
                        <Badge variant="outline" className="text-sm pl-2 glass-border">👤 Ab {event.age_restriction.min} Jahren</Badge>
                      )}
                      {event.age_restriction?.type === 'range' && event.age_restriction.min && event.age_restriction.max && (
                        <Badge variant="outline" className="text-sm pl-2 glass-border">👤 {event.age_restriction.min}–{event.age_restriction.max} Jahre</Badge>
                      )}
                    </div>
                    {quickAddress && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {quickAddress}
                      </p>
                    )}
                    {userLocation && event.inline_location && (
                      <p className="text-sm text-muted-foreground">
                        {getDistanceText(userLocation, { lat: event.inline_location.latitude, lng: event.inline_location.longitude })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sport badges */}
                <div className="flex flex-wrap gap-1.5">
                  {event.sports.map(sport => (
                    <Badge key={sport} variant="outline" className="text-sm pl-2 glass-border">
                      {sportIcons[sport]} {sportNames[sport]}
                    </Badge>
                  ))}
                </div>

                {/* Schedule */}
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Datum & Uhrzeit</p>
                  <ScheduleDisplay schedule={event.schedule} />
                </div>

                {/* Description + Organizers (collapsible) */}
                {(event.description || organizers.length > 0) && (
                  <div className="flex flex-col gap-2">
                    {event.description && (
                      <>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Beschreibung</p>
                        <p
                          className={`text-sm text-muted-foreground whitespace-pre-line${isDescriptionExpanded ? '' : ' line-clamp-4'}`}
                          style={!isDescriptionExpanded && (event.description?.length ?? 0) > 200
                            ? { maskImage: 'linear-gradient(to top, transparent 0%, black 40%)' }
                            : undefined}
                        >
                          {event.description}
                        </p>
                      </>
                    )}
                    {isDescriptionExpanded && organizers.length > 0 && (
                      <>
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
                      </>
                    )}
                    {showToggle && (
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
                  <Button
                    variant="glass-secondary"
                    className="flex-1"
                    onClick={() => {
                      if (!user) { setIsSaveLoginPromptOpen(true); return }
                      bookmarkMutation.mutate()
                    }}
                    disabled={bookmarkMutation.isPending}
                  >
                    {bookmarkMutation.isPending
                      ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      : <Heart className={`h-4 w-4 mr-1 ${isBookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />}
                    {isBookmarked ? 'Gespeichert' : 'Speichern'}
                  </Button>
                </div>
              </>
            ) : null}
          </div>

        </DrawerContent>
      </Drawer>
    </>
  )
}
