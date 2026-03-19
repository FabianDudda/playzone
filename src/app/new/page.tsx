'use client'

import { useState, useCallback, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import OpeningHoursEditor from '@/components/places/opening-hours-editor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, validateWebsite } from '@/lib/utils'
import { sportIcons } from '@/lib/utils/sport-utils'
import { useToast } from '@/hooks/use-toast'
import { SportType, PlaceWithCourts, OpeningHours } from '@/lib/supabase/types'
import { PlaceType, placeTypeLabels, placeTypeIcons } from '@/lib/utils/sport-utils'
import { database } from '@/lib/supabase/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reverseGeocode, AddressComponents } from '@/lib/geocoding'
import { uploadCourtImage, UploadProgress } from '@/lib/supabase/storage'
import { MapPin, Plus, Upload, X, Image, Loader2, Heart, ArrowLeft, Phone, Mail, Globe } from 'lucide-react'
import Link from 'next/link'

const LeafletCourtMap = dynamic(() => import('@/components/map/leaflet-court-map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Karte wird geladen...</p>
      </div>
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
] as const

const SURFACE_TYPES = [
  'Unbekannt', 'Rasen', 'Kunstrasen', 'Hartplatz', 'Asphalt',
  'Kunststoffbelag', 'Asche', 'Sand', 'Sonstiges',
] as const

interface CourtDetails {
  sport: SportType
  quantity: number
  surface: string
  notes: string
}

function AddPlacePage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const isGuestMode = searchParams.get('guest') === 'true'

  const mapInitialCenter = useMemo(() => {
    const lat = parseFloat(searchParams.get('lat') ?? '')
    const lng = parseFloat(searchParams.get('lng') ?? '')
    return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : undefined
  }, [searchParams])

  const mapInitialZoom = useMemo(() => {
    const zoom = parseInt(searchParams.get('zoom') ?? '')
    return !isNaN(zoom) ? zoom : undefined
  }, [searchParams])

  const { data: places = [] } = useQuery({
    queryKey: ['places'],
    queryFn: () => database.courts.getAllCourts(),
  })

  const [name, setName] = useState('')
  const [placeType, setPlaceType] = useState<PlaceType>('öffentlich')
  const [selectedSports, setSelectedSports] = useState<SportType[]>([])
  const [courtSurfaces, setCourtSurfaces] = useState<Partial<Record<SportType, string[]>>>({})
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState<AddressComponents>({})
  const [isDetectingAddress, setIsDetectingAddress] = useState(false)
  const [addressAutoDetected, setAddressAutoDetected] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  const [description, setDescription] = useState('')
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null)
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactWebsite, setContactWebsite] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [websiteError, setWebsiteError] = useState('')

  const createCourtMutation = useMutation({
    mutationFn: async (placeData: {
      name: string
      place_type: PlaceType
      latitude: number
      longitude: number
      sports: SportType[]
      description?: string
      image_url?: string
      added_by_user: string
      courts: CourtDetails[]
      address?: AddressComponents
      contact_phone?: string | null
      contact_email?: string | null
      contact_website?: string | null
      opening_hours?: OpeningHours | null
    }) => {
      const { data: place, error: placeError } = await database.courts.addCourt({
        name: placeData.name,
        place_type: placeData.place_type,
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        sports: placeData.sports,
        description: placeData.description || null,
        image_url: placeData.image_url || null,
        added_by_user: placeData.added_by_user,
        source: 'user_submitted',
        source_id: null,
        features: null,
        import_date: new Date().toISOString(),
        street: placeData.address?.street || null,
        house_number: placeData.address?.house_number || null,
        city: placeData.address?.city || null,
        county: placeData.address?.county || null,
        state: placeData.address?.state || null,
        country: placeData.address?.country || null,
        postcode: placeData.address?.postcode || null,
        district: placeData.address?.district || null,
        contact_phone: placeData.contact_phone || null,
        contact_email: placeData.contact_email || null,
        contact_website: placeData.contact_website || null,
        opening_hours: placeData.opening_hours ?? null,
      })
      if (placeError || !place) throw new Error(placeError?.message || 'Failed to create place')

      if (placeData.courts.length > 0) {
        await Promise.all(placeData.courts.map(court =>
          database.courtDetails.addCourt({
            place_id: place.id,
            sport: court.sport,
            quantity: court.quantity,
            surface: court.surface || null,
            notes: court.notes || null,
          })
        ))
      }
      return place
    },
    onSuccess: () => {
      toast({ title: 'Ort eingereicht!', description: 'Er erscheint auf der Karte, sobald er genehmigt wurde.' })
      queryClient.invalidateQueries({ queryKey: ['courts'] })
      router.push('/')
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler beim Hinzufügen', description: error.message, variant: 'destructive' })
    },
  })

  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    setLocation({ lat, lng })
    setIsDetectingAddress(true)
    setAddressAutoDetected(false)
    try {
      const addressComponents = await reverseGeocode(lat, lng)
      if (addressComponents) {
        setAddress(addressComponents)
        setAddressAutoDetected(true)
      } else {
        setAddress({})
      }
    } catch {
      setAddress({})
    } finally {
      setIsDetectingAddress(false)
    }
  }, [])

  const handleSportToggle = (sport: SportType) => {
    setSelectedSports(prev => {
      if (prev.includes(sport)) {
        setCourtSurfaces(cur => { const u = { ...cur }; delete u[sport]; return u })
        return prev.filter(s => s !== sport)
      } else {
        setCourtSurfaces(cur => ({ ...cur, [sport]: [''] }))
        return [...prev, sport]
      }
    })
  }

  const addCourtForSport = (sport: SportType) =>
    setCourtSurfaces(prev => ({ ...prev, [sport]: [...(prev[sport] || []), ''] }))

  const updateCourtSurface = (sport: SportType, idx: number, surface: string) =>
    setCourtSurfaces(prev => {
      const surfaces = [...(prev[sport] || [])]
      surfaces[idx] = surface
      return { ...prev, [sport]: surfaces }
    })

  const removeCourtForSport = (sport: SportType, idx: number) =>
    setCourtSurfaces(prev => ({ ...prev, [sport]: (prev[sport] || []).filter((_, i) => i !== idx) }))

  const updateAddressField = (field: keyof AddressComponents, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value.trim() || undefined }))
    if (addressAutoDetected && value.trim()) setAddressAutoDetected(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Datei zu groß', description: 'Max. 10MB.', variant: 'destructive' }); return
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ungültiger Dateityp', description: 'Bitte Bilddatei auswählen.', variant: 'destructive' }); return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user && !isGuestMode) return
    if (!name.trim()) { toast({ title: 'Name erforderlich', variant: 'destructive' }); return }
    if (selectedSports.length === 0) { toast({ title: 'Mindestens eine Sportart auswählen', variant: 'destructive' }); return }
    if (!location) { toast({ title: 'Standort erforderlich', description: 'Tippe auf die Karte, um einen Standort zu setzen.', variant: 'destructive' }); return }

    if (placeType === 'verein' || placeType === 'schule') {
      let hasContactError = false
      if (contactPhone.trim() && /\D/.test(contactPhone.trim())) {
        setPhoneError('Nur Ziffern erlaubt'); hasContactError = true
      } else if (contactPhone.trim() && contactPhone.trim().length < 7) {
        setPhoneError('Telefonnummer zu kurz'); hasContactError = true
      }
      const websiteValidation = validateWebsite(contactWebsite)
      if (websiteValidation) {
        setWebsiteError(websiteValidation); hasContactError = true
      }
      if (hasContactError) return
    }

    let imageUrl: string | undefined
    if (imageFile) {
      try {
        setIsUploadingImage(true)
        setUploadProgress({ loaded: 0, total: 100, percentage: 0 })
        const result = await uploadCourtImage(imageFile, p => setUploadProgress(p))
        imageUrl = result.url
      } catch (err) {
        toast({ title: 'Bild-Upload fehlgeschlagen', description: err instanceof Error ? err.message : '', variant: 'destructive' })
      } finally {
        setIsUploadingImage(false)
        setUploadProgress(null)
      }
    }

    const courts: CourtDetails[] = selectedSports.flatMap(sport => {
      const surfaces = (courtSurfaces[sport] || ['']).map(s => s || 'Unbekannt')
      const counts = surfaces.reduce<Record<string, number>>((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {})
      return Object.entries(counts).map(([surface, quantity]) => ({ sport, quantity, surface, notes: '' }))
    })

    const placePayload = {
      name: name.trim(),
      place_type: placeType,
      latitude: location.lat,
      longitude: location.lng,
      sports: selectedSports,
      description: description.trim() || null,
      image_url: imageUrl,
      courts,
      address: Object.values(address).some(v => v) ? address : undefined,
      contact_phone: (placeType === 'verein' || placeType === 'schule') ? contactPhone.trim() || null : null,
      contact_email: (placeType === 'verein' || placeType === 'schule') ? contactEmail.trim() || null : null,
      contact_website: (placeType === 'verein' || placeType === 'schule') ? contactWebsite.trim() || null : null,
      opening_hours: (placeType === 'verein' || placeType === 'schule') ? openingHours : null,
    }

    if (isGuestMode) {
      try {
        const res = await fetch('/api/guest/submit-place', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(placePayload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Fehler beim Einreichen')
        toast({ title: 'Ort eingereicht!', description: 'Er erscheint auf der Karte, sobald er genehmigt wurde.' })
        queryClient.invalidateQueries({ queryKey: ['courts'] })
        router.push('/')
      } catch (err) {
        toast({ title: 'Fehler beim Hinzufügen', description: err instanceof Error ? err.message : '', variant: 'destructive' })
      }
      return
    }

    createCourtMutation.mutate({
      ...placePayload,
      added_by_user: user!.id,
    })
  }

  if (loading) {
    return (
      <div className="container px-4 py-4 overflow-x-hidden">
        <div className="max-w-xl mx-auto">
          <Card><CardContent className="p-6"><div className="h-24 animate-pulse bg-muted rounded" /></CardContent></Card>
        </div>
      </div>
    )
  }

  if (!user && !isGuestMode) {
    return (
      <div className="container px-4 py-4 overflow-x-hidden">
        <div className="max-w-xl mx-auto space-y-6">
        {/* Placeholder icon */}
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <Heart className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Auth card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Anmelden, um einen Ort hinzuzufügen</h2>
              <p className="text-sm text-muted-foreground">
                Erstelle ein Konto, um Sportplätze und Veranstaltungsorte zur Karte hinzuzufügen.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link href="/auth/signin">Anmelden</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/signup">Registrieren</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full text-muted-foreground">
                <Link href="/new?guest=true">Weiter als Gast</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-2xl font-bold">Ort hinzufügen</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Honeypot – hidden from real users, catches bots */}
          <input type="text" name="website" tabIndex={-1} aria-hidden="true" className="hidden" />

          {/* 1. Name */}
          <div className="space-y-2">
            <Label htmlFor="ap-name">Ortsname *</Label>
            <Input id="ap-name" placeholder="z.B. Stadtpark Tennisplätze" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          {/* 2. Location + Address */}
          <div className="space-y-2">
            <Label>Standort *</Label>
            <p className="text-xs text-muted-foreground">Tippe auf die Karte, um den genauen Standort zu setzen.</p>
            <div className="border rounded-lg overflow-hidden">
              <LeafletCourtMap
                courts={places as PlaceWithCourts[]}
                onMapClick={handleMapClick}
                height="260px"
                allowAddCourt={true}
                selectedLocation={location}
                placesCount={places.length}
                showFilter={false}
                showFavorite={false}
                disableMarkerClick={true}
                initialCenter={mapInitialCenter}
                initialZoom={mapInitialZoom}
                embedded={true}
              />
            </div>
            {location ? (
              isDetectingAddress ? (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>Adresse wird erkannt...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-medium">Standort gesetzt: </span>
                    {(() => {
                      const parts = [
                        [address.street, address.house_number].filter(Boolean).join(' '),
                        [address.postcode, address.city].filter(Boolean).join(' '),
                      ].filter(Boolean)
                      return parts.length > 0 ? parts.join(', ') : `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                    })()}
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="font-medium">Tippe auf die Karte, um den Standort zu setzen</span>
              </div>
            )}
          </div>

          {/* 3. Place Type */}
          <div className="space-y-2">
            <Label>Art des Ortes *</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['öffentlich', 'verein', 'schule'] as PlaceType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPlaceType(type)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer',
                    placeType === type
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  <span className="text-[20px] leading-none">{placeTypeIcons[type]}</span>
                  <span className="text-sm font-medium">{placeTypeLabels[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Sports */}
          <div className="space-y-2">
            <Label>Verfügbare Sportarten *</Label>
            <div className="grid grid-cols-3 gap-2">
              {SPORTS.map(sport => {
                const isSelected = selectedSports.includes(sport.id as SportType)
                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSportToggle(sport.id as SportType)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <span className="text-[20px] leading-none">{sportIcons[sport.id as SportType] || '📍'}</span>
                    <span className="text-sm font-medium">{sport.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Court Details */}
          {selectedSports.length > 0 && (
            <div className="space-y-3">
              <Label>Platz-Details</Label>
              {selectedSports.map(sport => {
                const surfaces = courtSurfaces[sport] || ['Unbekannt']
                const sportLabel = sport.charAt(0).toUpperCase() + sport.slice(1)
                return (
                  <div key={sport} className="space-y-2">
                    {surfaces.map((surface, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground min-w-[8rem]">{sportLabel} Platz {idx + 1}</span>
                        <Select value={surface} onValueChange={val => updateCourtSurface(sport, idx, val)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Belagstyp..." /></SelectTrigger>
                          <SelectContent>
                            {SURFACE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => surfaces.length === 1 ? handleSportToggle(sport) : removeCourtForSport(sport, idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addCourtForSport(sport)}>
                      <Plus className="h-4 w-4 mr-1" />Weiteren Platz hinzufügen
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 5. Image */}
          <div className="space-y-2">
            <Label>Platzbild (Optional)</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              {imagePreview ? (
                <div className="space-y-2">
                  <div className="relative">
                    <img src={imagePreview} alt="Court preview" className="w-full h-40 object-cover rounded-lg" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => { setImageFile(null); setImagePreview(null) }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{imageFile?.name}</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Image className="h-10 w-10 mx-auto text-muted-foreground" />
                  <Button type="button" size="sm" onClick={() => document.getElementById('ap-image-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-1" />Bild hochladen
                  </Button>
                  <Input id="ap-image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP bis 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* 6. Contact (verein/schule) */}
          {(placeType === 'verein' || placeType === 'schule') && (
            <div className="space-y-2">
              <Label>Kontakt (Optional)</Label>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input placeholder="Telefon" value={contactPhone} onChange={e => { setContactPhone(e.target.value); setPhoneError('') }} className={phoneError ? 'border-destructive' : ''} />
                  </div>
                  {phoneError && <p className="text-xs text-destructive pl-6">{phoneError}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input type="email" placeholder="E-Mail" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input placeholder="Website (https://...)" value={contactWebsite} onChange={e => { setContactWebsite(e.target.value); setWebsiteError('') }} className={websiteError ? 'border-destructive' : ''} />
                  </div>
                  {websiteError && <p className="text-xs text-destructive pl-6">{websiteError}</p>}
                </div>
              </div>
            </div>
          )}

          {/* 7. Opening Hours (verein/schule) */}
          {(placeType === 'verein' || placeType === 'schule') && (
            <div className="space-y-2">
              <Label>Öffnungszeiten (Optional)</Label>
              <OpeningHoursEditor
                key="new"
                value={openingHours}
                onChange={setOpeningHours}
              />
            </div>
          )}

          {/* 8. Description */}
          <div className="space-y-2">
            <Label htmlFor="ap-description">Beschreibung (Optional)</Label>
            <Textarea
              id="ap-description"
              placeholder="z.B. Öffentlicher Platz mit guter Beleuchtung, direkt am Park..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={createCourtMutation.isPending || isUploadingImage}>
            {isUploadingImage ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Hochladen... {uploadProgress && `${uploadProgress.percentage.toFixed(0)}%`}</>
            ) : createCourtMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Hinzufügen...</>
            ) : 'Ort hinzufügen'}
          </Button>

          {isUploadingImage && uploadProgress && (
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.percentage}%` }} />
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default function AddPlacePageWrapper() {
  return (
    <Suspense>
      <AddPlacePage />
    </Suspense>
  )
}
