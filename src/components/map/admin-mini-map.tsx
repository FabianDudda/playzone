'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { createSportIcon } from '@/lib/utils/sport-styles'
import { MAP_LAYERS, DEFAULT_LAYER_ID, getSavedLayerPreference, saveLayerPreference } from '@/lib/utils/map-layers'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface NearbyPlace {
  id: string
  name: string
  moderation_status: string
  latitude: number
  longitude: number
  distance: number
}

export interface ProposedLocation {
  latitude: number
  longitude: number
  distanceMeters?: number
}

interface AdminMiniMapProps {
  latitude: number
  longitude: number
  placeName: string
  sports?: string[]
  nearbyPlaces?: NearbyPlace[]
  proposedLocation?: ProposedLocation
  onLocationSelect?: (lat: number, lng: number) => void
  height?: string
  className?: string
}

function MapClickHandler({ onLocationSelect, setMarkerPos }: {
  onLocationSelect: (lat: number, lng: number) => void
  setMarkerPos: (pos: [number, number]) => void
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setMarkerPos([lat, lng])
      onLocationSelect(lat, lng)
    },
  })
  return null
}

function createProposedIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width: 16px; height: 16px;
      background: #16a34a;
      border: 2.5px dashed white;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    "></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function createNearbyIcon(status: string): L.DivIcon {
  const colors: Record<string, string> = {
    approved: '#16a34a',
    pending: '#ea580c',
    rejected: '#dc2626',
  }
  const color = colors[status] || '#6b7280'
  return L.divIcon({
    html: `<div style="
      width: 14px; height: 14px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    "></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function LayerToggleHandler({
  currentLayerId,
  onLayerChange,
}: {
  currentLayerId: string
  onLayerChange: (layerId: string) => void
}) {
  const map = useMap()

  const toggleLayer = useCallback(() => {
    const newLayerId = currentLayerId === 'light' ? 'satellite' : 'light'
    onLayerChange(newLayerId)
  }, [currentLayerId, onLayerChange])

  useEffect(() => {
    const layerContainer = L.DomUtil.create('div', '')
    layerContainer.style.cssText = 'position:absolute;top:10px;right:10px;z-index:1000;'

    const btn = L.DomUtil.create('button', '', layerContainer)
    btn.title = 'Toggle map style'
    btn.style.cssText = `
      background: white;
      border: 2px solid rgba(0,0,0,0.2);
      border-radius: 4px;
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      box-shadow: 0 1px 5px rgba(0,0,0,0.2);
    `
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>`

    btn.addEventListener('mouseenter', () => { btn.style.backgroundColor = '#f5f5f5' })
    btn.addEventListener('mouseleave', () => { btn.style.backgroundColor = 'white' })

    L.DomEvent.on(btn, 'click', (e) => {
      L.DomEvent.preventDefault(e)
      toggleLayer()
    })
    L.DomEvent.disableClickPropagation(layerContainer)
    L.DomEvent.disableScrollPropagation(layerContainer)

    map.getContainer().appendChild(layerContainer)
    return () => { layerContainer.remove() }
  }, [map, toggleLayer])

  return null
}

export default function AdminMiniMap({
  latitude,
  longitude,
  placeName,
  sports = [],
  nearbyPlaces = [],
  proposedLocation,
  onLocationSelect,
  height = '220px',
  className = '',
}: AdminMiniMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [currentLayerId, setCurrentLayerId] = useState<string>(() => getSavedLayerPreference())
  const [markerPos, setMarkerPos] = useState<[number, number]>([latitude, longitude])

  useEffect(() => { setIsClient(true) }, [])

  const handleLayerChange = useCallback((layerId: string) => {
    setCurrentLayerId(layerId)
    saveLayerPreference(layerId)
  }, [])

  if (!isClient) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  const layer = MAP_LAYERS[currentLayerId] || MAP_LAYERS[DEFAULT_LAYER_ID]
  const initialPosition: [number, number] = [latitude, longitude]

  return (
    <div className={`rounded-lg overflow-hidden relative ${className}`} style={{ height }}>
      {onLocationSelect && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
            Click to reposition
          </span>
        </div>
      )}
      <MapContainer
        center={initialPosition}
        zoom={18}
        style={{ height: '100%', width: '100%', cursor: onLocationSelect ? 'crosshair' : '' }}
        scrollWheelZoom={false}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          key={currentLayerId}
          url={layer.url}
          attribution={layer.attribution}
          maxZoom={layer.maxZoom}
          {...(layer.subdomains && layer.subdomains.length > 0 && {
            subdomains: layer.subdomains,
          })}
        />

        {onLocationSelect && (
          <MapClickHandler onLocationSelect={onLocationSelect} setMarkerPos={setMarkerPos} />
        )}

        <Marker position={markerPos} icon={createSportIcon(sports, false)}>
          <Tooltip permanent={false} direction="top">
            {placeName}
          </Tooltip>
        </Marker>

        {nearbyPlaces.map(nearby => (
          <Marker
            key={nearby.id}
            position={[nearby.latitude, nearby.longitude]}
            icon={createNearbyIcon(nearby.moderation_status)}
          >
            <Tooltip direction="top">
              <span className="text-xs">
                {nearby.name} — {nearby.distance}m ({nearby.moderation_status})
              </span>
            </Tooltip>
          </Marker>
        ))}

        {proposedLocation && (
          <Marker
            position={[proposedLocation.latitude, proposedLocation.longitude]}
            icon={createProposedIcon()}
          >
            <Tooltip direction="top" permanent={false}>
              <span className="text-xs">
                Proposed location
                {proposedLocation.distanceMeters != null
                  ? ` — ${proposedLocation.distanceMeters}m from current`
                  : ''}
              </span>
            </Tooltip>
          </Marker>
        )}

        <LayerToggleHandler currentLayerId={currentLayerId} onLayerChange={handleLayerChange} />
      </MapContainer>
    </div>
  )
}
