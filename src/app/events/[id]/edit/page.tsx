'use client'

import { Suspense, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { uploadCourtImage } from '@/lib/supabase/storage'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SportType, EventSchedule, EventContact } from '@/lib/supabase/types'
import { SPORT_ORDER, sportNames, sportIcons } from '@/lib/utils/sport-utils'
import ScheduleEditor from '@/components/events/schedule-editor'
import ContactEditor from '@/components/events/contact-editor'
import PlaceMapSelector from '@/components/events/place-map-selector'

const AVAILABLE_SPORTS = SPORT_ORDER.filter(s => s !== 'other') as SportType[]

interface EventPageProps {
  params: Promise<{ id: string }>
}

function EditEventContent({ params }: EventPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [eventId, setEventId] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formReady, setFormReady] = useState(false)

  const [form, setForm] = useState<{
    title: string
    sport: SportType | ''
    placeId: string
    schedule: EventSchedule
    description: string
    contact: EventContact
    imageUrl: string | null
  }>({
    title: '',
    sport: '',
    placeId: '',
    schedule: { type: 'once', dates: [{ date: '', time: '' }] },
    description: '',
    contact: {},
    imageUrl: null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  React.useEffect(() => {
    params.then(p => setEventId(p.id))
  }, [params])

  const { isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => database.events.getEvent(eventId, user?.id),
    enabled: !!eventId,
    staleTime: 0,
    select: (data) => {
      if (data && !formReady) {
        setForm({
          title: data.title,
          sport: data.sport,
          placeId: data.place_id,
          schedule: data.schedule,
          description: data.description || '',
          contact: data.contact || {},
          imageUrl: data.image_url,
        })
        if (data.image_url) setImagePreview(data.image_url)
        setFormReady(true)
      }
      return data
    },
  })

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => database.events.getEvent(eventId, user?.id),
    enabled: !!eventId,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const errs: Record<string, string> = {}
      if (!form.title.trim()) errs.title = 'Titel ist erforderlich'
      if (!form.sport) errs.sport = 'Sportart ist erforderlich'
      if (!form.placeId) errs.placeId = 'Bitte wähle einen Ort aus'
      if (form.schedule.type !== 'recurring' && form.schedule.dates.some(d => !d.date || !d.start_time || !d.end_time)) {
        errs.schedule = 'Bitte alle Datum- und Zeitfelder ausfüllen'
      }
      if (form.schedule.type === 'recurring' && form.schedule.slots.length === 0) {
        errs.schedule = 'Bitte mindestens einen Wochentag auswählen'
      }
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        throw new Error('Bitte fülle alle Pflichtfelder aus')
      }

      const { error } = await database.events.updateEvent(eventId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        place_id: form.placeId,
        sport: form.sport as SportType,
        schedule: form.schedule,
        contact: form.contact,
        image_url: form.imageUrl,
      })

      if (error) throw new Error('Fehler beim Speichern')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      toast({ title: 'Event gespeichert!' })
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

  if (event && event.creator_id !== user.id) {
    return (
      <div className="container px-4 py-8 max-w-xl mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">Keine Berechtigung</h1>
        <p className="text-muted-foreground mb-4">Nur der Ersteller kann dieses Event bearbeiten.</p>
        <Link href={`/events/${eventId}`}><Button variant="outline">Zurück</Button></Link>
      </div>
    )
  }

  return (
    <div className="container px-4 py-4 max-w-xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Event bearbeiten</h1>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <Label htmlFor="title" className="text-sm font-medium">Titel *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(e => ({ ...e, title: '' })) }}
            className="mt-1"
          />
          {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
        </div>

        {/* Place + Sport */}
        <div>
          <Label className="text-sm font-medium">Ort *</Label>
          <PlaceMapSelector
            selectedPlaceId={form.placeId}
            preSelectedPlaceId={form.placeId}
            onPlaceSelect={(id) => { setForm(f => ({ ...f, placeId: id })); setErrors(e => ({ ...e, placeId: '' })) }}
            selectedSport={form.sport}
            onSportSelect={(sport) => { setForm(f => ({ ...f, sport })); setErrors(e => ({ ...e, sport: '' })) }}
            height="280px"
          />
          {errors.placeId && <p className="text-xs text-destructive mt-1">{errors.placeId}</p>}
          {errors.sport && <p className="text-xs text-destructive mt-1">{errors.sport}</p>}
        </div>

        {/* Schedule */}
        <div>
          <Label className="text-sm font-medium">Datum & Uhrzeit *</Label>
          <div className="mt-2">
            <ScheduleEditor
              value={form.schedule}
              onChange={s => { setForm(f => ({ ...f, schedule: s })); setErrors(e => ({ ...e, schedule: '' })) }}
            />
          </div>
          {errors.schedule && <p className="text-xs text-destructive mt-1">{errors.schedule}</p>}
        </div>

        {/* Contact */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Kontaktdaten</Label>
          <ContactEditor
            value={form.contact}
            onChange={c => setForm(f => ({ ...f, contact: c }))}
          />
        </div>

        {/* Cover image */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Titelbild (optional)</Label>
          {imagePreview ? (
            <div className="relative h-40 rounded-lg overflow-hidden">
              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={removeImage}
                className="absolute top-2 right-2 h-7 w-7"
              >
                <X className="h-3 w-3" />
              </Button>
              {imageUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
            >
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Bild hochladen</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-sm font-medium">Beschreibung (optional)</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            className="mt-1"
          />
        </div>

        <Button
          className="w-full"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || imageUploading}
        >
          {mutation.isPending ? 'Wird gespeichert…' : 'Änderungen speichern'}
        </Button>
      </div>
    </div>
  )
}

export default function EditEventPage({ params }: EventPageProps) {
  return (
    <Suspense>
      <EditEventContent params={params} />
    </Suspense>
  )
}
