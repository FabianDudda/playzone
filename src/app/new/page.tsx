'use client'

import { useState, useCallback, useMemo, Suspense } from 'react'
import { ATTRIBUTE_DEFINITIONS, getRelevantAttributes } from '@/lib/attributes/definitions'
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
import { sportIcons, sportNames } from '@/lib/utils/sport-utils'
import { useToast } from '@/hooks/use-toast'
import { SportType, PlaceWithCourts, OpeningHours } from '@/lib/supabase/types'
import { PlaceType, placeTypeLabels, placeTypeIcons } from '@/lib/utils/sport-utils'
import { database } from '@/lib/supabase/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reverseGeocode, AddressComponents } from '@/lib/geocoding'
import { uploadCourtImage } from '@/lib/supabase/storage'
import { MapPin, Plus, Upload, X, Image, Loader2, ArrowLeft, Phone, Mail, Globe, Camera } from 'lucide-react'
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
  { id: 'schach', label: 'Schach' },
  { id: 'parkour', label: 'Parkour' },
  { id: 'rugby', label: 'Rugby' },
  { id: 'inliner', label: 'Inliner' },
  { id: 'discgolf', label: 'Discgolf' },
  { id: 'bmx', label: 'BMX' },
  { id: 'dirtbike', label: 'Dirtbike' },
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
  customSportName?: string
  attributes?: Record<string, boolean>
}

function AddPlacePage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const isGuestMode = !user || searchParams.get('guest') === 'true'

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
  const [customSports, setCustomSports] = useState<string[]>([])
  const [customSportInput, setCustomSportInput] = useState('')
  const [showCustomSportInput, setShowCustomSportInput] = useState(false)
  const [courtSurfaces, setCourtSurfaces] = useState<Record<string, string[]>>({})
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState<AddressComponents>({})
  const [isDetectingAddress, setIsDetectingAddress] = useState(false)
  const [addressAutoDetected, setAddressAutoDetected] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [uploadStep, setUploadStep] = useState(0)

  const MAX_IMAGES = 5

  const [description, setDescription] = useState('')
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null)
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactWebsite, setContactWebsite] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [websiteError, setWebsiteError] = useState('')
  const [placeAttributes, setPlaceAttributes] = useState<Record<string, boolean>>({})
  const [courtAttributesBySport, setCourtAttributesBySport] = useState<Record<string, Record<string, boolean>[]>>({})

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
      all_images?: { path: string; url: string }[]
      placeAttributes?: Record<string, boolean>
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

      const createdCourts: { id: string; sport: string }[] = []
      if (placeData.courts.length > 0) {
        const results = await Promise.all(placeData.courts.map(court =>
          database.courtDetails.addCourt({
            place_id: place.id,
            sport: court.sport,
            quantity: court.quantity,
            surface: court.surface || null,
            notes: court.notes || null,
            custom_sport_name: court.customSportName || null,
          })
        ))
        for (const r of results) {
          if (r.data) createdCourts.push({ id: r.data.id, sport: r.data.sport })
        }
      }

      if (placeData.placeAttributes) {
        await database.attributes.savePlaceAttributes(place.id, placeData.placeAttributes)
      }

      // Save per-court attributes (createdCourts[i] corresponds to courts[i])
      if (createdCourts.length > 0) {
        await Promise.all(
          createdCourts.map((c, i) => {
            const attrs = placeData.courts[i]?.attributes
            if (attrs) return database.attributes.saveCourtAttributes([c.id], attrs)
          }).filter(Boolean)
        )
      }

      if (placeData.all_images && placeData.all_images.length > 0) {
        await Promise.all(placeData.all_images.map((img, i) =>
          database.community.insertPlaceImage(place.id, img.path, img.url, i === 0, i, placeData.added_by_user)
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
        setCourtAttributesBySport(cur => { const u = { ...cur }; delete u[sport]; return u })
        return prev.filter(s => s !== sport)
      } else {
        setCourtSurfaces(cur => ({ ...cur, [sport]: [''] }))
        setCourtAttributesBySport(cur => ({ ...cur, [sport]: [{}] }))
        return [...prev, sport]
      }
    })
  }

  const addCourtForSport = (sport: string) => {
    setCourtSurfaces(prev => ({ ...prev, [sport]: [...(prev[sport] || []), ''] }))
    setCourtAttributesBySport(prev => ({ ...prev, [sport]: [...(prev[sport] ?? []), {}] }))
  }

  const updateCourtSurface = (sport: string, idx: number, surface: string) =>
    setCourtSurfaces(prev => {
      const surfaces = [...(prev[sport] || [])]
      surfaces[idx] = surface
      return { ...prev, [sport]: surfaces }
    })

  const removeCourtForSport = (sport: string, idx: number, isCustom = false) => {
    const surfaces = courtSurfaces[sport] || []
    if (surfaces.length === 1) {
      if (isCustom) {
        handleCustomSportRemove(sport)
      } else {
        handleSportToggle(sport as SportType)
      }
    } else {
      setCourtSurfaces(prev => ({ ...prev, [sport]: surfaces.filter((_, i) => i !== idx) }))
      setCourtAttributesBySport(prev => ({ ...prev, [sport]: (prev[sport] ?? []).filter((_, i) => i !== idx) }))
    }
  }

  const handleCustomSportAdd = () => {
    const name = customSportInput.trim()
    if (!name || customSports.includes(name)) return
    setCustomSports(prev => [...prev, name])
    setCourtSurfaces(prev => ({ ...prev, [name]: [''] }))
    setCourtAttributesBySport(prev => ({ ...prev, [name]: [{}] }))
    setCustomSportInput('')
    setShowCustomSportInput(false)
  }

  const handleCustomSportRemove = (name: string) => {
    setCustomSports(prev => prev.filter(s => s !== name))
    setCourtSurfaces(prev => { const u = { ...prev }; delete u[name]; return u })
    setCourtAttributesBySport(prev => { const u = { ...prev }; delete u[name]; return u })
  }

  const updateAddressField = (field: keyof AddressComponents, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value.trim() || undefined }))
    if (addressAutoDetected && value.trim()) setAddressAutoDetected(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, MAX_IMAGES - imageFiles.length)
    const valid = selected.filter(f => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > 10 * 1024 * 1024) return false
      return true
    })
    if (valid.length < selected.length) {
      toast({ title: 'Einige Dateien übersprungen', description: 'Nur Bilder bis 10 MB erlaubt.', variant: 'destructive' })
    }
    setImageFiles(prev => [...prev, ...valid])
    setImagePreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(imagePreviews[idx])
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user && !isGuestMode) return
    if (!name.trim()) { toast({ title: 'Name erforderlich', variant: 'destructive' }); return }
    if (selectedSports.length === 0 && customSports.length === 0) { toast({ title: 'Mindestens eine Sportart auswählen', variant: 'destructive' }); return }
    if (!location) { toast({ title: 'Standort erforderlich', description: 'Tippe auf die Karte, um einen Standort zu setzen.', variant: 'destructive' }); return }

    {
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
    const allUploadedImages: { path: string; url: string }[] = []

    if (imageFiles.length > 0) {
      setIsUploadingImages(true)
      try {
        for (let i = 0; i < imageFiles.length; i++) {
          setUploadStep(i + 1)
          const result = await uploadCourtImage(imageFiles[i])
          allUploadedImages.push({ path: result.path, url: result.url })
          if (i === 0) imageUrl = result.url
        }
      } catch (err) {
        toast({ title: 'Bild-Upload fehlgeschlagen', description: err instanceof Error ? err.message : '', variant: 'destructive' })
        return
      } finally {
        setIsUploadingImages(false)
        setUploadStep(0)
      }
    }

    // One record per UI row (quantity=1), with attributes embedded per court
    const courts: CourtDetails[] = [
      ...selectedSports.flatMap(sport => {
        const surfaces = (courtSurfaces[sport] || ['']).map(s => s || 'Unbekannt')
        const attrsArr = courtAttributesBySport[sport] ?? []
        return surfaces.map((surface, idx) => ({ sport, quantity: 1, surface, notes: '', attributes: attrsArr[idx] ?? {} }))
      }),
      ...customSports.flatMap(name => {
        const surfaces = (courtSurfaces[name] || ['']).map(s => s || 'Unbekannt')
        return surfaces.map((surface) => ({ sport: 'other' as SportType, quantity: 1, surface, notes: '', customSportName: name }))
      }),
    ]

    const placePayload = {
      name: name.trim(),
      place_type: placeType,
      latitude: location.lat,
      longitude: location.lng,
      sports: [...selectedSports, ...(customSports.length > 0 ? ['other' as SportType] : [])],
      description: description.trim() || null,
      image_url: imageUrl,
      courts,
      address: Object.values(address).some(v => v) ? address : undefined,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_website: contactWebsite.trim() || null,
      opening_hours: openingHours,
    }

    if (isGuestMode) {
      try {
        const res = await fetch('/api/guest/submit-place', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...placePayload,
            all_images: allUploadedImages,
            placeAttributes,
          }),
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
      all_images: allUploadedImages,
      placeAttributes,
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

            {/* Custom sports chips */}
            {customSports.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {customSports.map(name => (
                  <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary bg-primary text-primary-foreground text-sm font-medium">
                    🏅 {name}
                    <button type="button" onClick={() => handleCustomSportRemove(name)} className="ml-0.5 opacity-70 hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Other sport input */}
            {showCustomSportInput ? (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  autoFocus
                  placeholder="Sportart eingeben..."
                  value={customSportInput}
                  onChange={e => setCustomSportInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCustomSportAdd() } if (e.key === 'Escape') { setShowCustomSportInput(false); setCustomSportInput('') } }}
                  className="flex-1"
                />
                <Button type="button" size="sm" onClick={handleCustomSportAdd} disabled={!customSportInput.trim()}>Hinzufügen</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowCustomSportInput(false); setCustomSportInput('') }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomSportInput(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                <Plus className="h-4 w-4" />
                Andere Sportart hinzufügen
              </button>
            )}
          </div>

          {/* Court Details */}
          {(selectedSports.length > 0 || customSports.length > 0) && (
            <div className="space-y-4">
              <Label>Platz-Details</Label>
              {selectedSports.map(sport => {
                const surfaces = courtSurfaces[sport] || ['Unbekannt']
                const sportLabel = sportNames[sport] || sport.charAt(0).toUpperCase() + sport.slice(1)
                const courtAttrs = getRelevantAttributes('court', [sport as SportType])
                return (
                  <div key={sport} className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{sportIcons[sport] || '🏅'}</span>
                      <span className="text-sm font-medium">{sportLabel}</span>
                    </div>
                    {surfaces.map((surface, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[4rem]">Platz {idx + 1}</span>
                          <Select value={surface} onValueChange={val => updateCourtSurface(sport, idx, val)}>
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Untergrund wählen" /></SelectTrigger>
                            <SelectContent>
                              {SURFACE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeCourtForSport(sport, idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {courtAttrs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {courtAttrs.map(def => {
                              const active = !!(courtAttributesBySport[sport]?.[idx]?.[def.key])
                              return (
                                <button
                                  key={def.key}
                                  type="button"
                                  onClick={() => setCourtAttributesBySport(prev => {
                                    const arr = [...(prev[sport] ?? [])]
                                    while (arr.length <= idx) arr.push({})
                                    arr[idx] = { ...arr[idx], [def.key]: !arr[idx][def.key] }
                                    return { ...prev, [sport]: arr }
                                  })}
                                  className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all',
                                    active
                                      ? 'border-primary bg-primary/10 text-foreground'
                                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                  )}
                                >
                                  <span className={cn('h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center',
                                    active ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                                  )}>
                                    {active && <span className="text-[9px] text-primary-foreground font-bold leading-none">✓</span>}
                                  </span>
                                  {def.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addCourtForSport(sport)}>
                      <Plus className="h-4 w-4 mr-1" />Weiteren {sportLabel} Platz hinzufügen
                    </Button>
                  </div>
                )
              })}
              {customSports.map(name => {
                const surfaces = courtSurfaces[name] || ['']
                return (
                  <div key={name} className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">🏅</span>
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    {surfaces.map((surface, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground min-w-[4rem]">Platz {idx + 1}</span>
                        <Select value={surface || 'Unbekannt'} onValueChange={val => updateCourtSurface(name, idx, val)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Untergrund wählen" /></SelectTrigger>
                          <SelectContent>
                            {SURFACE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCourtForSport(name, idx, true)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addCourtForSport(name)}>
                      <Plus className="h-4 w-4 mr-1" />Weiteren {name} Platz hinzufügen
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 5. Place-level attributes (Anlage) */}
          {(() => {
            const placeLevel = ATTRIBUTE_DEFINITIONS.filter(d => d.scope === 'place')
            if (placeLevel.length === 0) return null
            return (
              <div className="space-y-2">
                <Label>Anlage</Label>
                <div className="flex flex-wrap gap-2">
                  {placeLevel.map(def => {
                    const active = !!placeAttributes[def.key]
                    return (
                      <button
                        key={def.key}
                        type="button"
                        onClick={() => setPlaceAttributes(prev => ({ ...prev, [def.key]: !prev[def.key] }))}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all',
                          active
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        )}
                      >
                        <span className={cn('h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center',
                          active ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                        )}>
                          {active && <span className="text-[9px] text-primary-foreground font-bold leading-none">✓</span>}
                        </span>
                        {def.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* 6. Image */}
          <div className="space-y-2">
            <Label>Platzbild (Optional)</Label>

            {/* Previews grid */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                        Cover
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add photo button */}
            {imageFiles.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => document.getElementById('ap-image-upload')?.click()}
                className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-muted/20 transition-colors"
              >
                <Camera className="h-7 w-7 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">
                  {imagePreviews.length === 0 ? 'Foto hinzufügen' : 'Weiteres Foto hinzufügen'}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  JPG, PNG, WebP · max. 10 MB · bis zu {MAX_IMAGES} Fotos
                </span>
              </button>
            )}

            <Input
              id="ap-image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* 6. Contact */}
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

          {/* 7. Opening Hours */}
          <div className="space-y-2">
            <Label>Öffnungszeiten (Optional)</Label>
            <OpeningHoursEditor
              key="new"
              value={openingHours}
              onChange={setOpeningHours}
            />
          </div>

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
          <Button type="submit" className="w-full" disabled={createCourtMutation.isPending || isUploadingImages}>
            {isUploadingImages ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Fotos hochladen… {uploadStep}/{imageFiles.length}</>
            ) : createCourtMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Hinzufügen...</>
            ) : 'Ort hinzufügen'}
          </Button>

          {isUploadingImages && imageFiles.length > 0 && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((uploadStep / imageFiles.length) * 100)}%` }}
              />
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
