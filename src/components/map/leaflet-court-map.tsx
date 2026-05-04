'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { Court, SportType, PlaceWithCourts, PlaceMarker, EventForSearch, Area } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
// import FilterBottomSheet from './filter-bottom-sheet'
import { Plus, MapPin, Navigation, Share2, Search, Filter, Edit, Pencil, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import SearchFilterSheet from './search-filter-sheet'
import PlaceBottomSheetVaul from './place-bottom-sheet-v2'
import FavoritesBottomSheetVaul from './favorites-bottom-sheet-vaul'
import { sportNames, getSportBadgeClasses, sportIcons, PlaceType } from '@/lib/utils/sport-utils'
import { createSportIcon, createEventOnlyIcon, createUserLocationIcon, createSelectedLocationIcon } from '@/lib/utils/sport-styles'
import { MAP_LAYERS, DEFAULT_LAYER_ID, createTileLayer, getSavedLayerPreference, saveLayerPreference } from '@/lib/utils/map-layers'
import { getDistanceText } from '@/lib/utils/distance'
import { cn } from '@/lib/utils'
import L from 'leaflet'
import MarkerClusterGroup from './marker-cluster-group'
import AreaBanner from './area-banner'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'
import './cluster-styles.css'
import './map-controls.css'

interface LeafletCourtMapProps {
  courts: PlaceMarker[]
  events?: EventForSearch[]
  eventsLoading?: boolean
  onCourtSelect?: (court: PlaceMarker) => void
  onMapClick?: (lng: number, lat: number) => void
  height?: string
  allowAddCourt?: boolean
  selectedLocation?: { lat: number; lng: number } | null
  enableClustering?: boolean
  selectedSports?: SportType[]
  selectedPlaceType?: PlaceType[]
  onSportsChange?: (sports: SportType[]) => void
  onPlaceTypeChange?: (types: PlaceType[]) => void
  placesCount?: number
  showAddCourtButton?: boolean
  onAddCourtClick?: () => void
  showFilter?: boolean
  showFavorite?: boolean
  disableMarkerClick?: boolean
  defaultFavoritesOpen?: boolean
  onFavoritesClose?: () => void
  onSheetClose?: () => void
  initialCenter?: { lat: number; lng: number }
  initialZoom?: number
  initialPlaceId?: string | null
  trackPosition?: boolean
  embedded?: boolean
  isLoading?: boolean
  initialArea?: Area
  // External filter control — when provided, filter sheet is fully controlled from outside
  externalFilterOpen?: boolean
  onExternalFilterOpenChange?: (open: boolean) => void
}

// Attach a wheel listener that stops both propagation and default scroll/zoom.
// Called once per stack element (guarded by a data attribute).
function blockWheelOnStack(el: HTMLElement) {
  if (el.dataset.wheelBlocked) return
  el.dataset.wheelBlocked = '1'
  el.addEventListener('wheel', (e) => {
    e.stopPropagation()
    e.preventDefault()
  }, { passive: false })
}

// Component to handle map clicks
function MapClickHandler({ 
  onMapClick, 
  allowAddCourt, 
  onCloseFilterSheet,
  onCloseMapPinSheet 
}: { 
  onMapClick?: (lng: number, lat: number) => void, 
  allowAddCourt: boolean,
  onCloseFilterSheet?: () => void,
  onCloseMapPinSheet?: () => void
}) {
  useMapEvents({
    click: (e) => {
      // console.log('🗺️ Map click detected - closing sheets')
      // Close both sheets on any map click (but not marker clicks)
      if (onCloseFilterSheet) {
        onCloseFilterSheet()
      }
      if (onCloseMapPinSheet) {
        onCloseMapPinSheet()
      }
      
      // Handle add court clicks
      if (allowAddCourt && onMapClick) {
        onMapClick(e.latlng.lng, e.latlng.lat)
      }
    }
  })
  return null
}


// Component to track map position and persist to sessionStorage
function MapPositionTracker({ enabled }: { enabled: boolean }) {
  useMapEvents({
    moveend: (e) => {
      if (!enabled) return
      const center = e.target.getCenter()
      const zoom = e.target.getZoom()
      sessionStorage.setItem('map-position', JSON.stringify({ lat: center.lat, lng: center.lng, zoom }))
    },
  })
  return null
}


// Fit map to a named area's bounding box on first render
function FitBoundsHandler({ area }: { area: Area }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(
      [[area.min_lat, area.min_lng], [area.max_lat, area.max_lng]],
      { animate: false }
    )
    // Strip ?area param so back-button and session storage work cleanly
    const url = new URL(window.location.href)
    url.searchParams.delete('area')
    window.history.replaceState(null, '', url.toString())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}


// Component to handle filter button in top right corner
function FilterButtonHandler({ onFilterClick, isFilterActive }: { onFilterClick: () => void, isFilterActive: boolean }) {
  const map = useMap()
  const callbackRef = useRef(onFilterClick)
  useEffect(() => { callbackRef.current = onFilterClick }, [onFilterClick])

  // Create DOM once
  useEffect(() => {
    let topRightStack = map.getContainer().querySelector('.map-control-top-right-stack') as HTMLElement
    if (!topRightStack) {
      topRightStack = L.DomUtil.create('div', 'map-control-top-right-stack')
      map.getContainer().appendChild(topRightStack)
    }
    blockWheelOnStack(topRightStack)

    const filterContainer = L.DomUtil.create('div', 'leaflet-control-filter')
    const filterButton = L.DomUtil.create('button', 'filter-button map-control-button', filterContainer)
    filterButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </svg>
    `
    filterButton.title = 'Filter'

    L.DomEvent.on(filterButton, 'click', (e) => {
      L.DomEvent.preventDefault(e)
      callbackRef.current()
    })
    L.DomEvent.disableClickPropagation(filterContainer)
    L.DomEvent.disableScrollPropagation(filterContainer)
    topRightStack.appendChild(filterContainer)

    return () => { filterContainer.remove() }
  }, [map])

  // Update active dot via DOM mutation — no teardown
  useEffect(() => {
    const button = map.getContainer().querySelector('.leaflet-control-filter .filter-button')
    if (!button) return
    const existing = button.querySelector('.filter-active-dot')
    if (isFilterActive && !existing) {
      const dot = document.createElement('span')
      dot.className = 'filter-active-dot'
      button.appendChild(dot)
    } else if (!isFilterActive && existing) {
      existing.remove()
    }
  }, [map, isFilterActive])

  return null
}

// Component to handle favorites button in top right corner below filter
function FavoritesButtonHandler({ onClick }: { onClick: () => void }) {
  const map = useMap()
  const callbackRef = useRef(onClick)
  useEffect(() => { callbackRef.current = onClick }, [onClick])

  useEffect(() => {
    let topRightStack = map.getContainer().querySelector('.map-control-top-right-stack') as HTMLElement
    if (!topRightStack) {
      topRightStack = L.DomUtil.create('div', 'map-control-top-right-stack')
      map.getContainer().appendChild(topRightStack)
    }
    blockWheelOnStack(topRightStack)

    const container = L.DomUtil.create('div', 'leaflet-control-favorites')
    const button = L.DomUtil.create('button', 'favorites-button map-control-button', container)
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    `
    button.title = 'Saved Places'

    L.DomEvent.on(button, 'click', (e) => {
      L.DomEvent.preventDefault(e)
      callbackRef.current()
    })
    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)
    topRightStack.appendChild(container)

    return () => { container.remove() }
  }, [map])

  return null
}

// Combined glass pill: layer toggle (left) + locate/follow (right)
function MapControlPill({
  onLocationFound,
  autoLocate,
  currentLayerId,
  onLayerChange,
}: {
  onLocationFound: (lat: number, lng: number) => void
  autoLocate: boolean
  currentLayerId: string
  onLayerChange: (layerId: string) => void
}) {
  const map = useMap()
  const callbackRef = useRef(onLocationFound)
  const currentLayerIdRef = useRef(currentLayerId)
  const onLayerChangeRef = useRef(onLayerChange)
  useEffect(() => { callbackRef.current = onLocationFound }, [onLocationFound])
  useEffect(() => { currentLayerIdRef.current = currentLayerId }, [currentLayerId])
  useEffect(() => { onLayerChangeRef.current = onLayerChange }, [onLayerChange])

  const [isFollowing, setIsFollowing] = useState(false)
  const followModeRef = useRef(false)
  const watchIdRef = useRef<number | null>(null)
  const accuracyCircleRef = useRef<L.Circle | null>(null)

  // Auto-locate silently on mount when no explicit center is provided
  useEffect(() => {
    if (!autoLocate || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords
        callbackRef.current(lat, lng)
        if (!map) return
        map.setView([lat, lng], 14)
        try { localStorage.setItem('user-location-cache', JSON.stringify({ lat, lng })) } catch {}
        if (!accuracyCircleRef.current) {
          accuracyCircleRef.current = L.circle([lat, lng], {
            radius: accuracy,
            color: '#4F9CF9',
            fillColor: '#4F9CF9',
            fillOpacity: 0.15,
            weight: 1,
          }).addTo(map)
        }
      },
      () => {}
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current)
      if (accuracyCircleRef.current) { accuracyCircleRef.current.remove(); accuracyCircleRef.current = null }
    }
  }, [])

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const exitFollow = useCallback(() => {
    followModeRef.current = false
    setIsFollowing(false)
    stopWatch()
  }, [stopWatch])

  useEffect(() => {
    map.on('dragstart', exitFollow)
    return () => { map.off('dragstart', exitFollow) }
  }, [map, exitFollow])

  const updateLocation = useCallback((lat: number, lng: number, accuracy: number) => {
    callbackRef.current(lat, lng)
    try { localStorage.setItem('user-location-cache', JSON.stringify({ lat, lng })) } catch {}
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng([lat, lng])
      accuracyCircleRef.current.setRadius(accuracy)
    } else {
      accuracyCircleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#4F9CF9',
        fillColor: '#4F9CF9',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map)
    }
  }, [map])

  const handleLayerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const cycle = ['light', 'voyager']
    const nextIndex = (cycle.indexOf(currentLayerIdRef.current) + 1) % cycle.length
    onLayerChangeRef.current(cycle[nextIndex])
  }, [])

  const handleLocateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!navigator.geolocation) return
    if (followModeRef.current) { exitFollow(); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        updateLocation(lat, lng, accuracy)
        map.setView([lat, lng], Math.max(map.getZoom(), 14))
        followModeRef.current = true
        setIsFollowing(true)
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            updateLocation(p.coords.latitude, p.coords.longitude, p.coords.accuracy)
            if (followModeRef.current) map.setView([p.coords.latitude, p.coords.longitude], map.getZoom())
          },
          () => exitFollow()
        )
      },
      (error) => console.warn('Could not get user location:', error)
    )
  }, [map, exitFollow, updateLocation])

  return createPortal(
    <div
      className="fixed z-[1000]"
      style={{ top: 'calc(16px + env(safe-area-inset-top, 0px))', right: '16px' }}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      <div className="flex flex-col items-center w-11 rounded-[100px] overflow-hidden border border-black/[.06] dark:border-white/[.08] bg-white/[.72] dark:bg-[#1C1C1E]/[.55] backdrop-blur-[24px] backdrop-saturate-[250%] shadow-[0_2px_16px_rgba(0,0,0,0.14)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.30)]">
        <button className="pill-btn pill-btn-layer" title="Toggle Map Style" onClick={handleLayerClick}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
        </button>
        <div className="pill-divider" />
        <button className={cn('pill-btn pill-btn-locate', isFollowing && 'pill-btn-locate--follow')} title="Find my location" onClick={handleLocateClick}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </button>
      </div>
    </div>,
    document.body
  )
}

// Component to handle custom attribution control positioned at bottom-left corner
function AttributionControlHandler({ attribution }: { attribution: string }) {
  const map = useMap()

  // Create DOM once — appended directly to map container, not the stack
  useEffect(() => {
    const container = L.DomUtil.create('div', 'leaflet-control-attribution leaflet-control map-attribution-corner')
    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)
    map.getContainer().appendChild(container)

    return () => { container.remove() }
  }, [map])

  // Update text via DOM mutation — no teardown
  useEffect(() => {
    const container = map.getContainer().querySelector('.map-attribution-corner') as HTMLElement | null
    if (container) container.innerHTML = attribution
  }, [map, attribution])

  return null
}

// Component to display places count above attribution
function PlacesCountHandler({ count }: { count: number }) {
  const map = useMap()

  // Create DOM once
  useEffect(() => {
    let bottomLeftStack = map.getContainer().querySelector('.map-control-bottom-left-stack') as HTMLElement
    if (!bottomLeftStack) {
      bottomLeftStack = L.DomUtil.create('div', 'map-control-bottom-left-stack')
      map.getContainer().appendChild(bottomLeftStack)
    }

    const container = L.DomUtil.create('div', 'leaflet-control-places-count')
    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)
    bottomLeftStack.appendChild(container)

    return () => { container.remove() }
  }, [map])

  // Update text via DOM mutation — no teardown
  useEffect(() => {
    const container = map.getContainer().querySelector('.leaflet-control-places-count') as HTMLElement | null
    if (container) container.innerHTML = `${count} Plätze gefunden`
  }, [map, count])

  return null
}

// Component to handle add court button positioned above locate button
function AddCourtButtonHandler({ onAddCourtClick, user }: { onAddCourtClick: () => void, user: any }) {
  const map = useMap()
  const callbackRef = useRef(onAddCourtClick)
  useEffect(() => { callbackRef.current = onAddCourtClick }, [onAddCourtClick])

  useEffect(() => {
    let topRightStack = map.getContainer().querySelector('.map-control-top-right-stack') as HTMLElement
    if (!topRightStack) {
      topRightStack = L.DomUtil.create('div', 'map-control-top-right-stack')
      map.getContainer().appendChild(topRightStack)
    }
    blockWheelOnStack(topRightStack)

    const addCourtContainer = L.DomUtil.create('div', 'leaflet-control-add-court')
    const addCourtButton = L.DomUtil.create('button', 'add-court-button map-control-button', addCourtContainer)
    addCourtButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    `
    addCourtButton.title = 'Ort hinzufügen'

    L.DomEvent.on(addCourtButton, 'click', (e) => {
      L.DomEvent.preventDefault(e)
      callbackRef.current()
    })
    L.DomEvent.disableClickPropagation(addCourtContainer)
    L.DomEvent.disableScrollPropagation(addCourtContainer)
    topRightStack.appendChild(addCourtContainer)

    return () => { addCourtContainer.remove() }
  }, [map])

  return null
}


function FlyToHandler({ target, onDone }: { target: { lat: number; lng: number; zoom?: number }, onDone: () => void }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([target.lat, target.lng], target.zoom ?? Math.max(map.getZoom(), 16), { animate: true, duration: 1.2 })
    onDone()
  }, [map, target, onDone])
  return null
}

export default function LeafletCourtMap({
  courts,
  events = [],
  eventsLoading = false,
  onCourtSelect,
  onMapClick,
  height = '400px',
  allowAddCourt = false,
  selectedLocation = null,
  enableClustering = true,
  selectedSports = [],
  selectedPlaceType = [],
  onSportsChange,
  onPlaceTypeChange,
  placesCount = 0,
  showAddCourtButton = false,
  onAddCourtClick,
  showFilter = true,
  showFavorite = true,
  disableMarkerClick = false,
  defaultFavoritesOpen = false,
  onFavoritesClose,
  onSheetClose,
  initialCenter,
  initialZoom,
  initialPlaceId = null,
  trackPosition = false,
  embedded = false,
  isLoading = false,
  initialArea,
  externalFilterOpen,
  onExternalFilterOpenChange,
}: LeafletCourtMapProps) {
  const { user, profile } = useAuth()

  const { data: placeIdsWithEvents = new Set<string>() } = useQuery({
    queryKey: ['place-ids-with-events'],
    queryFn: async () => {
      const ids = await database.events.getPlaceIdsWithEvents()
      return new Set(ids)
    },
    staleTime: 5 * 60 * 1000,
  })

  const [selectedCourt, setSelectedCourt] = useState<PlaceMarker | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const [currentLayerId, setCurrentLayerId] = useState<string>(() => getSavedLayerPreference())
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [localFilterOpen, setLocalFilterOpen] = useState(false)
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(defaultFavoritesOpen)
  const [showOrte, setShowOrte] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const isClosingExplicitly = useRef(false)
  const isClosingFilterExplicitly = useRef(false)
  const isBottomSheetOpenRef = useRef(false)
  const isFilterSheetOpenRef = useRef(false)
  const isFavoritesOpenRef = useRef(false)

  // Filter open state: controlled externally when externalFilterOpen prop is provided
  const isFilterSheetOpen = externalFilterOpen !== undefined ? externalFilterOpen : localFilterOpen
  const setIsFilterSheetOpen = useCallback((open: boolean) => {
    setLocalFilterOpen(open)
    onExternalFilterOpenChange?.(open)
  }, [onExternalFilterOpenChange])

  // Keep refs in sync so stable callbacks can read current values
  isBottomSheetOpenRef.current = isBottomSheetOpen
  isFilterSheetOpenRef.current = isFilterSheetOpen
  isFavoritesOpenRef.current = isFavoritesOpen

  // Vaul renders via @radix-ui/react-dialog which sets pointer-events:none on the body
  // when its DismissableLayer fires (modal=true by default in Radix, regardless of vaul's modal=false).
  // Restore pointer-events so the map remains pannable. The search drawer is always mounted
  // (mini snap), so we always restore — no early-return condition.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      document.body.style.pointerEvents = 'auto'
    })
    return () => cancelAnimationFrame(raf)
  }, [isBottomSheetOpen, isFilterSheetOpen, isFavoritesOpen])

  const handleCourtSelect = useCallback((court: PlaceMarker) => {
    if (disableMarkerClick) return
    if (isFilterSheetOpenRef.current) setIsFilterSheetOpen(false)
    if (isFavoritesOpenRef.current) setIsFavoritesOpen(false)
    setSelectedCourt(court)
    if (!embedded && !isBottomSheetOpenRef.current) setIsBottomSheetOpen(true)
    onCourtSelect?.(court)
  }, [onCourtSelect, disableMarkerClick, embedded])


  const handleFavoriteSelect = useCallback((court: PlaceMarker) => {
    setFlyToTarget({ lat: court.latitude, lng: court.longitude })
    handleCourtSelect(court)
  }, [handleCourtSelect])

  // Open and zoom to a shared place link (?place=<id>) — runs only once
  const initialPlaceHandled = useRef(false)
  useEffect(() => {
    if (!initialPlaceId || courts.length === 0 || initialPlaceHandled.current) return
    const court = courts.find(c => c.id === initialPlaceId)
    if (court) {
      initialPlaceHandled.current = true
      handleFavoriteSelect(court)
    }
  }, [initialPlaceId, courts, handleFavoriteSelect])

  const handleExplicitClose = useCallback(() => {
    // console.log('🗂️ Explicit close requested - clearing selection and closing sheet')
    setSelectedCourt(null)
    setIsBottomSheetOpen(false)
    onSheetClose?.()
  }, [onSheetClose])

  const handleExplicitFilterClose = useCallback(() => {
    // console.log('🗂️ Explicit filter close requested')
    isClosingFilterExplicitly.current = true
    setIsFilterSheetOpen(false)
  }, [])

  const handleLocationFound = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng })
  }, [])

  const handleLocationSelect = useCallback((lat: number, lng: number, zoom: number) => {
    setFlyToTarget({ lat, lng, zoom })
  }, [])

  const handleLayerChange = useCallback((layerId: string) => {
    setCurrentLayerId(layerId)
    saveLayerPreference(layerId)
  }, [])



  // Default center (Germany) — prefer explicit prop, then localStorage cache, then country default
  const defaultCenter: [number, number] = [51.165691, 10.451526]
  let mapCenter: [number, number] = defaultCenter
  let mapZoom = initialZoom ?? 7
  if (initialCenter) {
    mapCenter = [initialCenter.lat, initialCenter.lng]
    mapZoom = initialZoom ?? 13
  } else if (!initialArea) {
    try {
      const cached = localStorage.getItem('user-location-cache')
      if (cached) {
        const { lat, lng } = JSON.parse(cached)
        mapCenter = [lat, lng]
        mapZoom = initialZoom ?? 13
      }
    } catch {}
  }
  const autoLocate = !initialCenter && !initialArea

  const visibleCourts = useMemo(() =>
    courts.filter(c => (c as any).is_event_only ? showEvents : showOrte),
    [courts, showOrte, showEvents]
  )

  // Get current layer configuration (memoized)
  const currentLayer = useMemo(() => MAP_LAYERS[currentLayerId] || MAP_LAYERS[DEFAULT_LAYER_ID], [currentLayerId])

  return (
    <div className={`relative${embedded ? ' map-embedded' : ''}`} style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
      >
          {/* Dynamic tile layer based on user selection */}
          <TileLayer
            attribution={currentLayer.attribution}
            url={currentLayer.url}
            maxZoom={currentLayer.maxZoom}
            {...(currentLayer.subdomains !== undefined && currentLayer.subdomains.length > 0 && { subdomains: currentLayer.subdomains })}
          />
          
          {/* Track map position for "Hinzufügen" nav */}
          <MapPositionTracker enabled={trackPosition} />

          {/* Fit to named area bounds on first load */}
          {initialArea && <FitBoundsHandler area={initialArea} />}

          {/* Court markers - with optional clustering */}
          {useMemo(() => {
            if (enableClustering && courts.length > 10) {
              return (
                <MarkerClusterGroup
                  courts={courts}
                  onCourtSelect={handleCourtSelect}
                  selectedCourt={selectedCourt}
                  selectedSports={selectedSports}
                  selectedPlaceType={selectedPlaceType}
                  placeIdsWithEvents={placeIdsWithEvents}
                  showOrte={showOrte}
                  showEvents={showEvents}
                />
              )
            }

            // Individual markers when not clustering — filter inline (few markers, trivial cost)
            const sportFiltered = visibleCourts.filter(c => {
              if (selectedSports.length > 0 && !selectedSports.some(s => c.sports?.includes(s))) return false
              if (selectedPlaceType.length > 0 && !selectedPlaceType.includes((c.place_type || 'öffentlich') as PlaceType)) return false
              return true
            })
            return sportFiltered.map((court) => {
              const allSports = court.sports || []
              const matchingSports = allSports.filter(s => selectedSports.includes(s))
              const sportsForIcon = selectedSports.length === 0 ? allSports : matchingSports.length > 0 ? matchingSports : allSports

              const isSelected = selectedCourt?.id === court.id
              const icon = (court as any).is_event_only
                ? createEventOnlyIcon(sportsForIcon, isSelected)
                : createSportIcon(sportsForIcon, isSelected, placeIdsWithEvents.has(court.id))

              return (
              <Marker
                key={court.id}
                position={[court.latitude, court.longitude]}
                icon={icon}
                eventHandlers={{
                  click: (e) => {
                    // console.log('📍 Regular marker clicked:', {
                    //   courtId: court.id,
                    //   eventPropagationStopped: true
                    // })
                    e.originalEvent.stopPropagation()
                    handleCourtSelect(court)
                  }
                }}
              />
            )
            })
          }, [enableClustering, courts, visibleCourts, selectedSports, selectedPlaceType, handleCourtSelect, placeIdsWithEvents, selectedCourt])}
          
          {/* Selected court overlay marker — rendered outside MarkerClusterGroup so React owns the icon.
              Only used in embedded mode: the full map's MarkerClusterGroup already handles selected state
              imperatively via setIcon, so the overlay would stack two identical markers there. */}
          {selectedCourt && embedded && enableClustering && courts.length > 10 && (
            <Marker
              key={`selected-overlay-${selectedCourt.id}`}
              position={[selectedCourt.latitude, selectedCourt.longitude]}
              icon={(selectedCourt as any).is_event_only
                ? createEventOnlyIcon(
                    selectedSports.length === 0
                      ? (selectedCourt.sports || [])
                      : (selectedCourt.sports || []).filter(s => selectedSports.includes(s)).length > 0
                        ? (selectedCourt.sports || []).filter(s => selectedSports.includes(s))
                        : (selectedCourt.sports || []),
                    true
                  )
                : createSportIcon(
                    selectedSports.length === 0
                      ? (selectedCourt.sports || [])
                      : (selectedCourt.sports || []).filter(s => selectedSports.includes(s)).length > 0
                        ? (selectedCourt.sports || []).filter(s => selectedSports.includes(s))
                        : (selectedCourt.sports || []),
                    true,
                    placeIdsWithEvents.has(selectedCourt.id)
                  )}
              zIndexOffset={2000}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation()
                  handleCourtSelect(selectedCourt)
                }
              }}
            />
          )}

          {/* User location marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createUserLocationIcon()}
            />
          )}
          
          {/* Selected location marker (for adding courts) */}
          {selectedLocation && (
            <Marker 
              position={[selectedLocation.lat, selectedLocation.lng]}
              icon={createSelectedLocationIcon()}
            />
          )}
          
          {/* Handle map clicks */}
          <MapClickHandler 
            onMapClick={onMapClick} 
            allowAddCourt={allowAddCourt} 
            onCloseFilterSheet={handleExplicitFilterClose}
            onCloseMapPinSheet={() => {
              // console.log('🗺️ Explicitly closing map pin sheet via map click')
              handleExplicitClose()
            }}
          />
          
          {/* Glass pill: layer toggle + locate */}
          <MapControlPill
            onLocationFound={handleLocationFound}
            autoLocate={autoLocate}
            currentLayerId={currentLayerId}
            onLayerChange={handleLayerChange}
          />

          {/* Fly to target when selected from favorites */}
          {flyToTarget && <FlyToHandler target={flyToTarget} onDone={() => setFlyToTarget(null)} />}

          {/* Custom attribution control */}
          <AttributionControlHandler attribution={currentLayer.attribution} />
        </MapContainer>
      
      {/* Area banner — shown when map was opened via ?area= QR link */}
      {initialArea && initialArea.name && <AreaBanner area={initialArea} />}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          <span className="text-sm font-medium text-foreground">Orte werden geladen…</span>
        </div>
      )}

      {/* Add court instruction */}
      {allowAddCourt && (
        <div className="absolute top-4 right-4 bg-white/90 rounded-lg p-2 text-sm shadow-lg">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Plus className="h-3 w-3" />
            Karte antippen, um Ort hinzuzufügen
          </div>
        </div>
      )}

      {/* Bottom Sheet for Court Details — vaul Drawer */}
      <PlaceBottomSheetVaul
        isOpen={isBottomSheetOpen}
        onOpenChange={setIsBottomSheetOpen}
        selectedCourt={selectedCourt}
        userLocation={userLocation}
        user={user}
        profile={profile}
        showFavorite={showFavorite}
      />

      {/* Filter + Search Sheet */}
      <SearchFilterSheet
        open={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        selectedSports={selectedSports}
        onSportsChange={onSportsChange ?? (() => {})}
        selectedPlaceType={selectedPlaceType}
        onPlaceTypeChange={onPlaceTypeChange ?? (() => {})}
        places={courts}
        events={events}
        eventsLoading={eventsLoading}
        userLocation={userLocation}
        onPlaceSelect={handleCourtSelect}
        onLocationSelect={handleLocationSelect}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        showOrte={showOrte}
        showEvents={showEvents}
        onShowOrteChange={setShowOrte}
        onShowEventsChange={setShowEvents}
      />

      {/* Favorites Bottom Sheet — vaul Drawer */}
      <FavoritesBottomSheetVaul
        isOpen={isFavoritesOpen}
        onOpenChange={(open) => {
          setIsFavoritesOpen(open)
          if (!open) onFavoritesClose?.()
        }}
        onBack={() => {
          setIsFavoritesOpen(false)
          setIsFilterSheetOpen(true)
        }}
        user={user}
        userLocation={userLocation}
        onPlaceSelect={handleFavoriteSelect}
      />

      {/* OLD Sheet-based bottom sheets (commented out for vaul testing)
      <Sheet
        open={isBottomSheetOpen}
        onOpenChange={(open) => {
          if (open === false) {
            if (isClosingExplicitly.current) { isClosingExplicitly.current = false; return }
            if (selectedCourt) return
          }
          setIsBottomSheetOpen(open)
        }}
        modal={false}
      >
        <SheetContent side="bottom" className="border-0 h-auto max-w-2xl mx-auto rounded-t-xl" hideOverlay onClose={handleExplicitClose}>
          ... (original place sheet content)
        </SheetContent>
      </Sheet>

      <FilterBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={(open) => {
          if (open === false) {
            if (isClosingFilterExplicitly.current) { isClosingFilterExplicitly.current = false; return }
            if (isFilterSheetOpen) return
          }
          setIsFilterSheetOpen(open)
        }}
        onExplicitClose={handleExplicitFilterClose}
        selectedSport={selectedSport}
        onSportChange={onSportChange}
      />
      */}
    </div>
  )
}