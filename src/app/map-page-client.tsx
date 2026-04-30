'use client'

import { useState, useMemo, Suspense, useTransition, useDeferredValue, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { useProgressivePlaces } from '@/hooks/use-progressive-places'
import { database } from '@/lib/supabase/database'
import { SportType, PlaceMarker, Area } from '@/lib/supabase/types'
import { PlaceType } from '@/lib/utils/sport-utils'
import InstallBanner from '@/components/install/install-banner'

const LeafletCourtMap = dynamic(() => import('@/components/map/leaflet-court-map'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm" style={{ height: '100dvh' }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      <span className="text-sm font-medium text-foreground">Orte werden geladen…</span>
    </div>
  ),
})

function MapPage({ initialArea }: { initialArea?: Area | null }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [selectedSports, setSelectedSports] = useState<SportType[]>([])
  const [selectedPlaceType, setSelectedPlaceType] = useState<PlaceType | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<PlaceMarker | null>(null)
  const defaultFavoritesOpen = searchParams.get('favorites') === '1'
  const initialPlaceId = searchParams.get('place')

  const handleCourtSelect = (court: PlaceMarker) => {
    setSelectedPlace(court)
    startTransition(() => {
      router.replace(`/?place=${court.id}`, { scroll: false })
    })
  }

  const handleSheetClose = () => {
    router.replace('/', { scroll: false })
  }

  const savedPosition = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('map-position') || '') } catch { return null } })()
    : null

  const { places, isInitialLoading, isLoadingMore } = useProgressivePlaces(!loading)

  const { data: inlineEvents = [] } = useQuery({
    queryKey: ['inline-location-events'],
    queryFn: () => database.events.getInlineLocationEvents(),
    staleTime: 5 * 60 * 1000,
    enabled: !loading,
  })

  const allMarkers = useMemo(() => [...places, ...inlineEvents], [places, inlineEvents])

  const deferredSports = useDeferredValue(selectedSports)
  const deferredPlaceType = useDeferredValue(selectedPlaceType)

  // Only used for the pin count display — filtering is handled inside MarkerClusterGroup
  const visibleCount = useMemo(() => {
    return allMarkers.filter((marker) => {
      if (deferredSports.length > 0 && !deferredSports.some(sport => marker.sports?.includes(sport))) return false
      if (!marker.is_event_only && deferredPlaceType !== null && (marker.place_type || 'öffentlich') !== deferredPlaceType) return false
      return true
    }).length
  }, [allMarkers, deferredSports, deferredPlaceType])

  return (
    <div className="relative">
      <h1 className="sr-only">Kostenlose Sportplätze in deiner Nähe finden</h1>
      <h2 className="sr-only">Interaktive Karte mit über 13.000 Sportplätzen in Deutschland</h2>
      <LeafletCourtMap
        courts={allMarkers}
        onCourtSelect={handleCourtSelect}
        height="100dvh"
        selectedSports={selectedSports}
        onSportsChange={setSelectedSports}
        selectedPlaceType={selectedPlaceType}
        onPlaceTypeChange={setSelectedPlaceType}
        placesCount={visibleCount}
        defaultFavoritesOpen={defaultFavoritesOpen}
        onFavoritesClose={() => router.replace('/')}
        onSheetClose={handleSheetClose}
        initialCenter={savedPosition ? { lat: savedPosition.lat, lng: savedPosition.lng } : undefined}
        initialZoom={savedPosition?.zoom}
        initialPlaceId={initialPlaceId}
        initialArea={initialArea ?? undefined}
        trackPosition={true}
        isLoading={isInitialLoading}
      />
      <InstallBanner />
      {isLoadingMore && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-[1000] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow backdrop-blur-sm">
            <div className="h-3 w-3 animate-spin rounded-full border border-foreground border-t-transparent" />
            Weitere Orte werden geladen…
          </div>
        </div>
      )}
    </div>
  )
}

export default function MapPageClient({ initialArea }: { initialArea?: Area | null }) {
  return (
    <Suspense>
      <MapPage initialArea={initialArea} />
    </Suspense>
  )
}
