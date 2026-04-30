'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Heart, ChevronRight, ChevronLeft, X, Loader2 } from 'lucide-react'
import { PlaceMarker, UserFavorite, EventWithDetails, EventSchedule } from '@/lib/supabase/types'
import { sportIcons, sportColors } from '@/lib/utils/sport-utils'
import { calculateDistance, formatDistance } from '@/lib/utils/distance'
import { database } from '@/lib/supabase/database'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Tab = 'orte' | 'events'

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT: Record<string, string> = {
  monday: 'Mo', tuesday: 'Di', wednesday: 'Mi',
  thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So',
}

function getNextOccurrence(event: EventWithDetails): Date {
  const schedule = event.schedule as EventSchedule
  const now = new Date()
  const far = new Date(8640000000000000)
  if (!schedule) return far
  if (schedule.type === 'recurring') {
    if (!schedule.slots.length) return far
    const todayIndex = (now.getDay() + 6) % 7
    let earliest: Date | null = null
    for (const slot of schedule.slots) {
      const dayIndex = DAY_ORDER.indexOf(slot.day)
      const daysUntil = (dayIndex - todayIndex + 7) % 7
      const [h, m] = slot.start_time.split(':').map(Number)
      const occ = new Date()
      occ.setDate(occ.getDate() + daysUntil)
      occ.setHours(h, m, 0, 0)
      if (occ <= now) occ.setDate(occ.getDate() + 7)
      if (!earliest || occ < earliest) earliest = occ
    }
    return earliest ?? far
  }
  const future = (schedule.dates || [])
    .map(d => new Date(`${d.date}T${d.start_time || '00:00'}`))
    .filter(d => d > now)
    .sort((a, b) => a.getTime() - b.getTime())
  return future[0] ?? far
}

function formatNextOccurrence(event: EventWithDetails): string {
  const schedule = event.schedule as EventSchedule
  if (!schedule) return ''
  const next = getNextOccurrence(event)
  if (next.getTime() === new Date(8640000000000000).getTime()) return 'Wiederkehrend'
  if (schedule.type === 'recurring') {
    const day = DAY_SHORT[DAY_ORDER[(next.getDay() + 6) % 7]] ?? ''
    const time = next.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
    return `${day} · ${time} Uhr`
  }
  const dateStr = next.toLocaleDateString('de', { day: 'numeric', month: 'short' })
  const time = next.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} · ${time} Uhr`
}

interface FavoritesBottomSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onBack?: () => void
  user: { id: string } | null
  userLocation: { lat: number; lng: number } | null
  onPlaceSelect: (place: PlaceMarker) => void
}

function FavoriteRow({
  fav,
  userId,
  userLocation,
  onSelect,
}: {
  fav: UserFavorite
  userId: string
  userLocation: { lat: number; lng: number } | null
  onSelect: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const place = fav.places

  const removeMutation = useMutation({
    mutationFn: () => database.favorites.removeFavorite(userId, fav.place_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] })
      queryClient.invalidateQueries({ queryKey: ['favorite-ids', userId] })
      queryClient.invalidateQueries({ queryKey: ['favorite', userId, fav.place_id] })
      toast({ title: 'Aus Gespeichert entfernt' })
    },
    onError: () => {
      toast({ title: 'Fehler beim Entfernen', variant: 'destructive' })
    },
  })

  if (!place) return null

  const primarySport = place.sports?.[0] as string | undefined
  const color = sportColors[primarySport ?? ''] || '#9CA3AF'
  const icon = sportIcons[primarySport ?? ''] || '📍'
  const dist = userLocation
    ? formatDistance(calculateDistance(userLocation, { lat: place.latitude, lng: place.longitude }))
    : null

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[.05] dark:border-white/[.06]">
      <button
        onClick={onSelect}
        className="flex flex-1 items-center gap-3 text-left min-w-0 active:opacity-70 transition-opacity"
      >
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">{place.name}</div>
          <div className="text-[13px] text-muted-foreground truncate">
            {[place.city, dist].filter(Boolean).join(' · ')}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      </button>

      <button
        onClick={() => removeMutation.mutate()}
        disabled={removeMutation.isPending}
        className="h-9 w-9 flex items-center justify-center rounded-full active:bg-black/[.05] dark:active:bg-white/[.06] transition-colors shrink-0 ml-1"
        aria-label="Aus Gespeichert entfernen"
      >
        {removeMutation.isPending
          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          : <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />}
      </button>
    </div>
  )
}

function EventFavoriteRow({
  event,
  userId,
}: {
  event: EventWithDetails
  userId: string
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const primarySport = event.sports?.[0] as string | undefined
  const color = sportColors[primarySport ?? ''] || '#6366f1'
  const icon = sportIcons[primarySport ?? ''] || '📅'
  const dateLabel = formatNextOccurrence(event)
  const location = event.place_city || event.place_name || null

  const removeMutation = useMutation({
    mutationFn: () => database.eventBookmarks.unbookmarkEvent(userId, event.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-bookmarks', userId] })
      queryClient.invalidateQueries({ queryKey: ['event', event.id] })
      toast({ title: 'Lesezeichen entfernt' })
    },
    onError: () => {
      toast({ title: 'Fehler beim Entfernen', variant: 'destructive' })
    },
  })

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[.05] dark:border-white/[.06]">
      <a
        href={`/events/${event.id}`}
        className="flex flex-1 items-center gap-3 text-left min-w-0"
      >
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">{event.title}</div>
          <div className="text-[13px] text-muted-foreground truncate">
            {[dateLabel, location].filter(Boolean).join(' · ')}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      </a>

      <button
        onClick={() => removeMutation.mutate()}
        disabled={removeMutation.isPending}
        className="h-9 w-9 flex items-center justify-center rounded-full active:bg-black/[.05] dark:active:bg-white/[.06] transition-colors shrink-0 ml-1"
        aria-label="Lesezeichen entfernen"
      >
        {removeMutation.isPending
          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          : <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />}
      </button>
    </div>
  )
}

export default function FavoritesBottomSheetVaul({
  isOpen,
  onOpenChange,
  onBack,
  user,
  userLocation,
  onPlaceSelect,
}: FavoritesBottomSheetProps) {
  const [tab, setTab] = useState<Tab>('orte')

  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => database.favorites.getFavorites(user!.id),
    enabled: !!user && isOpen,
    staleTime: 2 * 60 * 1000,
  })

  const { data: bookmarks = [], isLoading: isLoadingBookmarks } = useQuery({
    queryKey: ['event-bookmarks', user?.id],
    queryFn: () => database.eventBookmarks.getUserBookmarks(user!.id),
    enabled: !!user && isOpen,
    staleTime: 2 * 60 * 1000,
  })

  const isLoading = tab === 'orte' ? isLoadingFavorites : isLoadingBookmarks

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} modal={false} shouldScaleBackground={false}>
      <DrawerContent hideOverlay className="h-[92dvh] flex flex-col focus:outline-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-2 pb-3 shrink-0">
          <button
            onClick={() => onBack ? onBack() : onOpenChange(false)}
            className="h-8 w-8 rounded-full bg-black/[.06] dark:bg-white/[.08] flex items-center justify-center active:bg-black/[.12] dark:active:bg-white/[.14] transition-colors"
            aria-label="Zurück"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <span className="text-[17px] font-bold">Gespeichert</span>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full bg-black/[.06] dark:bg-white/[.08] flex items-center justify-center active:bg-black/[.12] dark:active:bg-white/[.14] transition-colors"
            aria-label="Schließen"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        {/* Tab switcher */}
        {user && (
          <div className="px-4 pb-3 shrink-0">
            <div className="flex rounded-[10px] bg-black/[.05] dark:bg-white/[.06] p-[3px] gap-[2px]">
              {(['orte', 'events'] as Tab[]).map(t => (
                <button
                  key={t}
                  className={`flex-1 text-sm py-1.5 rounded-[8px] font-medium transition-colors ${
                    tab === t
                      ? 'bg-white dark:bg-[#2C2E33] shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-foreground'
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => setTab(t)}
                >
                  {t === 'orte' ? 'Orte' : 'Events'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!user ? (
            <div className="px-4 py-12 flex flex-col items-center gap-4 text-center">
              <Heart className="h-10 w-10 text-muted-foreground/30" />
              <div>
                <p className="text-[15px] font-semibold">Noch nicht angemeldet</p>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Melde dich an, um Orte zu speichern.
                </p>
              </div>
              <div className="flex gap-2 w-full max-w-xs">
                <Link
                  href="/auth/signin"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-11 bg-primary text-primary-foreground rounded-xl text-[15px] font-semibold flex items-center justify-center"
                >
                  Anmelden
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-11 bg-muted text-foreground rounded-xl text-[15px] font-semibold flex items-center justify-center"
                >
                  Registrieren
                </Link>
              </div>
            </div>
          ) : isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tab === 'orte' ? (
            favorites.length === 0 ? (
              <div className="px-4 py-12 flex flex-col items-center gap-3 text-center">
                <Heart className="h-10 w-10 text-muted-foreground/30" />
                <div>
                  <p className="text-[15px] font-semibold">Keine gespeicherten Orte</p>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Tippe auf das Herz bei einem Ort, um ihn hier zu speichern.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {favorites.map((fav: UserFavorite) => (
                  <FavoriteRow
                    key={fav.id}
                    fav={fav}
                    userId={user.id}
                    userLocation={userLocation}
                    onSelect={() => {
                      onOpenChange(false)
                      if (fav.places) onPlaceSelect(fav.places as unknown as PlaceMarker)
                    }}
                  />
                ))}
              </div>
            )
          ) : (
            bookmarks.length === 0 ? (
              <div className="px-4 py-12 flex flex-col items-center gap-3 text-center">
                <Heart className="h-10 w-10 text-muted-foreground/30" />
                <div>
                  <p className="text-[15px] font-semibold">Keine gespeicherten Events</p>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Tippe auf das Herz bei einem Event, um es hier zu speichern.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {bookmarks.map((event: EventWithDetails) => (
                  <EventFavoriteRow
                    key={event.id}
                    event={event}
                    userId={user.id}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
