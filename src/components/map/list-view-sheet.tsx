'use client'

import { useState, useEffect, useLayoutEffect, useMemo } from 'react'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlaceMarker, EventForSearch, SportType } from '@/lib/supabase/types'
import { PlaceType } from '@/lib/utils/sport-utils'
import { calculateDistance } from '@/lib/utils/distance'
import { PlaceRow, EventRow } from './result-rows'
import { cn } from '@/lib/utils'
import L from 'leaflet'

const FULL_SNAP = 1
const MAX_LIST = 200

interface ListViewSheetProps {
  places: PlaceMarker[]
  events: EventForSearch[]
  mapBounds: L.LatLngBoundsLiteral | null
  mapCenter: { lat: number; lng: number } | null
  userLocation: { lat: number; lng: number } | null
  onPlaceSelect: (place: PlaceMarker) => void
  onEventSelect: (event: EventForSearch) => void
  selectedContentTypes: ('orte' | 'events')[]
  selectedSports: SportType[]
  selectedPlaceType: PlaceType[]
  onFullOpenChange?: (open: boolean) => void
}

export default function ListViewSheet({
  places,
  events,
  mapBounds,
  mapCenter,
  userLocation,
  onPlaceSelect,
  onEventSelect,
  selectedContentTypes,
  selectedSports,
  selectedPlaceType,
  onFullOpenChange,
}: ListViewSheetProps) {
  const [miniSnap, setMiniSnap] = useState('124px')
  const [activeSnapPoint, setActiveSnapPoint] = useState<string | number>('124px')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isFullOpen = activeSnapPoint === FULL_SNAP

  useLayoutEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;bottom:0;left:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden'
    document.body.appendChild(probe)
    const safeArea = probe.offsetHeight
    document.body.removeChild(probe)
    const snap = `${124 + safeArea}px`
    setMiniSnap(snap)
    setActiveSnapPoint(snap)
  }, [])

  useEffect(() => { setDrawerOpen(true) }, [])

  useEffect(() => { onFullOpenChange?.(isFullOpen) }, [isFullOpen, onFullOpenChange])

  const showOrte = selectedContentTypes.length === 0 || selectedContentTypes.includes('orte')
  const showEvents = selectedContentTypes.length === 0 || selectedContentTypes.includes('events')

  const visibleItems = useMemo(() => {
    if (!mapBounds) return []

    const [[south, west], [north, east]] = mapBounds
    const ref = mapCenter ?? { lat: (south + north) / 2, lng: (west + east) / 2 }

    const items: Array<{ type: 'place'; data: PlaceMarker; dist: number | null } | { type: 'event'; data: EventForSearch; dist: number | null }> = []

    if (showOrte) {
      for (const p of places) {
        if (p.is_event_only) continue
        if (p.latitude < south || p.latitude > north || p.longitude < west || p.longitude > east) continue
        if (selectedSports.length > 0 && !selectedSports.some(s => p.sports?.includes(s))) continue
        if (selectedPlaceType.length > 0 && !selectedPlaceType.includes((p.place_type || 'öffentlich') as PlaceType)) continue
        items.push({ type: 'place', data: p, dist: calculateDistance(ref, { lat: p.latitude, lng: p.longitude }) })
      }
    }

    if (showEvents) {
      for (const e of events) {
        const lat = e.inline_location?.latitude ?? e.place_latitude ?? null
        const lng = e.inline_location?.longitude ?? e.place_longitude ?? null
        if (lat === null || lng === null) continue
        if (lat < south || lat > north || lng < west || lng > east) continue
        if (selectedSports.length > 0 && !selectedSports.some(s => e.sports?.includes(s))) continue
        items.push({ type: 'event', data: e, dist: calculateDistance(ref, { lat, lng }) })
      }
    }

    return items.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity)).slice(0, MAX_LIST)
  }, [places, events, mapBounds, mapCenter, showOrte, showEvents, selectedSports, selectedPlaceType])

  const count = visibleItems.length
  const countLabel = count >= MAX_LIST
    ? `${MAX_LIST}+ Plätze`
    : count === 1
      ? '1 Ort gefunden'
      : `${count} Plätze gefunden`

  return (
    <Drawer
      open={drawerOpen}
      onOpenChange={(o) => {
        if (!o) setActiveSnapPoint(miniSnap)
      }}
      modal={false}
      shouldScaleBackground={false}
      snapPoints={[miniSnap, FULL_SNAP]}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={(snap) => {
        setActiveSnapPoint(snap ?? miniSnap)
      }}
    >
      <DrawerContent
        hideOverlay
        className="h-[100dvh] flex flex-col focus:outline-none max-w-2xl mx-auto"
        style={{ zIndex: 1099 }}
      >
        <VisuallyHidden><DrawerTitle>Orte in dieser Ansicht</DrawerTitle></VisuallyHidden>

        {/* Mini header — always visible */}
        <div
          className={cn('px-4 pt-2 pb-3 shrink-0 flex items-center justify-between', !isFullOpen && 'cursor-pointer' && 'pt-0 h-[36px]')}
          onClick={() => !isFullOpen && setActiveSnapPoint(FULL_SNAP)}
        >
          <span className="text-[14px] font-medium text-muted-foreground select-none">
            {countLabel}
          </span>
          <Button
            variant="glass-secondary"
            size="icon"
            className={cn('rounded-full h-9 w-9 shrink-0', !isFullOpen && 'invisible pointer-events-none')}
            onClick={(e) => { e.stopPropagation(); setActiveSnapPoint(miniSnap) }}
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Results list — rendered but hidden at mini snap so snap points work */}
        <div className={cn('relative flex-1 min-h-0', !isFullOpen && 'invisible')}>
          <div className="h-full overflow-y-auto" style={{ paddingBottom: isFullOpen ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : undefined }}>
            {visibleItems.map((item) =>
              item.type === 'place' ? (
                <PlaceRow
                  key={item.data.id}
                  place={item.data}
                  distanceKm={item.dist}
                  isFavorite={false}
                  onSelect={() => {
                    setActiveSnapPoint(miniSnap)
                    onPlaceSelect(item.data)
                  }}
                />
              ) : (
                <EventRow
                  key={item.data.id}
                  event={item.data}
                  distanceKm={item.dist}
                  isBookmarked={item.data.is_bookmarked ?? false}
                  onSelect={onEventSelect}
                  onClose={() => setActiveSnapPoint(miniSnap)}
                />
              )
            )}
            {visibleItems.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Keine Orte in dieser Kartenansicht.
              </div>
            )}
          </div>

        </div>
      </DrawerContent>
    </Drawer>
  )
}
