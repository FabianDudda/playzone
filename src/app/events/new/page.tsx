'use client'

import { Suspense, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { uploadCourtImage } from '@/lib/supabase/storage'
import { useToast } from '@/hooks/use-toast'
import { Organizer } from '@/lib/supabase/types'
import EventForm, { EventFormState, EventFormErrors } from '@/components/events/event-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Handshake } from 'lucide-react'
import Link from 'next/link'

function NewEventContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, isAdmin } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const preselectedPlaceId = searchParams.get('place') || ''

  const [form, setForm] = useState<EventFormState>({
    title: '',
    sports: [],
    locationMode: 'existing',
    placeId: preselectedPlaceId,
    inlineLocationName: '',
    inlineLocationAddress: {},
    inlineLocationCoords: null,
    schedule: { type: 'dates', dates: [{ date: '', start_time: '', end_time: '' }] },
    description: '',
    contact: {
      name: profile?.name || '',
      email: user?.email || '',
    },
    imageUrl: null,
    locationType: null,
    ageRestriction: { type: 'all' },
    genderRestriction: 'all',
    organizerIds: [],
  })

  const [errors, setErrors] = useState<EventFormErrors>({})

  const { data: organizers = [] } = useQuery<Organizer[]>({
    queryKey: ['organizers'],
    queryFn: () => database.organizers.getAll(),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  const { data: userOrganizer = null, isLoading: isLoadingOrganizer } = useQuery({
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

      const placeId = form.placeId || null
      const inlineLocation = form.locationMode === 'inline' && form.inlineLocationCoords
        ? {
            name: form.inlineLocationName.trim(),
            latitude: form.inlineLocationCoords.lat,
            longitude: form.inlineLocationCoords.lng,
            ...form.inlineLocationAddress,
          }
        : null

      // Guest flow — API route with service role key
      if (!user) {
        const res = await fetch('/api/guest/submit-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            event_type: 'session',
            place_id: placeId,
            sports: form.sports,
            schedule: form.schedule,
            contact: {},
            image_url: form.imageUrl,
            inline_location: inlineLocation,
            location_type: form.locationType,
            age_restriction: form.ageRestriction,
            gender_restriction: form.genderRestriction,
            organizer_id: form.organizerIds[0] ?? null,
            organizer_ids: form.organizerIds,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Fehler beim Einreichen des Events')
        return json
      }

      // Logged-in flow
      const { data, error } = await database.events.createEvent({
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: 'session',
        place_id: placeId,
        sports: form.sports,
        schedule: form.schedule,
        contact: {},
        image_url: form.imageUrl,
        creator_id: user.id,
        status: 'active',
        moderation_status: isAdmin ? 'approved' : 'pending',
        organizer_id: form.organizerIds[0] ?? null,
        organizer_ids: form.organizerIds,
        inline_location: inlineLocation,
        location_type: form.locationType,
        age_restriction: form.ageRestriction,
        gender_restriction: form.genderRestriction,
      })

      if (error) throw new Error('Fehler beim Erstellen des Events')
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast({ title: isAdmin ? 'Event erstellt!' : 'Event eingereicht!', description: isAdmin ? undefined : 'Dein Event wird geprüft und bald freigeschaltet.' })
      router.push(data?.id ? `/events/${data.id}` : '/events')
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
      setImagePreview(null)
    } finally {
      setImageUploading(false)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setForm(f => ({ ...f, imageUrl: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (user && !isAdmin && !isLoadingOrganizer && userOrganizer === null) {
    return (
      <div className="container px-4 py-8 max-w-xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Handshake className="h-10 w-10 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold mb-1">Veranstalter-Profil erforderlich</h3>
              <p className="text-sm text-muted-foreground">
                Richte zuerst dein Veranstalter-Profil ein, bevor du Events erstellen kannst.
              </p>
            </div>
            <Button asChild>
              <Link href="/events/mine">Zum Veranstalter-Profil</Link>
            </Button>
          </CardContent>
        </Card>
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
      pageTitle="Neues Event erstellen"
      submitLabel="Event einreichen"
      pendingLabel="Wird eingereicht…"
      preselectedPlaceId={preselectedPlaceId}
    />
  )
}

export default function NewEventPage() {
  return (
    <Suspense>
      <NewEventContent />
    </Suspense>
  )
}
