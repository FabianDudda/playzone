'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { createSportIcon } from '@/lib/utils/sport-styles'
import { MAP_LAYERS, DEFAULT_LAYER_ID, getSavedLayerPreference, saveLayerPreference } from '@/lib/utils/map-layers'
import { SportType } from '@/lib/supabase/types'
import L from 'leaflet'

import 'leaflet/dist/leaflet.css'

// Component to handle layer toggle button positioned at top-right
function LayerToggleHandler({ currentLayerId, onLayerChange }: { currentLayerId: string, onLayerChange: (layerId: string) => void }) {
  const map = useMap()
  
  const toggleLayer = () => {
    const newLayerId = currentLayerId === 'light' ? 'satellite' : 'light'
    onLayerChange(newLayerId)
  }
  
  const getLayersIcon = () => {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    `
  }

  useEffect(() => {
    // Create layer toggle button container
    const layerContainer = L.DomUtil.create('div', 'leaflet-control-layer-toggle')
    layerContainer.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
    `
    
    // Create modern layer toggle button
    const layerButton = L.DomUtil.create('button', 'layer-toggle-button', layerContainer)
    layerButton.style.cssText = `
      background: white;
      border: 2px solid rgba(0,0,0,0.2);
      border-radius: 4px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 1px 5px rgba(0,0,0,0.2);
      transition: all 0.2s;
    `
    layerButton.innerHTML = getLayersIcon()
    layerButton.title = 'Toggle Map Style'
    
    // Hover effects
    layerButton.addEventListener('mouseenter', () => {
      layerButton.style.backgroundColor = '#f5f5f5'
      layerButton.style.borderColor = 'rgba(0,0,0,0.3)'
    })
    
    layerButton.addEventListener('mouseleave', () => {
      layerButton.style.backgroundColor = 'white'
      layerButton.style.borderColor = 'rgba(0,0,0,0.2)'
    })
    
    // Handle click events
    L.DomEvent.on(layerButton, 'click', (e) => {
      L.DomEvent.preventDefault(e)
      toggleLayer()
    })
    
    // Prevent map interactions
    L.DomEvent.disableClickPropagation(layerContainer)
    L.DomEvent.disableScrollPropagation(layerContainer)
    
    // Add to map container
    map.getContainer().appendChild(layerContainer)
    
    return () => {
      layerContainer.remove()
    }
  }, [map, currentLayerId, onLayerChange])
  
  return null
}

interface SimpleLocationMapProps {
  latitude: number
  longitude: number
  placeName: string
  sports?: SportType[]
  height?: string
  className?: string
}

export default function SimpleLocationMap({
  latitude,
  longitude,
  placeName,
  sports = [],
  height = '200px',
  className = ''
}: SimpleLocationMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [currentLayerId, setCurrentLayerId] = useState<string>(() => getSavedLayerPreference())

  // Ensure this only renders on client side to avoid SSR issues with Leaflet
  useEffect(() => {
    setIsClient(true)
  }, [])

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
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  const currentLayer = MAP_LAYERS[currentLayerId] || MAP_LAYERS[DEFAULT_LAYER_ID]
  const position: [number, number] = [latitude, longitude]

  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={position}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          key={currentLayerId} // Force re-render when layer changes
          attribution={currentLayer.attribution}
          url={currentLayer.url}
          maxZoom={currentLayer.maxZoom}
          {...(currentLayer.subdomains && currentLayer.subdomains.length > 0 && { 
            subdomains: currentLayer.subdomains 
          })}
        />
        
        <Marker 
          position={position}
          icon={createSportIcon(sports, false)}
        />
        
        {/* Layer toggle button */}
        <LayerToggleHandler currentLayerId={currentLayerId} onLayerChange={handleLayerChange} />
      </MapContainer>
    </div>
  )
}