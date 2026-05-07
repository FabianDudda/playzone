'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { X, CircleX, ChevronRight, MapPin } from 'lucide-react'
import { SportType, PlaceMarker, EventForSearch, GeocodingResult } from '@/lib/supabase/types'
import {
  sportNames,
  PlaceType,
} from '@/lib/utils/sport-utils'
import { calculateDistance } from '@/lib/utils/distance'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { useKeyboardHeight } from '@/hooks/use-keyboard-height'
import { useDebouncedValue } from '@/lib/utils/debounce'
import { useGeocodingSearch } from '@/hooks/use-geocoding-search'
import { PlaceRow, EventRow } from './result-rows'

const MAX_RESULTS = 50
const SPORT_KEYWORDS = new Set(Object.keys(sportNames).map(k => k.toLowerCase()))



type SearchResult =
  | { type: 'location'; data: GeocodingResult; score: number }
  | { type: 'place'; data: PlaceMarker; distanceKm: number | null; score: number }
  | { type: 'event'; data: EventForSearch; distanceKm: number | null; score: number }

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
  onEventSelect?: (event: EventForSearch) => void
  onLocationSelect: (lat: number, lng: number, zoom: number) => void
  onOpen?: () => void
  onFilterOpen?: () => void
  onOpenFavorites?: () => void
  selectedContentTypes?: ('orte' | 'events')[]
  onContentTypesChange?: (types: ('orte' | 'events')[]) => void
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
  onEventSelect,
  onLocationSelect,
  onOpen,
  onFilterOpen,
  onOpenFavorites,
  selectedContentTypes: selectedContentTypesProp,
  onContentTypesChange,
}: SearchSheetProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 200)
  const { results: geoResults } = useGeocodingSearch(query)
  const [localContentTypes, setLocalContentTypes] = useState<('orte' | 'events')[]>([])
  const effectiveContentTypes = selectedContentTypesProp ?? localContentTypes
  const showOrte = effectiveContentTypes.length === 0 || effectiveContentTypes.includes('orte')
  const showEvents = effectiveContentTypes.length === 0 || effectiveContentTypes.includes('events')
  const inputRef = useRef<HTMLInputElement>(null)
  const keyboardHeight = useKeyboardHeight()

  const closeSheet = useCallback(() => {
    inputRef.current?.blur()
    onClose()
  }, [onClose])

  const focusInput = useCallback(() => { inputRef.current?.focus() }, [])

  const onOpenRef = useRef(onOpen)
  useEffect(() => { onOpenRef.current = onOpen })
  useEffect(() => {
    if (open) onOpenRef.current?.()
  }, [open])

  useEffect(() => {
    if (open) {
      const t = setTimeout(focusInput, 320)
      return () => clearTimeout(t)
    } else {
      setQuery('')
    }
  }, [open, focusInput])

  const events = eventsProp

  const { data: favoriteIds = new Set<string>() } = useQuery({
    queryKey: ['favorite-ids', user?.id],
    queryFn: async () => {
      const favs = await database.favorites.getFavorites(user!.id)
      return new Set(favs.map(f => f.place_id))
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user && open,
  })

  const hasActiveFilter = selectedSports.length > 0 || selectedPlaceType.length > 0 || effectiveContentTypes.length > 0
  const activeFilterCount = selectedSports.length + selectedPlaceType.length + effectiveContentTypes.length

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
        const favBoost = favoriteIds.has(place.id) ? (hasQuery ? 2 : 0.5) : 0
        merged.push({
          type: 'place',
          data: place,
          distanceKm,
          score: hasQuery ? textScore(place.name, place.city ?? '', scoreQuery) + ds + favBoost : ds + favBoost,
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
        const coords = event.inline_location
          ? { lat: event.inline_location.latitude, lng: event.inline_location.longitude }
          : event.place_latitude !== null && event.place_longitude !== null
            ? { lat: event.place_latitude, lng: event.place_longitude }
            : null
        const distanceKm = userLocation && coords ? calculateDistance(userLocation, coords) : null
        const ds = distanceScore(distanceKm)
        const bookmarkBoost = event.is_bookmarked ? (hasQuery ? 2 : 0.5) : 0
        merged.push({
          type: 'event',
          data: event,
          distanceKm,
          score: hasQuery ? textScore(event.title, event.place_city ?? event.place_name ?? '', scoreQuery) + ds + bookmarkBoost : ds + bookmarkBoost,
        })
      }
    }

    return merged.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)
  }, [places, events, geoResults, selectedSports, selectedPlaceType, debouncedQuery, userLocation, showOrte, showEvents])

  const toggleContentType = (type: 'orte' | 'events') => {
    const next = effectiveContentTypes.includes(type)
      ? effectiveContentTypes.filter(t => t !== type)
      : [...effectiveContentTypes, type]
    if (onContentTypesChange) onContentTypesChange(next)
    else setLocalContentTypes(next)
  }

  const showEventsSkeleton = showEvents && eventsLoading && events.length === 0
  const showEmptyState = results.length === 0 && !showEventsSkeleton && open
    && (debouncedQuery.trim().length > 0 || hasActiveFilter)

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(o) => { if (!o) onClose() }}
        modal={false}
        shouldScaleBackground={false}
      >
        <DrawerContent
          hideOverlay
          className="h-[100dvh] flex flex-col focus:outline-none max-w-2xl mx-auto"
          style={keyboardHeight > 0 ? {
            zIndex: 1102,
            bottom: keyboardHeight,
            height: `calc(100dvh - ${keyboardHeight}px)`,
          } : { zIndex: 1102 }}
        >
          <VisuallyHidden><DrawerTitle>Suche & Filter</DrawerTitle></VisuallyHidden>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-2 pb-3 shrink-0 gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.blur() }}
                enterKeyHint="search"
                placeholder="Orte, Plätze, Events"
                className="w-full h-11 pl-3 pr-10 rounded-xl bg-white/[.12] dark:bg-black/[.12] text-[16px] outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground border-0"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-muted-foreground"
                  aria-label="Suche löschen"
                >
                  <CircleX className="h-5 w-5" />
                </button>
              )}
            </div>
            <Button variant="glass-secondary" size="icon" className="rounded-full h-9 w-9 shrink-0" onClick={closeSheet} aria-label="Schließen">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable results */}
          <div className="flex-1 overflow-y-auto">
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
                <EventRow key={result.data.id} event={result.data} distanceKm={result.distanceKm} isBookmarked={result.data.is_bookmarked} onSelect={onEventSelect} onClose={closeSheet} />
              )
            )}
            {showEventsSkeleton && <EventsLoadingIndicator />}
            {showEmptyState && <EmptyState text="Keine Ergebnisse gefunden." />}
          </div>
        </DrawerContent>
      </Drawer>

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

