'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Search, X, ChevronRight, Heart, SlidersHorizontal } from 'lucide-react'
import FilterSheet from './filter-sheet'
import { SportType, PlaceMarker, EventWithDetails, EventSchedule } from '@/lib/supabase/types'
import {
  sportIcons, sportColors,
  PlaceType,
} from '@/lib/utils/sport-utils'
import { calculateDistance, formatDistance } from '@/lib/utils/distance'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { useKeyboardHeight } from '@/hooks/use-keyboard-height'

const MAX_RESULTS = 50


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

interface SearchFilterSheetProps {
  open: boolean
  onClose: () => void
  onReopen?: () => void
  selectedSports: SportType[]
  onSportsChange: (sports: SportType[]) => void
  selectedPlaceType: PlaceType[]
  onPlaceTypeChange: (types: PlaceType[]) => void
  places: PlaceMarker[]
  userLocation: { lat: number; lng: number } | null
  onPlaceSelect: (place: PlaceMarker) => void
  onOpenFavorites?: () => void
}

export default function SearchFilterSheet({
  open,
  onClose,
  onReopen,
  selectedSports,
  onSportsChange,
  selectedPlaceType,
  onPlaceTypeChange,
  places,
  userLocation,
  onPlaceSelect,
  onOpenFavorites,
}: SearchFilterSheetProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [showOrte, setShowOrte] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const keyboardHeight = useKeyboardHeight()

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (open) {
      // Wait for the drawer open animation, then focus.
      // On Android, the subsequent visualViewport resize (keyboard appearing)
      // is handled by useKeyboardHeight which repositions the drawer.
      const t = setTimeout(focusInput, 320)
      return () => clearTimeout(t)
    } else {
      setQuery('')
    }
  }, [open, focusInput])

  const { data: events = [] } = useQuery({
    queryKey: ['events', user?.id],
    queryFn: () => database.events.getAllEvents(user?.id),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  const { data: favoriteIds = new Set<string>() } = useQuery({
    queryKey: ['favorite-ids', user?.id],
    queryFn: async () => {
      const favs = await database.favorites.getFavorites(user!.id)
      return new Set(favs.map(f => f.place_id))
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user && open,
  })

  const hasActiveFilter = selectedSports.length > 0 || selectedPlaceType.length > 0
  const activeFilterCount = selectedSports.length + selectedPlaceType.length

  const filteredPlaces = useMemo(() => {
    let result = places.filter(p => !p.is_event_only)
    if (selectedSports.length > 0) result = result.filter(p => selectedSports.some(s => p.sports?.includes(s)))
    if (selectedPlaceType.length > 0) result = result.filter(p => selectedPlaceType.includes((p.place_type || 'öffentlich') as PlaceType))
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q))
    }
    if (userLocation) {
      result = [...result].sort((a, b) =>
        calculateDistance(userLocation, { lat: a.latitude, lng: a.longitude }) -
        calculateDistance(userLocation, { lat: b.latitude, lng: b.longitude })
      )
    }
    return result.slice(0, MAX_RESULTS)
  }, [places, selectedSports, selectedPlaceType, query, userLocation])

  const filteredEvents = useMemo(() => {
    let result = events
    if (selectedSports.length > 0) result = result.filter(e => selectedSports.some(s => e.sports?.includes(s as SportType)))
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.place_name?.toLowerCase().includes(q) ||
        e.place_city?.toLowerCase().includes(q)
      )
    }
    return result
      .sort((a, b) => getNextOccurrence(a).getTime() - getNextOccurrence(b).getTime())
      .slice(0, MAX_RESULTS)
  }, [events, selectedSports, query])

  const toggleContentType = (type: 'orte' | 'events') => {
    if (type === 'orte') {
      if (showOrte && !showEvents) return
      setShowOrte(v => !v)
    } else {
      if (!showOrte && showEvents) return
      setShowEvents(v => !v)
    }
  }

  const handleFilterReset = () => {
    onSportsChange([])
    onPlaceTypeChange([])
    setShowOrte(true)
    setShowEvents(true)
  }

  const miniBarBase = "fixed inset-x-0 z-[200] rounded-t-[22px] border-t border-black/[.06] dark:border-white/[.08] bg-white/[.72] dark:bg-[#1C1C1E]/[.55] backdrop-blur-[24px] backdrop-saturate-[250%] shadow-[0_-8px_30px_rgba(0,0,0,0.18)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.30)]"

  return (
    <>
      {/* Persistent mini bar — always visible, z-[200] */}
      <div
        className={miniBarBase}
        style={{ bottom: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-[38px] rounded-full bg-black/[.18] dark:bg-white/[.18]" />
        </div>
        <div className="px-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => onReopen?.()}
            className="relative flex-1 h-11 flex items-center gap-2.5 pl-3 pr-3 rounded-xl bg-white/[.12] dark:bg-black/[.12] text-left active:opacity-70 transition-opacity"
            aria-label="Suche öffnen"
          >
            <Search className="h-[18px] w-[18px] text-foreground shrink-0" />
            <span className="text-[16px] text-muted-foreground flex-1 truncate">Sportplätze, Events, Stadt…</span>
            {hasActiveFilter && (
              <span className="shrink-0 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
          <button
            onClick={() => { onClose(); setFilterSheetOpen(true) }}
            className={cn(
              'relative h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-colors',
              hasActiveFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-black/[.06] dark:bg-white/[.08] active:bg-black/[.12] dark:active:bg-white/[.14] text-foreground'
            )}
            aria-label="Filter"
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary-foreground text-primary text-[10px] font-bold flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
          {onOpenFavorites && (
            <button
              onClick={() => { onClose(); onOpenFavorites() }}
              className="h-11 w-11 rounded-full bg-black/[.06] dark:bg-white/[.08] active:bg-black/[.12] dark:active:bg-white/[.14] flex items-center justify-center shrink-0 transition-colors text-foreground"
              aria-label="Gespeicherte Orte"
            >
              <Heart className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </div>

      {/* Full Vaul drawer — only when open */}
      <Drawer open={open} onOpenChange={(o) => !o && onClose()} modal={false} shouldScaleBackground={false}>
        <DrawerContent
          hideOverlay
          className="max-h-[97dvh] flex flex-col focus:outline-none"
          style={{
            bottom: keyboardHeight,
            maxHeight: `calc(97dvh - ${keyboardHeight}px)`,
          }}
        >
          <VisuallyHidden><DrawerTitle>Suche & Filter</DrawerTitle></VisuallyHidden>
          {/* Fixed header */}
          <div className="px-4 pt-2 pb-3 shrink-0 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Sportplätze, Events, Stadt…"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[.12] dark:bg-black/[.12] text-[16px] outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground border-0"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/30 flex items-center justify-center"
                    aria-label="Suche löschen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <button
                onClick={() => { onClose(); setFilterSheetOpen(true) }}
                className={cn(
                  'relative h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-colors',
                  hasActiveFilter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-black/[.06] dark:bg-white/[.08] active:bg-black/[.12] dark:active:bg-white/[.14] text-foreground'
                )}
                aria-label="Filter"
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary-foreground text-primary text-[10px] font-bold flex items-center justify-center leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {onOpenFavorites && (
                <button
                  onClick={() => { onClose(); onOpenFavorites() }}
                  className="h-11 w-11 rounded-full bg-black/[.06] dark:bg-white/[.08] active:bg-black/[.12] dark:active:bg-white/[.14] flex items-center justify-center shrink-0 transition-colors text-foreground"
                  aria-label="Gespeicherte Orte"
                >
                  <Heart className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable results */}
          <div className="flex-1 overflow-y-auto">
            {showOrte && filteredPlaces.map(place => (
              <PlaceRow
                key={place.id}
                place={place}
                userLocation={userLocation}
                isFavorite={favoriteIds.has(place.id)}
                onSelect={() => { onPlaceSelect(place); onClose() }}
              />
            ))}
            {showEvents && filteredEvents.map(event => (
              <EventRow key={event.id} event={event} isBookmarked={event.is_bookmarked} onClose={onClose} />
            ))}
            {(showOrte ? filteredPlaces.length : 0) + (showEvents ? filteredEvents.length : 0) === 0 && (
              <EmptyState text="Keine Ergebnisse gefunden." />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <FilterSheet
        open={filterSheetOpen}
        onBack={() => { setFilterSheetOpen(false); onReopen?.() }}
        onClose={() => setFilterSheetOpen(false)}
        selectedSports={selectedSports}
        onSportsChange={onSportsChange}
        selectedPlaceType={selectedPlaceType}
        onPlaceTypeChange={onPlaceTypeChange}
        showOrte={showOrte}
        showEvents={showEvents}
        onToggleContentType={toggleContentType}
        onReset={handleFilterReset}
      />
    </>
  )
}


function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function PlaceRow({ place, userLocation, isFavorite, onSelect }: {
  place: PlaceMarker
  userLocation: { lat: number; lng: number } | null
  isFavorite: boolean
  onSelect: () => void
}) {
  const primarySport = place.sports?.[0]
  const color = sportColors[primarySport ?? ''] || '#9CA3AF'
  const icon = sportIcons[primarySport ?? ''] || '📍'
  const dist = userLocation
    ? formatDistance(calculateDistance(userLocation, { lat: place.latitude, lng: place.longitude }))
    : null

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-black/[.05] dark:border-white/[.06] active:bg-black/[.03] dark:active:bg-white/[.03] transition-colors"
    >
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-semibold truncate">{place.name}</span>
        </div>
        <div className="text-[13px] text-muted-foreground truncate">
          {[place.city, dist].filter(Boolean).join(' · ')}
        </div>
      </div>
      {isFavorite && (
        <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
          <Heart className="h-2.5 w-2.5 fill-rose-500" />
          Gespeichert
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </button>
  )
}

function EventRow({ event, isBookmarked, onClose }: {
  event: EventWithDetails
  isBookmarked: boolean
  onClose: () => void
}) {
  const primarySport = event.sports?.[0] as string | undefined
  const color = sportColors[primarySport ?? ''] || '#6366f1'
  const icon = sportIcons[primarySport ?? ''] || '📅'
  const dateLabel = formatNextOccurrence(event)
  const location = event.place_city || event.place_name || null

  return (
    <a
      href={`/events/${event.id}`}
      onClick={onClose}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-black/[.05] dark:border-white/[.06] active:bg-black/[.03] dark:active:bg-white/[.03] transition-colors"
    >
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-semibold truncate">{event.title}</span>
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Event</span>
        </div>
        <div className="text-[13px] text-muted-foreground truncate">
          {[dateLabel, location].filter(Boolean).join(' · ')}
        </div>
      </div>
      {isBookmarked && <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0" />}
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </a>
  )
}
