'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { SportType, PlaceWithCourts } from '@/lib/supabase/types'
import { PlaceType, placeTypeLabels, placeTypeIcons } from '@/lib/utils/sport-utils'
import { reverseGeocode, AddressComponents } from '@/lib/geocoding'
import { uploadCourtImage, UploadProgress } from '@/lib/supabase/storage'
import { sportIcons } from '@/lib/utils/sport-utils'
import { cn } from '@/lib/utils'
import { MapPin, Plus, Upload, X, Image, Loader2, AlertCircle, Phone, Mail, Globe } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import OpeningHoursEditor from '@/components/places/opening-hours-editor'
import { OpeningHours } from '@/lib/supabase/types'

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

export interface PlaceFormCourt {
  sport: SportType
  quantity: number
  surface: string
  notes: string
}

export interface PlaceFormData {
  name: string
  description: string
  placeType: PlaceType
  selectedSports: SportType[]
  courts: PlaceFormCourt[]
  location: { lat: number; lng: number } | null
  address: AddressComponents
  imageFile: File | null
  imageUrl?: string | null
  contactPhone: string
  contactEmail: string
  contactWebsite: string
  openingHours: OpeningHours | null
}

interface PlaceFormProps {
  mode: 'create' | 'edit'
  initialData?: PlaceWithCourts
  onSubmit: (data: PlaceFormData) => Promise<void>
  isLoading: boolean
  submitButtonText?: string
  title: string
  description: string
  showCommunityMessage?: boolean
}

export default function PlaceForm({
  mode,
  initialData,
  onSubmit,
  isLoading,
  submitButtonText,
  showCommunityMessage = false,
}: PlaceFormProps) {
  const { toast } = useToast()

  const { data: allPlaces = [] } = useQuery({
    queryKey: ['places'],
    queryFn: () => database.courts.getAllCourts(),
  })

  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [placeType, setPlaceType] = useState<PlaceType>((initialData?.place_type as PlaceType) || 'öffentlich')

  const [selectedSports, setSelectedSports] = useState<SportType[]>(() => {
    if (initialData?.courts?.length) {
      return [...new Set(initialData.courts.map(c => c.sport))]
    }
    return initialData?.sports || []
  })

  // Each sport maps to an array of surface strings, one entry per court
  const [courtSurfaces, setCourtSurfaces] = useState<Partial<Record<SportType, string[]>>>(() => {
    if (!initialData?.courts?.length) return {}
    const surfaces: Partial<Record<SportType, string[]>> = {}
    initialData.courts.forEach(court => {
      const expanded = Array(court.quantity || 1).fill(court.surface || 'Unbekannt')
      surfaces[court.sport] = [...(surfaces[court.sport] || []), ...expanded]
    })
    return surfaces
  })

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    initialData ? { lat: initialData.latitude, lng: initialData.longitude } : null
  )
  const [address, setAddress] = useState<AddressComponents>({
    street: initialData?.street || undefined,
    house_number: initialData?.house_number || undefined,
    city: initialData?.city || undefined,
    county: initialData?.county || undefined,
    state: initialData?.state || undefined,
    country: initialData?.country || undefined,
    postcode: initialData?.postcode || undefined,
    district: initialData?.district || undefined,
  })
  const [isDetectingAddress, setIsDetectingAddress] = useState(false)
  const [addressAutoDetected, setAddressAutoDetected] = useState(false)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  const [contactPhone, setContactPhone] = useState(initialData?.contact_phone || '')
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email || '')
  const [contactWebsite, setContactWebsite] = useState(initialData?.contact_website || '')
  const [phoneError, setPhoneError] = useState('')
  const [websiteError, setWebsiteError] = useState('')
  const hasExistingContact = !!(initialData?.contact_phone || initialData?.contact_email || initialData?.contact_website)
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(
    (initialData?.opening_hours as OpeningHours | null) ?? null
  )

  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    setLocation({ lat, lng })
    setIsDetectingAddress(true)
    setAddressAutoDetected(false)
    try {
      const components = await reverseGeocode(lat, lng)
      if (components) {
        setAddress(components)
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

  const removeCourtForSport = (sport: SportType, idx: number) => {
    const surfaces = courtSurfaces[sport] || []
    if (surfaces.length === 1) {
      handleSportToggle(sport)
    } else {
      setCourtSurfaces(prev => ({ ...prev, [sport]: surfaces.filter((_, i) => i !== idx) }))
    }
  }

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
      if (contactWebsite.trim() && !/\.[a-zA-Z]{2,6}$/.test(contactWebsite.trim())) {
        setWebsiteError('Ungültige Website-Adresse'); hasContactError = true
      }
      if (hasContactError) return
    }

    let finalImageUrl = imageRemoved ? null : (initialData?.image_url || null)
    if (imageFile) {
      try {
        setIsUploadingImage(true)
        setUploadProgress({ loaded: 0, total: 100, percentage: 0 })
        const result = await uploadCourtImage(imageFile, p => setUploadProgress(p))
        finalImageUrl = result.url
      } catch (err) {
        toast({ title: 'Bild-Upload fehlgeschlagen', description: err instanceof Error ? err.message : '', variant: 'destructive' })
      } finally {
        setIsUploadingImage(false)
        setUploadProgress(null)
      }
    }

    // Convert courtSurfaces to courts array (same logic as /map/new)
    const courts: PlaceFormCourt[] = selectedSports.flatMap(sport => {
      const surfaces = (courtSurfaces[sport] || ['']).map(s => s || 'Unbekannt')
      const counts = surfaces.reduce<Record<string, number>>((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {})
      return Object.entries(counts).map(([surface, quantity]) => ({ sport, quantity, surface, notes: '' }))
    })

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      placeType,
      selectedSports,
      courts,
      location,
      address: Object.values(address).some(v => v) ? address : {},
      imageFile,
      imageUrl: finalImageUrl,
      contactPhone: (placeType === 'verein' || placeType === 'schule') ? contactPhone.trim() : '',
      contactEmail: (placeType === 'verein' || placeType === 'schule') ? contactEmail.trim() : '',
      contactWebsite: (placeType === 'verein' || placeType === 'schule') ? contactWebsite.trim() : '',
      openingHours: (placeType === 'verein' || placeType === 'schule') ? openingHours : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showCommunityMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-blue-800">Community-Beitrag</div>
              <div className="text-blue-700">Deine Änderungen werden von Administratoren geprüft, bevor sie für andere Nutzer sichtbar sind.</div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Name */}
      <div className="space-y-2">
        <Label htmlFor="pf-name">Ortsname *</Label>
        <Input id="pf-name" placeholder="z.B. Stadtpark Tennisplätze" value={name} onChange={e => setName(e.target.value)} required />
      </div>

      {/* 2. Location + Address */}
      <div className="space-y-2">
        <Label>Standort *</Label>
        <p className="text-xs text-muted-foreground">Tippe auf die Karte, um den genauen Standort zu setzen.</p>
        <div className="border rounded-lg overflow-hidden">
          <LeafletCourtMap
            courts={allPlaces.filter(p => p.id !== initialData?.id)}
            onMapClick={handleMapClick}
            height="260px"
            allowAddCourt={true}
            selectedLocation={location}
            placesCount={allPlaces.length}
            showFilter={false}
            showFavorite={false}
            disableMarkerClick={true}
            initialCenter={initialData ? { lat: initialData.latitude, lng: initialData.longitude } : undefined}
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
            const surfaces = courtSurfaces[sport] || ['']
            const sportLabel = sport.charAt(0).toUpperCase() + sport.slice(1)
            return (
              <div key={sport} className="space-y-2">
                {surfaces.map((surface, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[8rem]">{sportLabel} Platz {idx + 1}</span>
                    <Select value={surface || 'Unbekannt'} onValueChange={val => updateCourtSurface(sport, idx, val)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Belagstyp..." /></SelectTrigger>
                      <SelectContent>
                        {SURFACE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCourtForSport(sport, idx)}>
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
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2"
                  onClick={() => { setImageFile(null); setImagePreview(null); setImageRemoved(true) }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">{imageFile?.name || 'Aktuelles Bild'}</p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <Image className="h-10 w-10 mx-auto text-muted-foreground" />
              <Button type="button" size="sm" onClick={() => document.getElementById('pf-image-upload')?.click()}>
                <Upload className="h-4 w-4 mr-1" />Bild hochladen
              </Button>
              <Input id="pf-image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
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
            key={initialData?.id ?? 'new'}
            value={openingHours}
            onChange={setOpeningHours}
          />
        </div>
      )}

      {/* 8. Description */}
      <div className="space-y-2">
        <Label htmlFor="pf-description">Beschreibung (Optional)</Label>
        <Textarea
          id="pf-description"
          placeholder="z.B. Öffentlicher Platz mit guter Beleuchtung, direkt am Park..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isLoading || isUploadingImage}>
        {isUploadingImage ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Hochladen... {uploadProgress && `${uploadProgress.percentage.toFixed(0)}%`}</>
        ) : isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />{mode === 'create' ? 'Hinzufügen...' : 'Speichern...'}</>
        ) : (
          submitButtonText || (mode === 'create' ? 'Ort hinzufügen' : 'Änderungen speichern')
        )}
      </Button>

      {isUploadingImage && uploadProgress && (
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.percentage}%` }} />
        </div>
      )}
    </form>
  )
}
