'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { SportType, PlaceWithCourts, PlaceImage, OpeningHours } from '@/lib/supabase/types'
import { PlaceType, placeTypeLabels, placeTypeIcons } from '@/lib/utils/sport-utils'
import { ATTRIBUTE_DEFINITIONS, getRelevantAttributes, rowsToAttributeMap } from '@/lib/attributes/definitions'
import { reverseGeocode, AddressComponents } from '@/lib/geocoding'
import { uploadCourtImage, uploadPlaceImageScoped, UploadProgress } from '@/lib/supabase/storage'
import { useAuth } from '@/components/providers/auth-provider'
import { sportIcons, sportNames, CURATED_SPORTS } from '@/lib/utils/sport-utils'
import { cn, validateWebsite } from '@/lib/utils'
import { MapPin, Plus, Upload, X, Image, Camera, Loader2, Phone, Mail, Globe } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import OpeningHoursEditor from '@/components/places/opening-hours-editor'
import PlaceImageGallery from '@/components/places/place-image-gallery'

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


const SURFACE_TYPES = [
  'Unbekannt', 'Rasen', 'Kunstrasen', 'Hartplatz', 'Asphalt',
  'Kunststoffbelag', 'Asche', 'Sand', 'Stein', 'Holzschnitzel', 'Sonstiges',
] as const

export interface PlaceFormCourt {
  sport: SportType
  quantity: number
  surface: string
  notes: string
  customSportName?: string
  attributes?: Record<string, boolean>
}

export interface PlaceFormData {
  name: string
  description: string
  placeType: PlaceType
  selectedSports: SportType[]
  customSports: string[]
  courts: PlaceFormCourt[]
  location: { lat: number; lng: number } | null
  address: AddressComponents
  imageFile: File | null
  imageUrl?: string | null
  contactPhone: string
  contactEmail: string
  contactWebsite: string
  openingHours: OpeningHours | null
  placeAttributes: Record<string, boolean>
}

interface PlaceFormProps {
  mode: 'create' | 'edit'
  initialData?: PlaceWithCourts
  placeId?: string
  onSubmit: (data: PlaceFormData) => Promise<void>
  isLoading: boolean
  submitButtonText?: string
  title: string
  description: string
  onDeleteImage?: (image: PlaceImage) => void
  isAdmin?: boolean
}

export default function PlaceForm({
  mode,
  initialData,
  placeId,
  onSubmit,
  isLoading,
  submitButtonText,
  onDeleteImage,
  isAdmin = false,
}: PlaceFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()

  const { data: allPlaces = [] } = useQuery({
    queryKey: ['places'],
    queryFn: () => database.courts.getAllCourts(),
  })

  const { data: placeImages = [] } = useQuery<PlaceImage[]>({
    queryKey: ['place-images', placeId],
    queryFn: () => database.community.getPlaceImages(placeId!) as Promise<PlaceImage[]>,
    enabled: !!placeId,
  })

  const galleryImages: PlaceImage[] =
    placeImages.length > 0
      ? placeImages
      : initialData?.image_url
      ? [{ id: 'legacy', place_id: placeId ?? '', storage_path: '', url: initialData.image_url, is_cover: true, sort_order: 0, uploaded_by: null, created_at: '' }]
      : []

  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [placeType, setPlaceType] = useState<PlaceType>((initialData?.place_type as PlaceType) || 'öffentlich')
  const [selectedSports, setSelectedSports] = useState<SportType[]>(() => {
    if (initialData?.courts?.length) {
      return [...new Set(initialData.courts.filter(c => c.sport !== 'other').map(c => c.sport))]
    }
    return (initialData?.sports || []).filter(s => s !== 'other') as SportType[]
  })

  const [customSports, setCustomSports] = useState<string[]>(() => {
    if (!initialData?.courts?.length) return []
    return [...new Set(
      initialData.courts
        .filter(c => c.sport === 'other' && c.custom_sport_name)
        .map(c => c.custom_sport_name!)
    )]
  })

  const [customSportInput, setCustomSportInput] = useState('')
  const [showCustomSportInput, setShowCustomSportInput] = useState(false)

  // Each sport/custom-sport maps to an array of surface strings, one entry per court
  const [courtSurfaces, setCourtSurfaces] = useState<Record<string, string[]>>(() => {
    if (!initialData?.courts?.length) return {}
    const surfaces: Record<string, string[]> = {}
    initialData.courts.forEach(court => {
      const key = court.sport === 'other' ? (court.custom_sport_name || 'other') : court.sport
      const expanded = Array(court.quantity || 1).fill(court.surface || 'Unbekannt')
      surfaces[key] = [...(surfaces[key] || []), ...expanded]
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

  // Edit mode: staged images are uploaded on form save
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([])

  const handleAddStagedFiles = useCallback((files: File[]) => {
    const previews = files.map(f => URL.createObjectURL(f))
    setStagedFiles(prev => [...prev, ...files])
    setStagedPreviews(prev => [...prev, ...previews])
  }, [])

  const handleRemoveStagedFile = useCallback((idx: number) => {
    setStagedPreviews(prev => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
    setStagedFiles(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const [contactPhone, setContactPhone] = useState(initialData?.contact_phone || '')
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email || '')
  const [contactWebsite, setContactWebsite] = useState(initialData?.contact_website || '')
  const [phoneError, setPhoneError] = useState('')
  const [websiteError, setWebsiteError] = useState('')
  const hasExistingContact = !!(initialData?.contact_phone || initialData?.contact_email || initialData?.contact_website)
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(
    (initialData?.opening_hours as OpeningHours | null) ?? null
  )

  const [placeAttributes, setPlaceAttributes] = useState<Record<string, boolean>>({})
  // Per-sport, per-court array: courtAttributesBySport[sport][courtIdx][key]
  const [courtAttributesBySport, setCourtAttributesBySport] = useState<Record<string, Record<string, boolean>[]>>({})

  // Load existing attribute values when editing
  const { data: existingPlaceAttrs = [] } = useQuery({
    queryKey: ['place-attributes', placeId],
    queryFn: () => database.attributes.getPlaceAttributes(placeId!),
    enabled: mode === 'edit' && !!placeId,
    staleTime: Infinity,
  })
  const { data: existingCourtAttrs = [] } = useQuery({
    queryKey: ['court-attributes', placeId],
    queryFn: async () => {
      const courtIds = (initialData?.courts ?? []).map(c => c.id)
      return database.attributes.getCourtAttributes(courtIds)
    },
    enabled: mode === 'edit' && !!placeId && (initialData?.courts?.length ?? 0) > 0,
    staleTime: Infinity,
  })

  // Populate attribute state once loaded
  useEffect(() => {
    if (existingPlaceAttrs.length > 0) {
      setPlaceAttributes(rowsToAttributeMap(existingPlaceAttrs))
    }
  }, [existingPlaceAttrs])

  useEffect(() => {
    if (!existingCourtAttrs.length || !initialData?.courts) return
    const bySport: Record<string, Record<string, boolean>[]> = {}
    for (const court of initialData.courts) {
      const rows = existingCourtAttrs.filter(r => r.court_id === court.id)
      const attrMap: Record<string, boolean> = {}
      for (const r of rows) {
        if (r.value === 'true') attrMap[r.key] = true
      }
      const key = court.sport === 'other' ? (court.custom_sport_name || 'other') : court.sport
      const qty = court.quantity || 1
      // Expand each DB court record into qty individual entries with the same attr map
      const expanded = Array.from({ length: qty }, () => ({ ...attrMap }))
      bySport[key] = [...(bySport[key] ?? []), ...expanded]
    }
    setCourtAttributesBySport(bySport)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCourtAttrs])

  const togglePlaceAttr = useCallback((key: string) =>
    setPlaceAttributes(prev => ({ ...prev, [key]: !prev[key] })), [])

  const toggleCourtAttr = useCallback((sport: string, courtIdx: number, key: string) =>
    setCourtAttributesBySport(prev => {
      const arr = [...(prev[sport] ?? [])]
      while (arr.length <= courtIdx) arr.push({})
      arr[courtIdx] = { ...arr[courtIdx], [key]: !arr[courtIdx][key] }
      return { ...prev, [sport]: arr }
    }), [])

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

    // Upload staged images for edit mode (uploaded to review queue on save)
    if (placeId && stagedFiles.length > 0) {
      setIsUploadingImage(true)
      try {
        for (const file of stagedFiles) {
          if (user) {
            const result = await uploadPlaceImageScoped(file, placeId)
            await database.community.submitPlaceImageAdd(placeId, result.path, result.url, user.id)
          } else {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('placeId', placeId)
            const res = await fetch('/api/guest/submit-image', { method: 'POST', body: formData })
            if (!res.ok) {
              const json = await res.json()
              throw new Error(json.error || 'Upload fehlgeschlagen')
            }
          }
        }
        setStagedFiles([])
        setStagedPreviews(prev => { prev.forEach(u => URL.revokeObjectURL(u)); return [] })
      } catch (err) {
        toast({ title: 'Bild-Upload fehlgeschlagen', description: err instanceof Error ? err.message : '', variant: 'destructive' })
      } finally {
        setIsUploadingImage(false)
      }
    }

    // Convert courtSurfaces to courts array — one record per UI row (quantity=1), attributes embedded
    const courts: PlaceFormCourt[] = [
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

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      placeType,
      selectedSports,
      customSports,
      courts,
      location,
      address: Object.values(address).some(v => v) ? address : {},
      imageFile,
      imageUrl: finalImageUrl,
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      contactWebsite: contactWebsite.trim(),
      openingHours: openingHours,
      placeAttributes,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Name */}
      <div className="space-y-2">
        <Label htmlFor="pf-name">Ortsname *</Label>
        <Input id="pf-name" placeholder="z.B. Stadtpark Tennisplätze" value={name} onChange={e => setName(e.target.value)} required />
      </div>

      {/* 2. Location + Address */}
      <div className="space-y-2">
        <Label>Standort *</Label>
        <div className="border rounded-lg overflow-hidden">
          <LeafletCourtMap
            courts={allPlaces.filter(p => p.id !== initialData?.id)}
            onMapClick={handleMapClick}
            height="260px"
            allowAddCourt={true}
            embedded={true}
            selectedLocation={location}
            placesCount={allPlaces.length}
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
          {CURATED_SPORTS.map(sport => {
            const isSelected = selectedSports.includes(sport as SportType)
            return (
              <button
                key={sport}
                type="button"
                onClick={() => handleSportToggle(sport as SportType)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                <span className="text-[20px] leading-none">{sportIcons[sport] || '📍'}</span>
                <span className="text-sm font-medium">{sportNames[sport] || sport}</span>
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
            const surfaces = courtSurfaces[sport] || ['']
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
                      <Select value={surface || 'Unbekannt'} onValueChange={val => updateCourtSurface(sport, idx, val)}>
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
                              onClick={() => toggleCourtAttr(sport, idx, def.key)}
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
                    onClick={() => togglePlaceAttr(def.key)}
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
        {placeId ? (
          <PlaceImageGallery
            images={galleryImages}
            placeId={placeId}
            placeName={initialData?.name ?? ''}
            stagedPreviews={stagedPreviews}
            onAddFiles={handleAddStagedFiles}
            onRemoveStagedFile={handleRemoveStagedFile}
            isUploading={isLoading || isUploadingImage}
            onDeleteImage={onDeleteImage}
          />
        ) : (
          <div className="space-y-2">
            {imagePreview ? (
              <>
                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); setImageRemoved(true) }}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('pf-image-upload')?.click()}
                    className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    title="Foto ersetzen"
                  >
                    <Camera className="h-5 w-5 text-muted-foreground/40" />
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById('pf-image-upload')?.click()}
                className="w-full h-[88px] rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center gap-2 hover:border-primary/40 hover:bg-muted/20 transition-colors"
              >
                <Camera className="h-5 w-5 text-muted-foreground/40" />
                <span className="text-sm text-muted-foreground">Foto hinzufügen</span>
              </button>
            )}
            <Input id="pf-image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>
        )}
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
          key={initialData?.id ?? 'new'}
          value={openingHours}
          onChange={setOpeningHours}
        />
      </div>

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
