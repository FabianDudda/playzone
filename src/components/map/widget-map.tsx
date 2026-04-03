'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { PlaceMarker, Area, SportType } from '@/lib/supabase/types'
import { PlaceType, sportNames, sportIcons } from '@/lib/utils/sport-utils'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { ExternalLink, X } from 'lucide-react'
import { createSportIcon } from '@/lib/utils/sport-styles'
import { MAP_LAYERS, DEFAULT_LAYER_ID } from '@/lib/utils/map-layers'
import L from 'leaflet'
import MarkerClusterGroup from './marker-cluster-group'
import FilterBottomSheetVaul from './filter-bottom-sheet-vaul'

import 'leaflet/dist/leaflet.css'
import './cluster-styles.css'
import './map-controls.css'

// Fit map to area bounds on mount
function FitBoundsHandler({ area }: { area: Area }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(
      [[area.min_lat, area.min_lng], [area.max_lat, area.max_lng]],
      { animate: false }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

// Close all sheets on map click
function MapClickHandler({ onClose }: { onClose: () => void }) {
  useMapEvents({ click: () => onClose() })
  return null
}

// Open site button — top-left
function OpenSiteButtonHandler({ url }: { url: string }) {
  const map = useMap()
  const urlRef = useRef(url)
  useEffect(() => { urlRef.current = url }, [url])

  useEffect(() => {
    let stack = map.getContainer().querySelector('.map-control-top-left-stack') as HTMLElement
    if (!stack) {
      stack = L.DomUtil.create('div', 'map-control-top-left-stack')
      map.getContainer().appendChild(stack)
    }

    const container = L.DomUtil.create('div', 'leaflet-control-open-site')
    const button = L.DomUtil.create('button', 'map-control-button', container)
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    `
    button.title = 'Open full site'

    L.DomEvent.on(button, 'click', (e) => {
      L.DomEvent.preventDefault(e)
      window.open(urlRef.current, '_blank', 'noopener,noreferrer')
    })
    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)
    stack.appendChild(container)

    return () => { container.remove() }
  }, [map])

  return null
}

// Filter button — top-right
function FilterButtonHandler({
  onFilterClick,
  isFilterActive,
}: {
  onFilterClick: () => void
  isFilterActive: boolean
}) {
  const map = useMap()
  const callbackRef = useRef(onFilterClick)
  useEffect(() => { callbackRef.current = onFilterClick }, [onFilterClick])

  useEffect(() => {
    let stack = map.getContainer().querySelector('.map-control-top-right-stack') as HTMLElement
    if (!stack) {
      stack = L.DomUtil.create('div', 'map-control-top-right-stack')
      map.getContainer().appendChild(stack)
    }

    const container = L.DomUtil.create('div', 'leaflet-control-filter')
    const button = L.DomUtil.create('button', 'filter-button map-control-button', container)
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </svg>
    `
    button.title = 'Filter'

    L.DomEvent.on(button, 'click', (e) => {
      L.DomEvent.preventDefault(e)
      callbackRef.current()
    })
    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)
    stack.appendChild(container)

    return () => { container.remove() }
  }, [map])

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

// Minimal place sheet for the widget
function WidgetPlaceSheet({
  place,
  isOpen,
  onClose,
  siteUrl,
}: {
  place: PlaceMarker | null
  isOpen: boolean
  onClose: () => void
  siteUrl: string
}) {
  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose() }} modal={false} shouldScaleBackground={false}>
      <DrawerContent hideOverlay className="max-h-[50dvh] max-w-2xl mx-auto">
        {place && (
          <>
            <DrawerHeader>
              <div className="flex items-center justify-between gap-3">
                <DrawerTitle className="text-xl text-left truncate">{place.name}</DrawerTitle>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full h-10 w-10 shrink-0"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-4">
              {place.sports && place.sports.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {place.sports.map((sport) => (
                    <div
                      key={sport}
                      className="flex items-center gap-1 border border-border rounded-full px-3 py-1.5"
                    >
                      <span className="text-[16px] leading-none">{sportIcons[sport] || '🏅'}</span>
                      <span className="text-[14px] font-medium text-muted-foreground">
                        {sportNames[sport] || sport}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Button
                className="w-full"
                onClick={() =>
                  window.open(`${siteUrl}/?place=${place.id}`, '_blank', 'noopener,noreferrer')
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open full site
              </Button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

interface WidgetMapProps {
  courts: PlaceMarker[]
  area: Area
  siteUrl: string
}

export default function WidgetMap({ courts, area, siteUrl }: WidgetMapProps) {
  const [selectedCourt, setSelectedCourt] = useState<PlaceMarker | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedSports, setSelectedSports] = useState<SportType[]>([])
  const [selectedPlaceType, setSelectedPlaceType] = useState<PlaceType | null>(null)

  const isFilterOpenRef = useRef(false)
  isFilterOpenRef.current = isFilterOpen

  // Fix Vaul pointer-events issue on body
  useEffect(() => {
    if (!isSheetOpen && !isFilterOpen) return
    const raf = requestAnimationFrame(() => {
      document.body.style.pointerEvents = 'auto'
    })
    return () => cancelAnimationFrame(raf)
  }, [isSheetOpen, isFilterOpen])

  const handleCourtSelect = useCallback((court: PlaceMarker) => {
    if (isFilterOpenRef.current) setIsFilterOpen(false)
    setSelectedCourt(court)
    setIsSheetOpen(true)
  }, [])

  const handleCloseAll = useCallback(() => {
    setIsSheetOpen(false)
    setIsFilterOpen(false)
    setSelectedCourt(null)
  }, [])

  const tileLayer = MAP_LAYERS[DEFAULT_LAYER_ID]
  const openSiteUrl = `${siteUrl}/?area=${area.slug}`

  return (
    <div className="relative" style={{ height: '100%' }}>
      <MapContainer
        center={[(area.min_lat + area.max_lat) / 2, (area.min_lng + area.max_lng) / 2]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          attribution={tileLayer.attribution}
          url={tileLayer.url}
          maxZoom={tileLayer.maxZoom}
        />

        <FitBoundsHandler area={area} />

        {useMemo(() => {
          if (courts.length > 10) {
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

          const visible = courts.filter((c) => {
            if (selectedSports.length > 0 && !selectedSports.some((s) => c.sports?.includes(s))) return false
            if (selectedPlaceType !== null && (c.place_type || 'öffentlich') !== selectedPlaceType) return false
            return true
          })

          return visible.map((court) => (
            <Marker
              key={court.id}
              position={[court.latitude, court.longitude]}
              icon={createSportIcon(court.sports || [], false)}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation()
                  handleCourtSelect(court)
                },
              }}
            />
          ))
        }, [courts, selectedSports, selectedPlaceType, handleCourtSelect])}

        <MapClickHandler onClose={handleCloseAll} />

        <OpenSiteButtonHandler url={openSiteUrl} />

        <FilterButtonHandler
          onFilterClick={() => {
            setIsSheetOpen(false)
            setIsFilterOpen(true)
          }}
          isFilterActive={selectedSports.length > 0 || selectedPlaceType !== null}
        />
      </MapContainer>

      <WidgetPlaceSheet
        place={selectedCourt}
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false)
          setSelectedCourt(null)
        }}
        siteUrl={siteUrl}
      />

      <FilterBottomSheetVaul
        isOpen={isFilterOpen}
        onClose={setIsFilterOpen}
        onExplicitClose={() => setIsFilterOpen(false)}
        selectedSports={selectedSports}
        onSportsChange={setSelectedSports}
        selectedPlaceType={selectedPlaceType}
        onPlaceTypeChange={setSelectedPlaceType}
      />
    </div>
  )
}
