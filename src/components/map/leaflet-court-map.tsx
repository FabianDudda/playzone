'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { Court, SportType, PlaceWithCourts, PlaceMarker, Area } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
// import FilterBottomSheet from './filter-bottom-sheet'
import { Plus, MapPin, Navigation, Share2, Search, Filter, Edit, Pencil, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import FilterBottomSheetVaul from './filter-bottom-sheet-vaul'
import PlaceBottomSheetVaul from './place-bottom-sheet-v2'
import FavoritesBottomSheetVaul from './favorites-bottom-sheet-vaul'
import { sportNames, getSportBadgeClasses, sportIcons, PlaceType } from '@/lib/utils/sport-utils'
import { createSportIcon, createUserLocationIcon, createSelectedLocationIcon } from '@/lib/utils/sport-styles'
import { MAP_LAYERS, DEFAULT_LAYER_ID, createTileLayer, getSavedLayerPreference, saveLayerPreference } from '@/lib/utils/map-layers'
import { getDistanceText } from '@/lib/utils/distance'
import L from 'leaflet'
import MarkerClusterGroup from './marker-cluster-group'
import AreaBanner from './area-banner'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'
import './cluster-styles.css'
import './map-controls.css'

interface LeafletCourtMapProps {
  courts: PlaceMarker[]
  onCourtSelect?: (court: PlaceMarker) => void
  onMapClick?: (lng: number, lat: number) => void
  height?: string
  allowAddCourt?: boolean
  selectedLocation?: { lat: number; lng: number } | null
  enableClustering?: boolean
  selectedSports?: SportType[]
  selectedPlaceType?: PlaceType | null
  // Filter props
  onSportsChange?: (sports: SportType[]) => void
  onPlaceTypeChange?: (type: PlaceType | null) => void
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

// Component to handle user location with auto-locate, follow mode, and accuracy circle
function UserLocationHandler({
  onLocationFound,
  autoLocate,
}: {
  onLocationFound: (lat: number, lng: number) => void
  autoLocate: boolean
}) {
  const map = useMap()
  const callbackRef = useRef(onLocationFound)
  useEffect(() => { callbackRef.current = onLocationFound }, [onLocationFound])

  const followModeRef = useRef(false)
  const watchIdRef = useRef<number | null>(null)
  const accuracyCircleRef = useRef<L.Circle | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // Auto-locate silently on mount when no explicit center is provided
  useEffect(() => {
    if (!autoLocate || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords
        callbackRef.current(lat, lng)
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
      () => {} // silent failure — user can still tap the button manually
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Cleanup watch and circle on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current)
      if (accuracyCircleRef.current) { accuracyCircleRef.current.remove(); accuracyCircleRef.current = null }
    }
  }, [])

  // Button + follow mode setup (DOM created once)
  useEffect(() => {
    const setButtonActive = (active: boolean) => {
      buttonRef.current?.classList.toggle('location-button--follow', active)
    }

    const stopWatch = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }

    const exitFollow = () => {
      followModeRef.current = false
      setButtonActive(false)
      stopWatch()
    }

    const updateUI = (lat: number, lng: number, accuracy: number) => {
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
    }

    const handleClick = () => {
      if (!navigator.geolocation) return

      if (followModeRef.current) {
        exitFollow()
        return
      }

      // Locate once, fly to position, then enter live follow mode
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords
          updateUI(lat, lng, accuracy)
          map.setView([lat, lng], Math.max(map.getZoom(), 14))

          followModeRef.current = true
          setButtonActive(true)
          watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => {
              updateUI(p.coords.latitude, p.coords.longitude, p.coords.accuracy)
              if (followModeRef.current) map.setView([p.coords.latitude, p.coords.longitude], map.getZoom())
            },
            () => exitFollow()
          )
        },
        (error) => console.warn('Could not get user location:', error)
      )
    }

    // Exit follow mode when user manually pans
    map.on('dragstart', exitFollow)

    let bottomRightStack = map.getContainer().querySelector('.map-control-bottom-right-stack') as HTMLElement
    if (!bottomRightStack) {
      bottomRightStack = L.DomUtil.create('div', 'map-control-bottom-right-stack')
      map.getContainer().appendChild(bottomRightStack)
    }
    blockWheelOnStack(bottomRightStack)

    const locationContainer = L.DomUtil.create('div', 'leaflet-control-location-modern')
    const locationButton = L.DomUtil.create('button', 'location-button map-control-button', locationContainer) as HTMLButtonElement
    buttonRef.current = locationButton
    locationButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    `
    locationButton.title = 'Find my location'

    L.DomEvent.on(locationButton, 'click', L.DomEvent.preventDefault)
    L.DomEvent.on(locationButton, 'click', handleClick)
    L.DomEvent.disableClickPropagation(locationContainer)
    L.DomEvent.disableScrollPropagation(locationContainer)
    bottomRightStack.appendChild(locationContainer)

    return () => {
      map.off('dragstart', exitFollow)
      locationContainer.remove()
      buttonRef.current = null
      stopWatch()
      if (accuracyCircleRef.current) { accuracyCircleRef.current.remove(); accuracyCircleRef.current = null }
    }
  }, [map])

  return null
}

// Component to handle custom attribution control positioned at bottom-left
function AttributionControlHandler({ attribution }: { attribution: string }) {
  const map = useMap()

  // Create DOM once
  useEffect(() => {
    let bottomLeftStack = map.getContainer().querySelector('.map-control-bottom-left-stack') as HTMLElement
    if (!bottomLeftStack) {
      bottomLeftStack = L.DomUtil.create('div', 'map-control-bottom-left-stack')
      map.getContainer().appendChild(bottomLeftStack)
    }

    const container = L.DomUtil.create('div', 'leaflet-control-attribution leaflet-control')
    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)
    bottomLeftStack.appendChild(container)

    return () => { container.remove() }
  }, [map])

  // Update text via DOM mutation — no teardown
  useEffect(() => {
    const container = map.getContainer().querySelector('.leaflet-control-attribution.leaflet-control') as HTMLElement | null
    if (container) container.innerHTML = attribution
  }, [map, attribution])

  return null
}

// Component to handle layer toggle button positioned above places count
function LayerToggleHandler({ currentLayerId, onLayerChange }: { currentLayerId: string, onLayerChange: (layerId: string) => void }) {
  const map = useMap()
  const currentLayerIdRef = useRef(currentLayerId)
  const onLayerChangeRef = useRef(onLayerChange)
  useEffect(() => { currentLayerIdRef.current = currentLayerId }, [currentLayerId])
  useEffect(() => { onLayerChangeRef.current = onLayerChange }, [onLayerChange])

  // Create DOM once
  useEffect(() => {
    const toggleLayer = () => {
      const cycle = ['light', 'voyager']
      const nextIndex = (cycle.indexOf(currentLayerIdRef.current) + 1) % cycle.length
      onLayerChangeRef.current(cycle[nextIndex])
    }

    let bottomRightStack = map.getContainer().querySelector('.map-control-bottom-right-stack') as HTMLElement
    if (!bottomRightStack) {
      bottomRightStack = L.DomUtil.create('div', 'map-control-bottom-right-stack')
      map.getContainer().appendChild(bottomRightStack)
    }
    blockWheelOnStack(bottomRightStack)

    const layerContainer = L.DomUtil.create('div', 'leaflet-control-layer-toggle')
    const layerButton = L.DomUtil.create('button', 'layer-toggle-button map-control-button', layerContainer)
    layerButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    `
    layerButton.title = 'Toggle Map Style'

    L.DomEvent.on(layerButton, 'click', (e) => {
      L.DomEvent.preventDefault(e)
      toggleLayer()
    })
    L.DomEvent.disableClickPropagation(layerContainer)
    L.DomEvent.disableScrollPropagation(layerContainer)
    bottomRightStack.appendChild(layerContainer)

    return () => { layerContainer.remove() }
  }, [map])

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


function FlyToHandler({ target, onDone }: { target: { lat: number; lng: number }, onDone: () => void }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16), { duration: 1 })
    onDone()
  }, [map, target, onDone])
  return null
}

export default function LeafletCourtMap({
  courts,
  onCourtSelect,
  onMapClick,
  height = '400px',
  allowAddCourt = false,
  selectedLocation = null,
  enableClustering = true,
  selectedSports = [],
  selectedPlaceType = null,
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
}: LeafletCourtMapProps) {
  const { user, profile } = useAuth()
  const [selectedCourt, setSelectedCourt] = useState<PlaceMarker | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [currentLayerId, setCurrentLayerId] = useState<string>(() => getSavedLayerPreference())
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(defaultFavoritesOpen)
  const isClosingExplicitly = useRef(false)
  const isClosingFilterExplicitly = useRef(false)
  const isBottomSheetOpenRef = useRef(false)
  const isFilterSheetOpenRef = useRef(false)
  const isFavoritesOpenRef = useRef(false)

  // Keep refs in sync so stable callbacks can read current values
  isBottomSheetOpenRef.current = isBottomSheetOpen
  isFilterSheetOpenRef.current = isFilterSheetOpen
  isFavoritesOpenRef.current = isFavoritesOpen

  // Vaul renders via @radix-ui/react-dialog which sets pointer-events:none on the body
  // when its DismissableLayer fires (modal=true by default in Radix, regardless of vaul's modal=false).
  // Restore pointer-events so the map remains pannable while a non-modal sheet is open.
  useEffect(() => {
    if (!isBottomSheetOpen && !isFilterSheetOpen && !isFavoritesOpen) return
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
    if (!isBottomSheetOpenRef.current) setIsBottomSheetOpen(true)
    onCourtSelect?.(court)
  }, [onCourtSelect, disableMarkerClick])


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

  const handleLayerChange = useCallback((layerId: string) => {
    setCurrentLayerId(layerId)
    saveLayerPreference(layerId)
  }, [])

  const handleFilterClick = useCallback(() => {
    if (isFavoritesOpenRef.current) setIsFavoritesOpen(false)
    setIsFilterSheetOpen(true)
    window.dispatchEvent(new CustomEvent('filter-opened'))
  }, [])

  const handleFavoritesClick = useCallback(() => {
    if (isFilterSheetOpenRef.current) setIsFilterSheetOpen(false)
    setIsFavoritesOpen(true)
    window.dispatchEvent(new CustomEvent('favorites-opened'))
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
                />
              )
            }

            // Individual markers when not clustering — filter inline (few markers, trivial cost)
            const visibleCourts = courts.filter(c => {
              if (selectedSports.length > 0 && !selectedSports.some(s => c.sports?.includes(s))) return false
              if (selectedPlaceType !== null && (c.place_type || 'öffentlich') !== selectedPlaceType) return false
              return true
            })
            return visibleCourts.map((court) => {
              const allSports = court.sports || []
              const matchingSports = allSports.filter(s => selectedSports.includes(s))
              const sportsForIcon = selectedSports.length === 0 ? allSports : matchingSports.length > 0 ? matchingSports : allSports

              return (
              <Marker
                key={court.id}
                position={[court.latitude, court.longitude]}
                icon={createSportIcon(sportsForIcon, false)}
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
          }, [enableClustering, courts, selectedSports, selectedPlaceType, handleCourtSelect])}
          
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
          
          {/* User location control */}
          <UserLocationHandler onLocationFound={handleLocationFound} autoLocate={autoLocate} />

          {/* Fly to target when selected from favorites */}
          {flyToTarget && <FlyToHandler target={flyToTarget} onDone={() => setFlyToTarget(null)} />}
          
          {/* Filter button */}
          {showFilter && <FilterButtonHandler onFilterClick={handleFilterClick} isFilterActive={selectedSports.length > 0 || selectedPlaceType !== null} />}

          {/* Favorites button */}
          {showFavorite && <FavoritesButtonHandler onClick={handleFavoritesClick} />}

          {/* Custom attribution control */}
          <AttributionControlHandler attribution={currentLayer.attribution} />
          
          {/* Layer toggle button */}
          <LayerToggleHandler currentLayerId={currentLayerId} onLayerChange={handleLayerChange} />
          
          {/* Add court button */}
          {showAddCourtButton && onAddCourtClick && (
            <AddCourtButtonHandler onAddCourtClick={onAddCourtClick} user={user} />
          )}
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

      {/* Filter Bottom Sheet — vaul Drawer */}
      <FilterBottomSheetVaul
        isOpen={isFilterSheetOpen}
        onClose={setIsFilterSheetOpen}
        onExplicitClose={handleExplicitFilterClose}
        selectedSports={selectedSports}
        onSportsChange={onSportsChange ?? (() => {})}
        selectedPlaceType={selectedPlaceType}
        onPlaceTypeChange={onPlaceTypeChange ?? (() => {})}
      />

      {/* Favorites Bottom Sheet — vaul Drawer */}
      <FavoritesBottomSheetVaul
        isOpen={isFavoritesOpen}
        onOpenChange={(open) => {
          setIsFavoritesOpen(open)
          if (!open) onFavoritesClose?.()
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