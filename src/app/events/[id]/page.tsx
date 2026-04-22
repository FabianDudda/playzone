'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Edit, Trash2, ExternalLink } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getSportBadgeClasses, sportNames, sportIcons } from '@/lib/utils/sport-utils'
import ScheduleDisplay from '@/components/events/schedule-display'
import ContactDisplay from '@/components/events/contact-display'
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
      <div className="container px-4 py-8 max-w-xl mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container px-4 py-8 max-w-xl mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">Event nicht gefunden</h1>
        <Link href="/events"><Button variant="outline">Zurück zu Events</Button></Link>
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

  return (
    <div className="container px-4 py-4 max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/events"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex items-center gap-1">
          <BookmarkButton
            eventId={event.id}
            isBookmarked={event.is_bookmarked}
            userId={user?.id}
          />
          {isCreator && (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/events/${event.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="mb-3">
        <CardContent className="px-4 py-4 space-y-4">
          {/* Title & sport */}
          <div>
            <div className="flex items-start gap-2 mb-1">
              <h1 className="text-2xl font-bold flex-1">{event.title}</h1>
              <div className="flex flex-wrap gap-1 mt-1 flex-shrink-0">
                {event.sports.map(sport => (
                  <Badge key={sport} variant="secondary">
                    {sportIcons[sport]} {sportNames[sport]}
                  </Badge>
                ))}
              </div>
            </div>
            {event.status === 'cancelled' && (
              <Badge variant="destructive">Abgesagt</Badge>
            )}
            {(event.location_type || event.gender_restriction || event.age_restriction) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
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
            )}
          </div>

          {/* Cover image */}
          {event.image_url && (
            <div className="-mx-4 aspect-video overflow-hidden">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}

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
                    <div
                      className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: org.color || '#6366F1' }}
                    >
                      {org.logo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded-full object-contain" />
                        : org.name.charAt(0).toUpperCase()
                      }
                    </div>
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(event.contact?.name || event.contact?.email || event.contact?.phone || event.contact?.instagram || event.contact?.website) && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Kontakt</h2>
              <ContactDisplay contact={event.contact} />
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
  )
}

export default function EventPage({ params }: EventPageProps) {
  return (
    <Suspense>
      <EventContent params={params} />
    </Suspense>
  )
}
