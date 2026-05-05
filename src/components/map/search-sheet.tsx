'use client'

import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Search, ArrowLeft, X, ChevronRight, Heart, SlidersHorizontal, MapPin } from 'lucide-react'
import FilterSheet from './filter-sheet'
import { SportType, PlaceMarker, EventForSearch, EventSchedule, GeocodingResult } from '@/lib/supabase/types'
import {
  sportIcons,
  sportNames,
  PlaceType,
} from '@/lib/utils/sport-utils'
import { calculateDistance, formatDistance } from '@/lib/utils/distance'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { useKeyboardHeight } from '@/hooks/use-keyboard-height'
import { useDebouncedValue } from '@/lib/utils/debounce'
import { useGeocodingSearch } from '@/hooks/use-geocoding-search'

const MAX_RESULTS = 50
const FULL_SNAP = 1
const SPORT_KEYWORDS = new Set(Object.keys(sportNames).map(k => k.toLowerCase()))

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT: Record<string, string> = {
  monday: 'Mo', tuesday: 'Di', wednesday: 'Mi',
  thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So',
}

function getNextOccurrence(event: EventForSearch): Date {
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

function formatNextOccurrence(event: EventForSearch): string {
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

type SearchResult =
  | { type: 'location'; data: GeocodingResult; score: number }
  | { type: 'place'; data: PlaceMarker; distanceKm: number | null; score: number }
  | { type: 'event'; data: EventForSearch; score: number }

function parseQuery(q: string): { sportTokens: string[]; textTokens: string[] } {
  const tokens = q.split(/\s+/).filter(Boolean)
  return {
    sportTokens: tokens.filter(t => SPORT_KEYWORDS.has(t)),
    textTokens: tokens.filter(t => !SPORT_KEYWORDS.has(t)),
  }
}

function textScore(name: string, secondary: string, q: string): number {
  const n = name.toLowerCase()
  const s = secondary.toLowerCase()
  if (n === q) return 30
  if (n.startsWith(q)) return 20
  if (n.split(/\s+/).some(w => w.startsWith(q))) return 10
  if (n.includes(q) || s.includes(q)) return 5
  return 1
}

function distanceScore(km: number | null): number {
  if (km === null) return 0.5
  return 1 / (1 + km)
}

function eventTimeScore(event: EventForSearch): number {
  const hoursUntil = (getNextOccurrence(event).getTime() - Date.now()) / 3_600_000
  if (hoursUntil < 0) return 0
  return 1 / (1 + hoursUntil / 24)
}

interface SearchSheetProps {
  open: boolean
  onClose: () => void
  selectedSports: SportType[]
  onSportsChange: (sports: SportType[]) => void
  selectedPlaceType: PlaceType[]
  onPlaceTypeChange: (types: PlaceType[]) => void
  places: PlaceMarker[]
  events?: EventForSearch[]
  eventsLoading?: boolean
  userLocation: { lat: number; lng: number } | null
  onPlaceSelect: (place: PlaceMarker) => void
  onLocationSelect: (lat: number, lng: number, zoom: number) => void
  onOpen?: () => void
  onInnerFilterChange?: (open: boolean) => void
  onOpenFavorites?: () => void
  showOrte?: boolean
  showEvents?: boolean
  onShowOrteChange?: (v: boolean) => void
  onShowEventsChange?: (v: boolean) => void
}

export default function SearchSheet({
  open,
  onClose,
  selectedSports,
  onSportsChange,
  selectedPlaceType,
  onPlaceTypeChange,
  places,
  events: eventsProp = [],
  eventsLoading = false,
  userLocation,
  onPlaceSelect,
  onLocationSelect,
  onOpen,
  onInnerFilterChange,
  onOpenFavorites,
  showOrte: showOrteProp,
  showEvents: showEventsProp,
  onShowOrteChange,
  onShowEventsChange,
}: SearchSheetProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 200)
  const { results: geoResults } = useGeocodingSearch(query)
  const [localShowOrte, setLocalShowOrte] = useState(true)
  const [localShowEvents, setLocalShowEvents] = useState(true)
  const showOrte = showOrteProp ?? localShowOrte
  const showEvents = showEventsProp ?? localShowEvents
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const filterOpenedFromFull = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const keyboardHeight = useKeyboardHeight()

  // Snap point: 80px content + measured safe-area-inset-bottom
  const [miniSnap, setMiniSnap] = useState('80px')
  const [activeSnapPoint, setActiveSnapPoint] = useState<string | number>('80px')
  const isFullOpen = activeSnapPoint === FULL_SNAP
  // Vaul needs to see false → true to properly initialize at the mini snap position
  const [drawerOpen, setDrawerOpen] = useState(false)

  useLayoutEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;bottom:0;left:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden'
    document.body.appendChild(probe)
    const safeArea = probe.offsetHeight
    document.body.removeChild(probe)
    const snap = `${80 + safeArea}px`
    setMiniSnap(snap)
    setActiveSnapPoint(prev => prev !== FULL_SNAP ? snap : prev)
  }, [])

  useEffect(() => {
    setDrawerOpen(true)
  }, [])

  // Sync external open prop → snap point
  useEffect(() => {
    setActiveSnapPoint(open ? FULL_SNAP : miniSnap)
  }, [open, miniSnap])

  const closeSheet = useCallback(() => {
    setActiveSnapPoint(miniSnap)
    onClose()
  }, [miniSnap, onClose])

  const focusInput = useCallback(() => { inputRef.current?.focus() }, [])

  useEffect(() => { onInnerFilterChange?.(filterSheetOpen) }, [filterSheetOpen, onInnerFilterChange])

  const onOpenRef = useRef(onOpen)
  useEffect(() => { onOpenRef.current = onOpen })
  useEffect(() => {
    if (isFullOpen) onOpenRef.current?.()
  }, [isFullOpen])

  useEffect(() => {
    if (isFullOpen) {
      const t = setTimeout(focusInput, 320)
      return () => clearTimeout(t)
    } else {
      setQuery('')
    }
  }, [isFullOpen, focusInput])

  const events = eventsProp

  const { data: favoriteIds = new Set<string>() } = useQuery({
    queryKey: ['favorite-ids', user?.id],
    queryFn: async () => {
      const favs = await database.favorites.getFavorites(user!.id)
      return new Set(favs.map(f => f.place_id))
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user && isFullOpen,
  })

  const hasActiveFilter = selectedSports.length > 0 || selectedPlaceType.length > 0 || !showOrte || !showEvents
  const activeFilterCount = selectedSports.length + selectedPlaceType.length + (!showOrte ? 1 : 0) + (!showEvents ? 1 : 0)

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    const hasQuery = q.length > 0
    const merged: SearchResult[] = []

    if (hasQuery) {
      geoResults.forEach((r, i) => {
        merged.push({
          type: 'location',
          data: r,
          score: textScore(r.shortName, r.subtitle ?? '', q) + (1 - i * 0.1),
        })
      })
    }

    const { sportTokens, textTokens } = hasQuery ? parseQuery(q) : { sportTokens: [], textTokens: [] }
    const scoreQuery = textTokens.length > 0 ? textTokens.join(' ') : q

    if (showOrte) {
      let ps = places.filter(p => !p.is_event_only)
      if (selectedSports.length > 0) ps = ps.filter(p => selectedSports.some(s => p.sports?.includes(s)))
      if (selectedPlaceType.length > 0) ps = ps.filter(p => selectedPlaceType.includes((p.place_type || 'öffentlich') as PlaceType))
      if (hasQuery) {
        ps = ps.filter(p => {
          const sportMatch = sportTokens.length === 0 || sportTokens.some(s => p.sports?.includes(s))
          const textMatch = textTokens.length === 0 || textTokens.some(t =>
            p.name.toLowerCase().includes(t) || p.city?.toLowerCase().includes(t)
          )
          return sportMatch && textMatch
        })
      }
      for (const place of ps) {
        const distanceKm = userLocation
          ? calculateDistance(userLocation, { lat: place.latitude, lng: place.longitude })
          : null
        const ds = distanceScore(distanceKm)
        merged.push({
          type: 'place',
          data: place,
          distanceKm,
          score: hasQuery ? textScore(place.name, place.city ?? '', scoreQuery) + ds : ds,
        })
      }
    }

    if (showEvents) {
      let es = events
      if (selectedSports.length > 0) es = es.filter(e => selectedSports.some(s => e.sports?.includes(s as SportType)))
      if (hasQuery) {
        es = es.filter(e => {
          const sportMatch = sportTokens.length === 0 || sportTokens.some(s => e.sports?.includes(s as SportType))
          const textMatch = textTokens.length === 0 || textTokens.some(t =>
            e.title.toLowerCase().includes(t) ||
            e.place_name?.toLowerCase().includes(t) ||
            e.place_city?.toLowerCase().includes(t)
          )
          return sportMatch && textMatch
        })
      }
      for (const event of es) {
        const ths = eventTimeScore(event)
        merged.push({
          type: 'event',
          data: event,
          score: hasQuery ? textScore(event.title, event.place_city ?? event.place_name ?? '', scoreQuery) + ths : ths,
        })
      }
    }

    return merged.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)
  }, [places, events, geoResults, selectedSports, selectedPlaceType, debouncedQuery, userLocation, showOrte, showEvents])

  const toggleContentType = (type: 'orte' | 'events') => {
    if (type === 'orte') {
      if (showOrte && !showEvents) return
      const next = !showOrte
      if (onShowOrteChange) onShowOrteChange(next)
      else setLocalShowOrte(next)
    } else {
      if (!showOrte && showEvents) return
      const next = !showEvents
      if (onShowEventsChange) onShowEventsChange(next)
      else setLocalShowEvents(next)
    }
  }

  const handleFilterReset = () => {
    onSportsChange([])
    onPlaceTypeChange([])
    if (onShowOrteChange) onShowOrteChange(true)
    else setLocalShowOrte(true)
    if (onShowEventsChange) onShowEventsChange(true)
    else setLocalShowEvents(true)
  }

  const showEventsSkeleton = showEvents && eventsLoading && events.length === 0
  const showEmptyState = results.length === 0 && !showEventsSkeleton && isFullOpen
    && (debouncedQuery.trim().length > 0 || hasActiveFilter)

  return (
    <>
      <Drawer
        open={drawerOpen}
        onOpenChange={(o) => {
          if (!o) {
            // User swiped past mini — snap back to mini instead of fully closing
            setActiveSnapPoint(miniSnap)
            onClose()
          }
        }}
        modal={false}
        shouldScaleBackground={false}
        snapPoints={[miniSnap, FULL_SNAP]}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={(snap) => {
          const next = snap ?? miniSnap
          setActiveSnapPoint(next)
          if (next !== FULL_SNAP) onClose()
        }}
      >
        <DrawerContent
          hideOverlay
          className="h-[100dvh] flex flex-col focus:outline-none max-w-2xl mx-auto"
          style={keyboardHeight > 0 ? {
            bottom: keyboardHeight,
            height: `calc(100dvh - ${keyboardHeight}px)`,
          } : undefined}
        >
          <VisuallyHidden><DrawerTitle>Suche & Filter</DrawerTitle></VisuallyHidden>

          {/* Header — always visible at mini snap */}
          <div className="px-4 pb-3 shrink-0 flex items-center gap-2">
            {isFullOpen ? (
              <div className="relative flex-1">
                <button
                  onClick={() => { closeSheet(); inputRef.current?.blur() }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-muted-foreground active:text-foreground transition-colors"
                  aria-label="Suche schließen"
                >
                  <ArrowLeft className="h-[18px] w-[18px]" />
                </button>
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
            ) : (
              <button
                onClick={() => setActiveSnapPoint(FULL_SNAP)}
                className="relative flex-1 h-11 flex items-center gap-2.5 pl-3 pr-3 rounded-xl bg-white/[.12] dark:bg-black/[.12] text-left active:opacity-70 transition-opacity"
                aria-label="Suche öffnen"
              >
                <Search className="h-[18px] w-[18px] text-foreground shrink-0" />
                <span className="text-[16px] text-muted-foreground flex-1 truncate">Sportplätze, Events, Stadt…</span>
              </button>
            )}
            <Button
              variant={hasActiveFilter ? 'default' : 'glass-secondary'}
              size="icon"
              className="relative rounded-full h-11 w-11 shrink-0"
              onClick={() => { filterOpenedFromFull.current = isFullOpen; if (!isFullOpen) onClose(); setFilterSheetOpen(true) }}
              aria-label="Filter"
            >
              <SlidersHorizontal className="h-[18px] w-[18px]" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary-foreground text-primary text-[10px] font-bold flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {onOpenFavorites && (
              <Button
                variant="glass-secondary"
                size="icon"
                className="rounded-full h-11 w-11 shrink-0"
                onClick={() => { if (!isFullOpen) onClose(); onOpenFavorites() }}
                aria-label="Gespeicherte Orte"
              >
                <Heart className="h-[18px] w-[18px]" />
              </Button>
            )}
          </div>

          {/* Scrollable results — always rendered so drawer fills 100dvh for snap points to work */}
          <div className={cn('flex-1 overflow-y-auto', !isFullOpen && 'invisible')}>
            {results.map(result =>
              result.type === 'location' ? (
                <LocationRow
                  key={result.data.id}
                  result={result.data}
                  onSelect={() => { onLocationSelect(result.data.lat, result.data.lng, result.data.zoom); closeSheet() }}
                />
              ) : result.type === 'place' ? (
                <PlaceRow
                  key={result.data.id}
                  place={result.data}
                  distanceKm={result.distanceKm}
                  isFavorite={favoriteIds.has(result.data.id)}
                  onSelect={() => { onPlaceSelect(result.data); closeSheet() }}
                />
              ) : (
                <EventRow key={result.data.id} event={result.data} isBookmarked={result.data.is_bookmarked} onClose={closeSheet} />
              )
            )}
            {showEventsSkeleton && <EventsLoadingIndicator />}
            {showEmptyState && <EmptyState text="Keine Ergebnisse gefunden." />}
          </div>
        </DrawerContent>
      </Drawer>

      <FilterSheet
        open={filterSheetOpen}
        onBack={() => { setFilterSheetOpen(false); if (filterOpenedFromFull.current) setActiveSnapPoint(FULL_SNAP) }}
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


function LocationRow({ result, onSelect }: {
  result: GeocodingResult
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-black/[.05] dark:border-white/[.06] active:bg-black/[.03] dark:active:bg-white/[.03] transition-colors"
    >
      <div className="h-10 w-20 rounded-xl flex items-center justify-center shrink-0 glass-chip">
        <MapPin className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold truncate">{result.shortName}</div>
        {result.subtitle && (
          <div className="text-[13px] text-muted-foreground truncate">{result.subtitle}</div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function EventsLoadingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-4 text-[13px] text-muted-foreground">
      <div className="h-3.5 w-3.5 animate-spin rounded-full border border-muted-foreground/50 border-t-transparent shrink-0" />
      Events werden geladen…
    </div>
  )
}

function SportIconBox({ sports }: { sports: string[] }) {
  const visible = sports.length <= 3 ? sports : sports.slice(0, 2)
  const overflow = sports.length > 3 ? sports.length - 2 : 0

  return (
    <div className="h-10 w-20 rounded-xl flex items-center justify-center shrink-0 glass-chip">
      {visible.map((s, i) => (
        <span key={i} className="text-base leading-none">{sportIcons[s] ?? '📍'}</span>
      ))}
      {overflow > 0 && (
        <span className="text-[11px] font-bold text-muted-foreground leading-none">+{overflow}</span>
      )}
    </div>
  )
}

function PlaceRow({ place, distanceKm, isFavorite, onSelect }: {
  place: PlaceMarker
  distanceKm: number | null
  isFavorite: boolean
  onSelect: () => void
}) {
  const dist = distanceKm !== null ? formatDistance(distanceKm) : null

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-black/[.05] dark:border-white/[.06] active:bg-black/[.03] dark:active:bg-white/[.03] transition-colors"
    >
      <SportIconBox sports={place.sports ?? []} />
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
  event: EventForSearch
  isBookmarked: boolean
  onClose: () => void
}) {
  const dateLabel = formatNextOccurrence(event)
  const location = event.place_city || event.place_name || null

  return (
    <a
      href={`/events/${event.id}`}
      onClick={onClose}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-black/[.05] dark:border-white/[.06] active:bg-black/[.03] dark:active:bg-white/[.03] transition-colors"
    >
      <SportIconBox sports={(event.sports ?? []) as string[]} />
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
