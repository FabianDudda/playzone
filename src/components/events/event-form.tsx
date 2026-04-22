'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ImagePlus, X, MapPin, Loader2, Info } from 'lucide-react'
import { SportType, EventSchedule, EventContact, LocationType, AgeRestriction, GenderRestriction, Organizer } from '@/lib/supabase/types'
import { database } from '@/lib/supabase/database'
import { AddressComponents, reverseGeocode } from '@/lib/geocoding'
import { sportIcons } from '@/lib/utils/sport-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ScheduleEditor from '@/components/events/schedule-editor'
import ContactEditor from '@/components/events/contact-editor'
import PlaceMapSelector from '@/components/events/place-map-selector'
import dynamic from 'next/dynamic'

const LeafletCourtMap = dynamic(() => import('@/components/map/leaflet-court-map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
    </div>
  ),
})

const SPORTS = [
  { id: 'calisthenics', label: 'Calisthenics' },
  { id: 'fußball', label: 'Fußball' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'skatepark', label: 'Skatepark' },
  { id: 'tischtennis', label: 'Tischtennis' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'laufen', label: 'Laufen' },
  { id: 'schwimmen', label: 'Schwimmen' },
  { id: 'klettern', label: 'Klettern' },
  { id: 'volleyball', label: 'Volleyball' },
  { id: 'beachvolleyball', label: 'Beachvolleyball' },
  { id: 'boule', label: 'Boule' },
  { id: 'padel', label: 'Padel' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'hockey', label: 'Hockey' },
  { id: 'schach', label: 'Schach' },
  { id: 'parkour', label: 'Parkour' },
  { id: 'rugby', label: 'Rugby' },
  { id: 'inliner', label: 'Inliner' },
  { id: 'discgolf', label: 'Discgolf' },
  { id: 'bmx', label: 'BMX' },
  { id: 'dirtbike', label: 'Dirtbike' },
] as const

export interface EventFormState {
  title: string
  sports: SportType[]
  locationMode: 'existing' | 'inline'
  placeId: string
  inlineLocationName: string
  inlineLocationAddress: AddressComponents
  inlineLocationCoords: { lat: number; lng: number } | null
  schedule: EventSchedule
  description: string
  contact: EventContact
  imageUrl: string | null
  locationType: LocationType | null
  ageRestriction: AgeRestriction
  genderRestriction: GenderRestriction
  organizerIds: string[]
}

export type EventFormErrors = Partial<Record<keyof EventFormState, string>>

interface EventFormProps {
  form: EventFormState
  setForm: React.Dispatch<React.SetStateAction<EventFormState>>
  errors: EventFormErrors
  setErrors: React.Dispatch<React.SetStateAction<EventFormErrors>>

  imagePreview: string | null
  imageUploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onSelectImageUrl: (url: string) => void

  organizers: Organizer[]
  isAdmin: boolean

  onSubmit: () => void
  isPending: boolean

  pageTitle: string
  submitLabel: string
  pendingLabel: string

  preselectedPlaceId: string
  initialCenter?: { lat: number; lng: number }
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold">{children}</h2>
}

export default function EventForm({
  form, setForm, errors, setErrors,
  imagePreview, imageUploading, fileInputRef, onImageChange, onRemoveImage, onSelectImageUrl,
  organizers, isAdmin,
  onSubmit, isPending,
  pageTitle, submitLabel, pendingLabel,
  preselectedPlaceId, initialCenter,
}: EventFormProps) {
  const router = useRouter()
  const [isDetectingAddress, setIsDetectingAddress] = useState(false)

  const { data: organizerImages = [] } = useQuery({
    queryKey: ['organizer-images-for-event', form.organizerIds],
    queryFn: () => database.organizers.getImagesForMany(form.organizerIds),
    enabled: form.organizerIds.length > 0,
    staleTime: 60_000,
  })

  return (
    <div className="container px-4 py-4 max-w-xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
      </div>

      <div className="space-y-8">

        {/* ── Grundinfo ── */}
        <div className="space-y-4">
          <SectionHeading>Grundinfo</SectionHeading>

          <div>
            <Label htmlFor="title" className="text-sm font-medium">Titel *</Label>
            <Input
              id="title"
              placeholder="z.B. Calisthenics Training Montag"
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(e => ({ ...e, title: undefined })) }}
              className="mt-1"
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              placeholder="Was erwartet die Teilnehmer? Voraussetzungen, Infos zum Ablauf, …"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Titelbild (optional)</Label>
            {imagePreview ? (
              <div className="relative h-40 rounded-lg overflow-hidden">
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={onRemoveImage}
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
                <span className="text-sm text-muted-foreground">Bild hochladen (Querformat empfohlen)</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImageChange}
            />
            {organizerImages.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Bilder der Veranstalter</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {organizerImages.map(img => {
                    const isSelected = form.imageUrl === img.url
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => onSelectImageUrl(img.url)}
                        className={cn(
                          'relative flex-shrink-0 w-28 aspect-video rounded-md overflow-hidden border-2 transition-colors',
                          isSelected ? 'border-primary' : 'border-transparent hover:border-primary/50'
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <hr className="border-border" />

        {/* ── Sport & Ort ── */}
        <div className="space-y-4">
          <SectionHeading>Sport & Ort</SectionHeading>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, locationMode: 'existing', sports: [], inlineLocationCoords: null, inlineLocationAddress: {} }))}
              className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form.locationMode === 'existing'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" /> Auf der Karte</span>
              <span className="text-xs font-normal opacity-70">Anlage bereits eingetragen</span>
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, locationMode: 'inline', sports: [], placeId: '' }))}
              className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form.locationMode === 'inline'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" /> Nicht auf der Karte</span>
              <span className="text-xs font-normal opacity-70">Park, privat, temporär, …</span>
            </button>
          </div>

          {form.locationMode === 'existing' ? (
            <>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Nutze immer einen eingetragenen Ort, wenn möglich. Fehlt eine öffentliche Anlage (Verein, Schule, …)?{' '}
                  <a href="/new" className="underline hover:text-foreground">Ort zuerst anlegen.</a>
                </span>
              </div>
              <PlaceMapSelector
                selectedPlaceId={form.placeId}
                preSelectedPlaceId={preselectedPlaceId}
                onPlaceSelect={(id) => { setForm(f => ({ ...f, placeId: id })); setErrors(e => ({ ...e, placeId: undefined })) }}
                selectedSports={form.sports}
                onSportsChange={(sports) => { setForm(f => ({ ...f, sports })); setErrors(e => ({ ...e, sports: undefined })) }}
                height="280px"
              />
              {errors.placeId && <p className="text-xs text-destructive">{errors.placeId}</p>}
              {errors.sports && <p className="text-xs text-destructive">{errors.sports}</p>}
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="inlineLocationName" className="text-sm font-medium">Name des Ortes *</Label>
                <Input
                  id="inlineLocationName"
                  placeholder="z.B. Stadtpark Südwiese"
                  value={form.inlineLocationName}
                  onChange={e => { setForm(f => ({ ...f, inlineLocationName: e.target.value })); setErrors(e => ({ ...e, placeId: undefined })) }}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">Ort auf Karte markieren *</Label>
                <div className="rounded-lg overflow-hidden border" style={{ height: '220px' }}>
                  <LeafletCourtMap
                    courts={[]}
                    onMapClick={async (lng: number, lat: number) => {
                      setForm(f => ({ ...f, inlineLocationCoords: { lat, lng }, inlineLocationAddress: {} }))
                      setErrors(e => ({ ...e, placeId: undefined }))
                      setIsDetectingAddress(true)
                      try {
                        const components = await reverseGeocode(lat, lng)
                        if (components) setForm(f => ({ ...f, inlineLocationAddress: components }))
                      } catch { /* best-effort */ } finally {
                        setIsDetectingAddress(false)
                      }
                    }}
                    allowAddCourt
                    selectedLocation={form.inlineLocationCoords ?? undefined}
                    initialCenter={initialCenter}
                    height="220px"
                    showFilter={false}
                    showFavorite={false}
                    embedded
                  />
                </div>
                {form.inlineLocationCoords ? (
                  isDetectingAddress ? (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200 mt-2">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      <span>Adresse wird erkannt...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg border border-green-200 mt-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>
                        <span className="font-medium">Standort gesetzt: </span>
                        {(() => {
                          const a = form.inlineLocationAddress
                          const parts = [
                            [a.street, a.house_number].filter(Boolean).join(' '),
                            [a.postcode, a.city].filter(Boolean).join(' '),
                          ].filter(Boolean)
                          return parts.length > 0 ? parts.join(', ') : `${form.inlineLocationCoords!.lat.toFixed(5)}, ${form.inlineLocationCoords!.lng.toFixed(5)}`
                        })()}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Tippe auf die Karte, um den Standort zu setzen</span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">Sportart *</Label>
                <div className="flex flex-wrap gap-2">
                  {SPORTS.map(sport => {
                    const isSelected = form.sports.includes(sport.id as SportType)
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => {
                          const id = sport.id as SportType
                          setForm(f => ({
                            ...f,
                            sports: f.sports.includes(id) ? f.sports.filter(s => s !== id) : [...f.sports, id],
                          }))
                          setErrors(e => ({ ...e, sports: undefined }))
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 pl-3 pr-3.5 h-9 rounded-full text-sm font-medium border transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        )}
                      >
                        <span>{sportIcons[sport.id as SportType] || '📍'}</span>
                        <span>{sport.label}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.sports && <p className="text-xs text-destructive mt-1">{errors.sports}</p>}
              </div>

              {errors.placeId && <p className="text-xs text-destructive">{errors.placeId}</p>}
            </>
          )}

          {/* Umgebung */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Umgebung (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {([['indoor', '🏠', 'Indoor'], ['outdoor', '☀️', 'Outdoor'], ['both', '↔️', 'Beides']] as const).map(([val, icon, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, locationType: f.locationType === val ? null : val }))}
                  className={cn(
                    'inline-flex items-center gap-1 pl-3 pr-3.5 h-9 rounded-full text-sm font-medium border transition-colors',
                    form.locationType === val
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* ── Wann ── */}
        <div className="space-y-4">
          <SectionHeading>Wann</SectionHeading>
          <ScheduleEditor
            value={form.schedule}
            onChange={s => { setForm(f => ({ ...f, schedule: s })); setErrors(e => ({ ...e, schedule: undefined })) }}
          />
          {errors.schedule && <p className="text-xs text-destructive">{errors.schedule}</p>}
        </div>

        <hr className="border-border" />

        {/* ── Teilnehmer ── */}
        <div className="space-y-4">
          <SectionHeading>Teilnehmer</SectionHeading>

          <div>
            <Label className="text-sm font-medium mb-2 block">Geschlecht</Label>
            <div className="flex flex-wrap gap-2">
              {([['all', 'Alle'], ['male', 'Nur Männer'], ['female', 'Nur Frauen']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, genderRestriction: val }))}
                  className={cn(
                    'inline-flex items-center pl-3 pr-3.5 h-9 rounded-full text-sm font-medium border transition-colors',
                    form.genderRestriction === val
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Alter</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {([['all', 'Alle'], ['min', 'Ab X Jahren'], ['range', 'X – Y Jahre']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, ageRestriction: { type: val } }))}
                  className={cn(
                    'inline-flex items-center pl-3 pr-3.5 h-9 rounded-full text-sm font-medium border transition-colors',
                    form.ageRestriction.type === val
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.ageRestriction.type === 'min' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={99}
                  placeholder="16"
                  value={form.ageRestriction.min ?? ''}
                  onChange={e => setForm(f => ({ ...f, ageRestriction: { type: 'min', min: Number(e.target.value) || undefined } }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">Jahre und älter</span>
              </div>
            )}
            {form.ageRestriction.type === 'range' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={99}
                  placeholder="16"
                  value={form.ageRestriction.min ?? ''}
                  onChange={e => setForm(f => ({ ...f, ageRestriction: { ...f.ageRestriction, type: 'range', min: Number(e.target.value) || undefined } }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">bis</span>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  placeholder="24"
                  value={form.ageRestriction.max ?? ''}
                  onChange={e => setForm(f => ({ ...f, ageRestriction: { ...f.ageRestriction, type: 'range', max: Number(e.target.value) || undefined } }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">Jahre</span>
              </div>
            )}
          </div>
        </div>

        <hr className="border-border" />

        {/* ── Kontakt ── */}
        <div className="space-y-4">
          <SectionHeading>Kontakt</SectionHeading>

          <ContactEditor
            value={form.contact}
            onChange={c => setForm(f => ({ ...f, contact: c }))}
          />

          {isAdmin && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Veranstalter <span className="text-xs opacity-60">(Admin)</span>
              </Label>
              <select
                value=""
                onChange={e => {
                  const id = e.target.value
                  if (id && !form.organizerIds.includes(id))
                    setForm(f => ({ ...f, organizerIds: [...f.organizerIds, id] }))
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Veranstalter hinzufügen…</option>
                {organizers.filter(o => !form.organizerIds.includes(o.id)).map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              {form.organizerIds.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {form.organizerIds.map(id => {
                    const o = organizers.find(o => o.id === id)
                    if (!o) return null
                    return (
                      <div key={id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                        <div
                          className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: o.color || '#6366F1' }}
                        >
                          {o.logo_url
                            ? <img src={o.logo_url} alt={o.name} className="h-7 w-7 rounded-full object-contain" />
                            : o.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{o.name}</p>
                          {o.website && <p className="text-xs text-muted-foreground truncate">{o.website}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, organizerIds: f.organizerIds.filter(i => i !== id) }))}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={onSubmit}
          disabled={isPending || imageUploading}
        >
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  )
}
