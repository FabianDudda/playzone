'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Pencil, Trash2, ExternalLink, Share2 } from 'lucide-react'
import BackButton from '@/components/places/back-button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'
import ScheduleDisplay from '@/components/events/schedule-display'
import BookmarkButton from '@/components/events/bookmark-button'
import dynamic from 'next/dynamic'

const EventLocationMap = dynamic(
  () => import('@/components/events/event-location-map'),
  { ssr: false }
)

interface EventPageProps {
  params: Promise<{ id: string }>
}

function EventContent({ params }: EventPageProps) {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [eventId, setEventId] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  React.useEffect(() => {
    params.then(p => setEventId(p.id))
  }, [params])

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => database.events.getEvent(eventId, user?.id),
    enabled: !!eventId,
  })

  const { data: eventOrganizers = [] } = useQuery({
    queryKey: ['organizers-for-event', event?.organizer_ids],
    queryFn: () => database.organizers.getAll(),
    enabled: !!event?.organizer_ids?.length,
    staleTime: 60_000,
    select: (all) => all.filter(o => event?.organizer_ids?.includes(o.id)),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isAdmin && user?.id !== event?.creator_id) {
        const res = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Fehler beim Löschen')
        return
      }
      const { error } = await database.events.deleteEvent(eventId)
      if (error) throw new Error('Fehler beim Löschen')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast({ title: 'Event gelöscht' })
      router.push('/events')
    },
    onError: () => {
      toast({ title: 'Fehler beim Löschen', variant: 'destructive' })
    },
  })

  if (isLoading || !eventId) {
    return (
      <div className="container px-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto py-4 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 bg-muted animate-pulse rounded" />
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container px-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto py-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Event nicht gefunden</h1>
        <Link href="/events"><Button variant="outline">Zurück zu Events</Button></Link>
      </div>
      </div>
    )
  }

  const isCreator = user?.id === event.creator_id || isAdmin

  const displayName = event.place_id ? event.place_name : (event.inline_location?.name ?? '')
  const displayLat = event.place_id ? event.place_latitude : (event.inline_location?.latitude ?? 0)
  const displayLng = event.place_id ? event.place_longitude : (event.inline_location?.longitude ?? 0)

  const street = event.place_id ? event.place_street : (event.inline_location?.street ?? null)
  const houseNumber = event.place_id ? event.place_house_number : (event.inline_location?.house_number ?? null)
  const postcode = event.place_id ? event.place_postcode : (event.inline_location?.postcode ?? null)
  const city = event.place_id ? event.place_city : (event.inline_location?.city ?? null)

  const addressLine1 = street && houseNumber
    ? `${street} ${houseNumber}`
    : street || null
  const addressLine2 = postcode && city
    ? `${postcode} ${city}`
    : city || null

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/events/${event.id}`
    if (navigator.share) {
      navigator.share({ title: event.title, url: shareUrl }).catch(() => {})
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => toast({ title: 'Link kopiert!' }))
        .catch(() => toast({ title: 'Link konnte nicht kopiert werden', variant: 'destructive' }))
    }
  }

  return (
    <div className="container px-4 overflow-x-hidden">
    <div className="max-w-xl mx-auto py-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <BackButton />
          <h1 className="text-xl font-semibold truncate">{event.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isCreator && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </Button>
              <Button variant="secondary" size="icon" className="rounded-full" asChild>
                <Link href={`/events/${event.id}/edit`}>
                  <Pencil className="h-[18px] w-[18px]" />
                </Link>
              </Button>
            </>
          )}
          <BookmarkButton
            eventId={event.id}
            isBookmarked={event.is_bookmarked}
            userId={user?.id}
          />
          <Button variant="secondary" size="icon" className="rounded-full" onClick={handleShare} title="Teilen">
            <Share2 className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>

      <Card className="mb-3">
        <CardContent className="px-4 py-4 space-y-4">
          {event.status === 'cancelled' && (
            <Badge variant="destructive">Abgesagt</Badge>
          )}

          {/* Cover image */}
          {event.image_url && (
            <div className="-mx-4 aspect-video overflow-hidden">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Attribute pills */}
          <div className="flex flex-wrap gap-1.5">
            {event.sports.map(sport => (
              <Badge key={sport} variant="secondary">
                {sportIcons[sport]} {sportNames[sport]}
              </Badge>
            ))}
            {event.location_type === 'indoor' && <Badge variant="secondary">🏠 Indoor</Badge>}
            {event.location_type === 'outdoor' && <Badge variant="secondary">☀️ Outdoor</Badge>}
            {event.location_type === 'both' && <Badge variant="secondary">↔️ Indoor & Outdoor</Badge>}
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
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">Datum & Uhrzeit</h2>
            <ScheduleDisplay schedule={event.schedule} />
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Beschreibung</h2>
              <p className="text-sm whitespace-pre-line">{event.description}</p>
            </div>
          )}

          {/* Organizers */}
          {eventOrganizers.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Veranstalter</h2>
              <div className="space-y-3">
                {eventOrganizers.map(org => (
                  <div key={org.id} className="flex items-center gap-3">
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded-full object-contain flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center bg-muted text-muted-foreground font-bold text-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{org.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
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
                        {org.email && (
                          <a href={`mailto:${org.email}`} className="text-xs text-primary hover:underline">
                            {org.email}
                          </a>
                        )}
                        {org.phone && (
                          <a href={`tel:${org.phone}`} className="text-xs text-primary hover:underline">
                            {org.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Place */}
      <Card className="mb-3">
        <CardContent className="py-4 px-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Ort</h2>
          <div className="flex items-start gap-2 mb-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{displayName}</p>
              {addressLine1 && <p className="text-sm text-muted-foreground">{addressLine1}</p>}
              {addressLine2 && <p className="text-sm text-muted-foreground">{addressLine2}</p>}
            </div>
          </div>
          {displayLat !== 0 && (
            <div className="h-40 rounded-lg overflow-hidden">
              <EventLocationMap
                latitude={displayLat}
                longitude={displayLng}
                placeName={displayName}
                sports={event.sports}
                height="160px"
              />
            </div>
          )}
          {event.place_id && (
            <Link
              href={`/?place=${event.place_id}`}
              className="flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Ort auf der Karte ansehen
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event löschen?</DialogTitle>
            <DialogDescription>
              Möchtest du <strong>{event.title}</strong> dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Abbrechen</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => { setShowDeleteDialog(false); deleteMutation.mutate() }}
            >
              {deleteMutation.isPending ? 'Wird gelöscht…' : 'Endgültig löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}

export default function EventPage({ params }: EventPageProps) {
  return (
    <Suspense>
      <EventContent params={params} />
    </Suspense>
  )
}
