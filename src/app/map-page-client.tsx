'use client'

import { useState, Suspense, useEffect, useMemo, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { useProgressivePlaces } from '@/hooks/use-progressive-places'
import { database } from '@/lib/supabase/database'
import { SportType, PlaceMarker, EventForSearch, Area } from '@/lib/supabase/types'
import { PlaceType } from '@/lib/utils/sport-utils'
import Link from 'next/link'
import { MapPin, Calendar, SlidersHorizontal } from 'lucide-react'
import InstallBanner from '@/components/install/install-banner'
import MenuSheet from '@/components/layout/menu-sheet'
import SearchSheet from '@/components/map/search-sheet'
import BottomNavBar from '@/components/map/bottom-nav-bar'
import ListViewSheet from '@/components/map/list-view-sheet'
import FilterSheet from '@/components/map/filter-sheet'
import type { LeafletCourtMapHandle } from '@/components/map/leaflet-court-map'
import type L from 'leaflet'

const LeafletCourtMap = dynamic(() => import('@/components/map/leaflet-court-map'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm" style={{ height: '100dvh' }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      <span className="text-sm font-medium text-foreground">Orte werden geladen…</span>
    </div>
  ),
})

// Add popup bottom offset — just above the nav bar (56px) + gap
const POPUP_BOTTOM = 'calc(68px + env(safe-area-inset-bottom, 0px))'

function MapPage({ initialArea }: { initialArea?: Area | null }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.background = 'transparent'
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.background = ''
    }
  }, [])

  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedSports, setSelectedSports] = useState<SportType[]>([])
  const [selectedPlaceType, setSelectedPlaceType] = useState<PlaceType[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [searchSheetOpen, setSearchSheetOpen] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedContentTypes, setSelectedContentTypes] = useState<('orte' | 'events')[]>([])
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsLiteral | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [listViewFullOpen, setListViewFullOpen] = useState(false)
  const [filterDirectOpen, setFilterDirectOpen] = useState(false)

  const mapHandleRef = useRef<LeafletCourtMapHandle | null>(null)
  const handleMapReady = useCallback((handle: LeafletCourtMapHandle) => {
    mapHandleRef.current = handle
  }, [])

  const defaultFavoritesOpen = searchParams.get('favorites') === '1'
  const initialPlaceId = searchParams.get('place')

  useEffect(() => {
    if (!menuOpen) return
    const raf = requestAnimationFrame(() => { document.body.style.pointerEvents = 'auto' })
    return () => cancelAnimationFrame(raf)
  }, [menuOpen])

  useEffect(() => {
    const raf = requestAnimationFrame(() => { document.body.style.pointerEvents = 'auto' })
    return () => cancelAnimationFrame(raf)
  }, [searchSheetOpen])

  const handleAddPlace = () => {
    setAddOpen(false)
    try {
      const stored = sessionStorage.getItem('map-position')
      if (stored) {
        const { lat, lng, zoom } = JSON.parse(stored)
        router.push(`/new?lat=${lat}&lng=${lng}&zoom=${zoom}`)
        return
      }
    } catch {}
    router.push('/new')
  }

  const handleCourtSelect = (court: PlaceMarker) => {
    router.replace(`/?place=${court.id}`, { scroll: false })
  }

  const handleSheetClose = () => {
    router.replace('/', { scroll: false })
  }

  const savedPosition = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('map-position') || '') } catch { return null } })()
    : null

  const { places, isInitialLoading, isLoadingMore } = useProgressivePlaces(!loading)

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventForSearch[]>({
    queryKey: ['events-for-search', user?.id],
    queryFn: () => database.events.getEventsForSearch(user?.id),
    staleTime: 5 * 60 * 1000,
    enabled: !loading,
  })

  const inlineMarkers = useMemo<PlaceMarker[]>(() =>
    events
      .filter(e => !e.place_id && e.inline_location?.latitude && e.inline_location?.longitude)
      .map(e => ({
        id: e.id,
        name: e.title,
        latitude: e.inline_location!.latitude,
        longitude: e.inline_location!.longitude,
        sports: e.sports,
        is_event_only: true,
      })),
    [events]
  )

  const allMarkers = [...places, ...inlineMarkers]

  return (
    <>
      <div className="relative h-[100dvh] overflow-hidden">
        <h1 className="sr-only">Kostenlose Sportplätze in deiner Nähe finden</h1>
        <h2 className="sr-only">Interaktive Karte mit über 13.000 Sportplätzen in Deutschland</h2>
        <LeafletCourtMap
          courts={allMarkers}
          events={events}
          eventsLoading={eventsLoading}
          onCourtSelect={handleCourtSelect}
          height="100%"
          selectedSports={selectedSports}
          onSportsChange={setSelectedSports}
          selectedPlaceType={selectedPlaceType}
          onPlaceTypeChange={setSelectedPlaceType}
          defaultFavoritesOpen={defaultFavoritesOpen}
          onFavoritesClose={() => router.replace('/')}
          onSheetClose={handleSheetClose}
          initialCenter={savedPosition ? { lat: savedPosition.lat, lng: savedPosition.lng } : undefined}
          initialZoom={savedPosition?.zoom}
          initialPlaceId={initialPlaceId}
          initialArea={initialArea ?? undefined}
          trackPosition={true}
          isLoading={isInitialLoading}
          externalFilterOpen={searchSheetOpen}
          onExternalFilterOpenChange={setSearchSheetOpen}
          selectedContentTypes={selectedContentTypes}
          onUserLocationChange={setUserLocation}
          onReady={handleMapReady}
          onBoundsChange={(bounds, center) => { setMapBounds(bounds); setMapCenter(center) }}
        />
        <InstallBanner />
        {isLoadingMore && (
          <div className="pointer-events-none absolute left-1/2 z-[1000] -translate-x-1/2" style={{ bottom: 'calc(192px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow backdrop-blur-sm">
              <div className="h-3 w-3 animate-spin rounded-full border border-foreground border-t-transparent" />
              Weitere Orte werden geladen…
            </div>
          </div>
        )}
      </div>

      <BottomNavBar
        onMenuOpen={() => setMenuOpen(true)}
        onSearchOpen={() => setSearchSheetOpen(true)}
        onFavoritesOpen={() => mapHandleRef.current?.openFavorites()}
        onAddOpen={() => setAddOpen(v => !v)}
        addOpen={addOpen}
      />

      {/* Floating filter button — always visible above the mini list sheet */}
      <button
        onClick={() => setFilterDirectOpen(true)}
        className="fixed z-[1100] flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-[0_2px_16px_rgba(0,0,0,0.14)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.30)] text-[14px] font-semibold active:scale-95 transition-transform"
        style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))', right: '12px' }}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filter
        {(selectedSports.length + selectedPlaceType.length + selectedContentTypes.length) > 0 && (
          <span className="h-[18px] min-w-[18px] px-1 rounded-full bg-white/25 text-[10px] font-bold flex items-center justify-center leading-none">
            {selectedSports.length + selectedPlaceType.length + selectedContentTypes.length}
          </span>
        )}
      </button>

      {/* Add popup backdrop — closes popup on outside tap */}
      {addOpen && (
        <div
          className="fixed inset-0 z-[1103]"
          onClick={() => setAddOpen(false)}
        />
      )}

      {/* Add popup — anchored just above the nav bar */}
      {addOpen && (
        <div
          className="fixed z-[1104] w-[248px] rounded-2xl overflow-hidden glass-surface border border-black/[.06] dark:border-white/[.08] shadow-[0_8px_30px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.30)] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150"
          style={{ right: '16px', bottom: POPUP_BOTTOM }}
        >
          <button
            onClick={handleAddPlace}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-black/[.06] dark:border-white/[.06] active:bg-black/[.04] dark:active:bg-white/[.04] transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <MapPin className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-[14px] font-semibold leading-tight">Ort erstellen</div>
              <div className="text-[12px] text-muted-foreground leading-tight mt-0.5">Neuen Sportplatz hinzufügen</div>
            </div>
          </button>
          <Link
            href="/events/new"
            onClick={() => setAddOpen(false)}
            className="flex items-center gap-3 px-4 py-3.5 text-left active:bg-black/[.04] dark:active:bg-white/[.04] transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
              <Calendar className="h-[18px] w-[18px] text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-[14px] font-semibold leading-tight">Event erstellen</div>
              <div className="text-[12px] text-muted-foreground leading-tight mt-0.5">Veranstaltung organisieren</div>
            </div>
          </Link>
        </div>
      )}

      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} onOpenFavorites={() => mapHandleRef.current?.openFavorites()} />

      {/* Tap-outside overlay: closes search sheet when full-open */}
      {searchSheetOpen && !filterDirectOpen && (
        <div className="fixed inset-0 z-[1099]" onClick={() => setSearchSheetOpen(false)} />
      )}

      <SearchSheet
        open={searchSheetOpen}
        onOpen={() => setSearchSheetOpen(true)}
        onClose={() => setSearchSheetOpen(false)}
        places={allMarkers}
        events={events}
        eventsLoading={eventsLoading}
        userLocation={userLocation}
        onPlaceSelect={(court) => mapHandleRef.current?.selectCourt(court)}
        onEventSelect={(event) => {
          const markerId = event.place_id ?? event.id
          const marker = allMarkers.find(m => m.id === markerId)
          if (marker) mapHandleRef.current?.selectCourt(marker)
        }}
        onLocationSelect={(lat, lng, zoom) => mapHandleRef.current?.flyTo(lat, lng, zoom)}
        onOpenFavorites={() => mapHandleRef.current?.openFavorites()}
      />

      <FilterSheet
        open={filterDirectOpen}
        onClose={() => setFilterDirectOpen(false)}
        selectedSports={selectedSports}
        onSportsChange={setSelectedSports}
        selectedPlaceType={selectedPlaceType}
        onPlaceTypeChange={setSelectedPlaceType}
        selectedContentTypes={selectedContentTypes}
        onContentTypesChange={setSelectedContentTypes}
        onReset={() => { setSelectedSports([]); setSelectedPlaceType([]); setSelectedContentTypes([]) }}
      />

      <ListViewSheet
        places={allMarkers}
        events={events}
        mapBounds={mapBounds}
        mapCenter={mapCenter}
        userLocation={userLocation}
        selectedSports={selectedSports}
        selectedPlaceType={selectedPlaceType}
        onPlaceSelect={(court) => {
          router.replace(`/?place=${court.id}`, { scroll: false })
          mapHandleRef.current?.selectCourt(court)
        }}
        onEventSelect={(event) => {
          const markerId = event.place_id ?? event.id
          const marker = allMarkers.find(m => m.id === markerId)
          if (marker) {
            router.replace(`/?place=${marker.id}`, { scroll: false })
            mapHandleRef.current?.selectCourt(marker)
          }
        }}
        selectedContentTypes={selectedContentTypes}
        onFullOpenChange={setListViewFullOpen}
        snapToMini={searchSheetOpen && listViewFullOpen}
      />
    </>
  )
}

export default function MapPageClient({ initialArea }: { initialArea?: Area | null }) {
  return (
    <Suspense>
      <MapPage initialArea={initialArea} />
    </Suspense>
  )
}
