'use client'

import { useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import LoginPromptBottomSheet from './login-prompt-bottom-sheet-vaul'
import ReportPlaceBottomSheet from './report-place-bottom-sheet-vaul'
import PlaceTypeInfoSheet from './place-type-info-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Navigation, Share2, Heart, Pencil, X, Upload, Image, Loader2, Maximize2, Flag, Phone, Mail, Globe, ChevronDown } from 'lucide-react'
import { PlaceWithCourts, PlaceMarker, OpeningHours } from '@/lib/supabase/types'
import { getOpeningStatus, getCurrentDayKey, DAY_ORDER, DAY_SHORT_DE } from '@/lib/utils/opening-hours'
import { cn } from '@/lib/utils'
import { sportNames, sportIcons, getPlaceTypeBadgeClasses, placeTypeLabels, placeTypeIcons, PlaceType } from '@/lib/utils/sport-utils'
import { Badge } from '@/components/ui/badge'
import { getDistanceText } from '@/lib/utils/distance'
import { uploadCourtImage } from '@/lib/supabase/storage'
import { database } from '@/lib/supabase/database'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface PlaceBottomSheetVaulProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedCourt: PlaceMarker | null
  userLocation: { lat: number; lng: number } | null
  user: { id: string } | null
  profile: { user_role?: string } | null
  showFavorite?: boolean
}

export default function PlaceBottomSheetVaul({
  isOpen,
  onOpenChange,
  selectedCourt,
  userLocation,
  user,
  profile,
  showFavorite = true,
}: PlaceBottomSheetVaulProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isSaveLoginPromptOpen, setIsSaveLoginPromptOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isPlaceTypeInfoOpen, setIsPlaceTypeInfoOpen] = useState(false)
  const [isHoursExpanded, setIsHoursExpanded] = useState(false)

  // Fetch full place details on demand when the sheet opens
  const { data: fullPlace, isLoading: isLoadingPlace } = useQuery({
    queryKey: ['place', selectedCourt?.id],
    queryFn: () => database.courts.getCourt(selectedCourt!.id),
    enabled: !!selectedCourt,
    staleTime: 5 * 60 * 1000,
  })

  // Merge: use full data when available, fall back to lightweight marker data
  const place: PlaceWithCourts | null = fullPlace ?? (selectedCourt as PlaceWithCourts | null)

  const { data: isFavorited = false } = useQuery({
    queryKey: ['favorite', user?.id, selectedCourt?.id],
    queryFn: () => database.favorites.isFavorite(user!.id, selectedCourt!.id),
    enabled: !!user && !!selectedCourt,
  })

  const favoriteMutation = useMutation({
    mutationFn: () => isFavorited
      ? database.favorites.removeFavorite(user!.id, selectedCourt!.id)
      : database.favorites.addFavorite(user!.id, selectedCourt!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite', user?.id, selectedCourt?.id] })
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] })
      toast({ title: isFavorited ? 'Aus gespeicherten Orten entfernt' : 'Gespeichert!' })
    },
    onError: () => {
      toast({ title: 'Etwas ist schiefgelaufen', variant: 'destructive' })
    },
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Datei zu groß', description: 'Bitte ein Bild kleiner als 10MB auswählen.', variant: 'destructive' })
      return
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ungültiger Dateityp', description: 'Bitte eine Bilddatei auswählen (JPG, PNG, WebP).', variant: 'destructive' })
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const isAdmin = profile?.user_role === 'admin'

  const handleImageUpload = async () => {
    if (!imageFile || !selectedCourt || !user) return
    setIsUploadingImage(true)
    try {
      const { url } = await uploadCourtImage(imageFile)
      if (isAdmin) {
        await database.courts.updateCourt(selectedCourt.id, { image_url: url })
        toast({ title: 'Bild hochgeladen', description: 'Das Foto wurde diesem Ort hinzugefügt.' })
        queryClient.invalidateQueries({ queryKey: ['places-lightweight'] })
        queryClient.invalidateQueries({ queryKey: ['place', selectedCourt?.id] })
      } else {
        await database.community.submitPlaceImageEdit(selectedCourt.id, url, user.id)
        toast({ title: 'Foto zur Überprüfung eingereicht', description: 'Dein Foto wird sichtbar, sobald ein Admin es genehmigt.' })
      }
      setImageFile(null)
      setImagePreview(null)
    } catch (error) {
      toast({ title: 'Upload fehlgeschlagen', description: error instanceof Error ? error.message : 'Unbekannter Fehler', variant: 'destructive' })
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <>
    <LoginPromptBottomSheet
      isOpen={isSaveLoginPromptOpen}
      onOpenChange={setIsSaveLoginPromptOpen}
      title="Ort speichern"
      description="Melde dich an, um Orte als Favoriten zu speichern."
      icon={Heart}
    />
    <ReportPlaceBottomSheet
      isOpen={isReportOpen}
      onOpenChange={setIsReportOpen}
      placeId={selectedCourt?.id ?? null}
      placeName={selectedCourt?.name ?? null}
      userId={user?.id ?? null}
    />
    <PlaceTypeInfoSheet
      isOpen={isPlaceTypeInfoOpen}
      onOpenChange={setIsPlaceTypeInfoOpen}
    />

    {/* Fullscreen image overlay - outside drawer to avoid stacking context issues */}
    {isFullscreenOpen && place?.image_url && (
      <div
        className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
        onClick={() => setIsFullscreenOpen(false)}
      >
        <img
          src={place.image_url}
          alt={place.name}
          className="max-w-full max-h-full object-contain"
        />
        <button
          className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2"
          onClick={() => setIsFullscreenOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    )}

    <Drawer open={isOpen} onOpenChange={onOpenChange} modal={false} shouldScaleBackground={false}>
      <DrawerContent
        hideOverlay
        className="max-h-[92dvh] max-w-2xl mx-auto"
      >
        {selectedCourt && (
          <>
            <DrawerHeader>
              <div className="flex items-center justify-between overflow-hidden gap-3">
                <div className="min-w-0 text-left">
                  <DrawerTitle className="text-xl text-left truncate">
                    {selectedCourt.name}
                  </DrawerTitle>
                </div>

                {/* Button group */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-10 w-10"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/map?place=${selectedCourt.id}`
                      if (navigator.share) {
                        navigator.share({
                          title: selectedCourt.name,
                          text: `Check out ${selectedCourt.name}`,
                          url: shareUrl,
                        }).catch(err => console.log('Share failed:', err))
                      } else {
                        navigator.clipboard.writeText(shareUrl).then(() => {
                          toast({ title: 'Link kopiert!' })
                        }).catch(() => {
                          toast({ title: 'Link konnte nicht kopiert werden', variant: 'destructive' })
                        })
                      }
                    }}
                    title="Teilen"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-10 w-10"
                    onClick={() => onOpenChange(false)}
                    title="Schließen"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            </DrawerHeader>

            <div className="space-y-4 p-4 overflow-y-auto">

              {/* Thumbnail + sports pills — show skeleton while loading full details */}
              {isLoadingPlace ? (
                <div className="flex gap-3 items-start">
                  <div className="shrink-0 w-[88px] h-[88px] rounded-[10px] bg-muted animate-pulse" />
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="h-8 w-24 rounded-full bg-muted animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-start">
                  {/* 88×88 thumbnail */}
                  {place?.image_url ? (
                    <button
                      className="relative shrink-0 w-[88px] h-[88px] rounded-[10px] overflow-hidden block"
                      onClick={() => setIsFullscreenOpen(true)}
                    >
                      <img
                        src={place.image_url}
                        alt={place.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 right-1 bg-black/40 rounded p-0.5">
                        <Maximize2 className="h-3 w-3 text-white" />
                      </span>
                    </button>
                  ) : (
                    <div
                      className="shrink-0 w-[88px] h-[88px] rounded-[10px] border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                      style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)' }}
                    >
                      <Image className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Sports pills */}
                  {(() => {
                    const sportsWithCounts = (place?.courts?.length ?? 0) > 0
                      ? place!.courts!.reduce((acc, c) => {
                          const key = c.sport === 'other' ? ((c as any).custom_sport_name || 'other') : c.sport
                          acc[key] = (acc[key] || 0) + (c.quantity || 1)
                          return acc
                        }, {} as Record<string, number>)
                      : (place?.sports?.reduce((acc, sport) => ({ ...acc, [sport]: 1 }), {} as Record<string, number>) || {})

                    return Object.keys(sportsWithCounts).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(sportsWithCounts).map(([sport, count]) => (
                          <div
                            key={sport}
                            className="flex items-center gap-1 border border-border rounded-full px-3 py-1.5 self-start"
                          >
                            <span className="text-[16px] leading-none">{sportIcons[sport] || '🏅'}</span>
                            <span className="text-[14px] font-medium text-muted-foreground">{sportNames[sport] || sport}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Place type badge — tappable to open info sheet */}
              {place?.place_type && (
                <div>
                  <button onClick={() => setIsPlaceTypeInfoOpen(true)}>
                    <Badge className={`text-xs cursor-pointer ${getPlaceTypeBadgeClasses(place.place_type)}`}>
                      {placeTypeIcons[place.place_type as PlaceType] || ''} {placeTypeLabels[place.place_type as PlaceType] || place.place_type}
                    </Badge>
                  </button>
                </div>
              )}

              {/* Address + distance */}
              {(() => {
                const quickAddress = [place?.street, place?.district || place?.city]
                  .filter(Boolean)
                  .join(', ')
                const hasAddress = quickAddress || userLocation
                return hasAddress && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adresse</p>
                    {quickAddress && (
                      <p className="text-sm text-foreground">{quickAddress}</p>
                    )}
                    {userLocation && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {getDistanceText(userLocation, { lat: selectedCourt.latitude, lng: selectedCourt.longitude })}
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Contact */}
              {!isLoadingPlace && (place?.contact_phone || place?.contact_email || place?.contact_website) && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kontakt</p>
                  {place.contact_phone && (
                    <a href={`tel:${place.contact_phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{place.contact_phone}</span>
                    </a>
                  )}
                  {place.contact_email && (
                    <a href={`mailto:${place.contact_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span>{place.contact_email}</span>
                    </a>
                  )}
                  {place.contact_website && (
                    <a href={place.contact_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <span className="truncate">{place.contact_website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>
              )}

              {/* Opening hours */}
              {!isLoadingPlace && (() => {
                const hoursData = (place?.opening_hours ?? null) as OpeningHours | null
                if (!hoursData) return null
                const status = getOpeningStatus(hoursData)
                const todayKey = getCurrentDayKey()
                return (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Öffnungszeiten</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full shrink-0', status.isOpen ? 'bg-green-500' : status.isUnknown ? 'bg-amber-400' : 'bg-muted-foreground/50')} />
                        <span className="text-sm text-muted-foreground">{status.statusText}</span>
                      </div>
                      <button
                        onClick={() => setIsHoursExpanded(prev => !prev)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isHoursExpanded && 'rotate-180')} />
                      </button>
                    </div>
                    {isHoursExpanded && (
                      <div className="flex flex-col gap-1 pt-1">
                        {DAY_ORDER.map(key => {
                          const day = hoursData[key]
                          const isToday = key === todayKey
                          return (
                            <div key={key} className={cn('flex justify-between text-sm', isToday ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                              <span>{DAY_SHORT_DE[key]}</span>
                              {day === undefined
                                ? <span className="text-muted-foreground/40 font-normal">–</span>
                                : day.closed || !day.open || !day.close
                                  ? <span className={isToday ? 'text-muted-foreground font-normal' : ''}>Geschlossen</span>
                                  : <span>{day.open} – {day.close} Uhr</span>
                              }
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}

              {!isLoadingPlace && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</p>
                  <div className="flex items-center gap-4">
                    <button
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        window.location.href = `/places/${selectedCourt.id}/edit`
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Bearbeiten</span>
                    </button>
                    <button
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsReportOpen(true)}
                    >
                      <Flag className="h-3.5 w-3.5" />
                      <span>Melden</span>
                    </button>
                  </div>
                </div>
              )}

              {!isLoadingPlace && place?.description && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Beschreibung</p>
                  <p className="text-sm text-muted-foreground">{place.description}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1 text-base"
                  onClick={() => {
                    const url = `https://maps.google.com/?q=${selectedCourt.latitude},${selectedCourt.longitude}`
                    window.open(url, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Route
                </Button>
                {showFavorite && (
                  <Button
                    variant="secondary"
                    className="flex-1 text-base"
                    onClick={() => {
                      if (!user) {
                        setIsSaveLoginPromptOpen(true)
                        return
                      }
                      favoriteMutation.mutate()
                    }}
                    disabled={favoriteMutation.isPending}
                  >
                    {favoriteMutation.isPending
                      ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      : <Heart className={`h-4 w-4 mr-1 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />}
                    {isFavorited ? 'Gespeichert' : 'Speichern'}
                  </Button>
                )}
              </div>

            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
    </>
  )
}
