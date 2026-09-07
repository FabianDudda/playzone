'use client'

import { Suspense, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { uploadCourtImage } from '@/lib/supabase/storage'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { LocationType, AgeRestriction, GenderRestriction, Organizer } from '@/lib/supabase/types'
import EventForm, { EventFormState, EventFormErrors } from '@/components/events/event-form'

interface EventPageProps {
  params: Promise<{ id: string }>
}

function EditEventContent({ params }: EventPageProps) {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [eventId, setEventId] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formReady, setFormReady] = useState(false)

  const [form, setForm] = useState<EventFormState>({
    title: '',
    sports: [],
    locationMode: 'existing',
    placeId: '',
    inlineLocationName: '',
    inlineLocationAddress: {},
    inlineLocationCoords: null,
    schedule: { type: 'dates', dates: [{ date: '', start_time: '', end_time: '' }] },
    description: '',
    contact: {},
    imageUrl: null,
    locationType: null,
    ageRestriction: { type: 'all' },
    genderRestriction: 'all',
    organizerIds: [],
  })

  const [errors, setErrors] = useState<EventFormErrors>({})

  React.useEffect(() => {
    params.then(p => setEventId(p.id))
  }, [params])

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => database.events.getEvent(eventId, user?.id),
    enabled: !!eventId,
    staleTime: 0,
  })

  React.useEffect(() => {
    if (event && !formReady) {
      const hasInline = !event.place_id && !!event.inline_location
      setForm({
        title: event.title,
        sports: event.sports ?? [],
        locationMode: hasInline ? 'inline' : 'existing',
        placeId: event.place_id ?? '',
        inlineLocationName: event.inline_location?.name ?? '',
        inlineLocationAddress: {
          street: event.inline_location?.street ?? undefined,
          house_number: event.inline_location?.house_number ?? undefined,
          postcode: event.inline_location?.postcode ?? undefined,
          city: event.inline_location?.city ?? undefined,
          district: event.inline_location?.district ?? undefined,
          county: event.inline_location?.county ?? undefined,
          state: event.inline_location?.state ?? undefined,
          country: event.inline_location?.country ?? undefined,
        },
        inlineLocationCoords: hasInline
          ? { lat: event.inline_location!.latitude, lng: event.inline_location!.longitude }
          : null,
        schedule: event.schedule,
        description: event.description ?? '',
        contact: event.contact ?? {},
        imageUrl: event.image_url,
        locationType: (event.location_type as LocationType) ?? null,
        ageRestriction: (event.age_restriction as AgeRestriction) ?? { type: 'all' },
        genderRestriction: (event.gender_restriction as GenderRestriction) ?? 'all',
        organizerIds: event.organizer_ids ?? [],
      })
      if (event.image_url) setImagePreview(event.image_url)
      setFormReady(true)
    }
  }, [event, formReady])

  const { data: organizers = [] } = useQuery<Organizer[]>({
    queryKey: ['organizers'],
    queryFn: () => database.organizers.getAll(),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  // Strip stale organizer IDs that no longer exist once the organizers list loads
  React.useEffect(() => {
    if (!isAdmin || organizers.length === 0 || !formReady) return
    const validIds = new Set(organizers.map(o => o.id))
    setForm(f => {
      const filtered = f.organizerIds.filter(id => validIds.has(id))
      if (filtered.length === f.organizerIds.length) return f
      return { ...f, organizerIds: filtered }
    })
  }, [organizers, isAdmin, formReady])

  const { data: userOrganizer = null } = useQuery({
    queryKey: ['my-organizer', user?.id],
    queryFn: () => database.organizers.getByOwner(user!.id),
    enabled: !!user && !isAdmin,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const errs: EventFormErrors = {}
      if (!form.title.trim()) errs.title = 'Titel ist erforderlich'
      if (form.sports.length === 0) errs.sports = 'Sportart ist erforderlich'
      if (form.locationMode === 'existing' && !form.placeId) {
        errs.placeId = 'Bitte wähle einen Ort aus'
      }
      if (form.locationMode === 'inline') {
        if (!form.inlineLocationName.trim()) errs.placeId = 'Bitte gib einen Ortsnamen ein'
        if (!form.inlineLocationCoords) errs.placeId = 'Bitte markiere den Ort auf der Karte'
      }
      if (form.schedule.type !== 'recurring' && form.schedule.dates.some(d => !d.date || !d.start_time)) {
        errs.schedule = 'Bitte alle Datum- und Zeitfelder ausfüllen'
      }
      if (form.schedule.type === 'recurring' && form.schedule.slots.length === 0) {
        errs.schedule = 'Bitte mindestens einen Wochentag auswählen'
      }
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        throw new Error('Bitte fülle alle Pflichtfelder aus')
      }

      const placeId = form.locationMode === 'existing' ? (form.placeId || null) : null
      const inlineLocation = form.locationMode === 'inline' && form.inlineLocationCoords
        ? {
            name: form.inlineLocationName.trim(),
            latitude: form.inlineLocationCoords.lat,
            longitude: form.inlineLocationCoords.lng,
            ...form.inlineLocationAddress,
          }
        : null

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        sports: form.sports,
        place_id: placeId,
        inline_location: inlineLocation,
        schedule: form.schedule,
        contact: {},
        image_url: form.imageUrl,
        location_type: form.locationType,
        age_restriction: form.ageRestriction,
        gender_restriction: form.genderRestriction,
        organizer_id: form.organizerIds[0] ?? null,
        organizer_ids: form.organizerIds,
      }

      if (isAdmin) {
        const res = await fetch(`/api/admin/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit', ...payload }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Fehler beim Speichern')
        }
      } else {
        const { error } = await database.events.submitUpdate(eventId, payload)
        if (error) throw new Error('Fehler beim Einreichen')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      if (isAdmin) {
        toast({ title: 'Event gespeichert!' })
      } else {
        toast({ title: 'Änderungen eingereicht', description: 'Deine Änderungen werden geprüft und bald übernommen.' })
      }
      router.push(`/events/${eventId}`)
    },
    onError: (err: Error) => {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    },
  })

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
    setImageUploading(true)
    try {
      const result = await uploadCourtImage(file)
      setForm(f => ({ ...f, imageUrl: result.url }))
    } catch {
      toast({ title: 'Bild-Upload fehlgeschlagen', variant: 'destructive' })
      setImagePreview(event?.image_url || null)
    } finally {
      setImageUploading(false)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setForm(f => ({ ...f, imageUrl: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!user) {
    return (
      <div className="container px-4 py-8 max-w-xl mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">Anmeldung erforderlich</h1>
        <Link href="/auth/signin"><Button>Jetzt anmelden</Button></Link>
      </div>
    )
  }

  if (isLoading || !eventId || !formReady) {
    return (
      <div className="container px-4 py-8 max-w-xl mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-12 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  if (event && event.creator_id !== user.id && !isAdmin) {
    return (
      <div className="container px-4 py-8 max-w-xl mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">Keine Berechtigung</h1>
        <p className="text-muted-foreground mb-4">Nur der Ersteller kann dieses Event bearbeiten.</p>
        <Link href={`/events/${eventId}`}><Button variant="outline">Zurück</Button></Link>
      </div>
    )
  }

  return (
    <EventForm
      form={form}
      setForm={setForm}
      errors={errors}
      setErrors={setErrors}
      imagePreview={imagePreview}
      imageUploading={imageUploading}
      fileInputRef={fileInputRef}
      onImageChange={handleImageChange}
      onRemoveImage={removeImage}
      onSelectImageUrl={(url) => { setImagePreview(url); setForm(f => ({ ...f, imageUrl: url })) }}
      organizers={organizers}
      userOrganizer={userOrganizer}
      isAdmin={isAdmin}
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      pageTitle="Event bearbeiten"
      submitLabel="Änderungen speichern"
      pendingLabel="Wird gespeichert…"
      preselectedPlaceId={form.placeId}
      initialCenter={form.inlineLocationCoords ?? undefined}
    />
  )
}

export default function EditEventPage({ params }: EventPageProps) {
  return (
    <Suspense>
      <EditEventContent params={params} />
    </Suspense>
  )
}
