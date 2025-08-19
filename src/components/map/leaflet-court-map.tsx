'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import { Court } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, Plus } from 'lucide-react'
import { createSportIcon, createUserLocationIcon, createSelectedLocationIcon, sportNames } from '@/lib/utils/sport-styles'
import { MAP_LAYERS, DEFAULT_LAYER_ID, createTileLayer, getSavedLayerPreference, saveLayerPreference } from '@/lib/utils/map-layers'
import L from 'leaflet'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'

interface LeafletCourtMapProps {
  courts: Court[]
  onCourtSelect?: (court: Court) => void
  onMapClick?: (lng: number, lat: number) => void
  height?: string
  allowAddCourt?: boolean
  selectedLocation?: { lat: number; lng: number } | null
}

// Component to handle map clicks
function MapClickHandler({ onMapClick, allowAddCourt }: { onMapClick?: (lng: number, lat: number) => void, allowAddCourt: boolean }) {
  useMapEvents({
    click: (e) => {
      if (allowAddCourt && onMapClick) {
        onMapClick(e.latlng.lng, e.latlng.lat)
      }
    }
  })
  return null
}

// Component to handle layer control - simplified approach
function LayerControlHandler({ currentLayerId, onLayerChange }: { currentLayerId: string, onLayerChange: (layerId: string) => void }) {
  const map = useMap()
  
  useEffect(() => {
    // Create custom layer control
    const LayerSwitchControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: function(map: L.Map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom-layers')
        
        // Create dropdown
        const select = L.DomUtil.create('select', 'layer-select', container)
        select.style.cssText = `
          background: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          min-width: 100px;
        `
        
        // Add options
        Object.values(MAP_LAYERS).forEach(layer => {
          const option = L.DomUtil.create('option', '', select) as HTMLOptionElement
          option.value = layer.id
          option.text = layer.name
          if (layer.id === currentLayerId) {
            option.selected = true
          }
        })
        
        // Handle change events
        L.DomEvent.on(select, 'change', (e: any) => {
          const selectedLayerId = e.target.value
          onLayerChange(selectedLayerId)
          saveLayerPreference(selectedLayerId)
        })
        
        // Prevent map interactions when using the control
        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.disableScrollPropagation(container)
        
        return container
      }
    })
    
    const layerControl = new LayerSwitchControl()
    map.addControl(layerControl)
    
    return () => {
      map.removeControl(layerControl)
    }
  }, [map, currentLayerId, onLayerChange])
  
  return null
}

// Component to handle user location
function UserLocationHandler({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
  const map = useMap()
  
  const findUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          onLocationFound(lat, lng)
          map.setView([lat, lng], 14)
        },
        (error) => {
          console.warn('Could not get user location:', error)
          alert('Could not access your location. Please check your browser settings and try again.')
        }
      )
    }
  }

  useEffect(() => {
    // Add custom control for user location
    const LocationControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function(map: L.Map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        const button = L.DomUtil.create('a', 'leaflet-control-button', container)
        button.innerHTML = '📍'
        button.title = 'Find my location'
        button.style.backgroundColor = 'white'
        button.style.width = '30px'
        button.style.height = '30px'
        button.style.display = 'flex'
        button.style.alignItems = 'center'
        button.style.justifyContent = 'center'
        button.style.textDecoration = 'none'
        button.style.color = '#666'
        button.style.fontSize = '16px'
        button.href = '#'
        
        L.DomEvent.on(button, 'click', L.DomEvent.preventDefault)
        L.DomEvent.on(button, 'click', findUserLocation)
        
        return container
      }
    })
    
    const locationControl = new LocationControl()
    map.addControl(locationControl)
    
    return () => {
      map.removeControl(locationControl)
    }
  }, [map])
  
  return null
}

export default function LeafletCourtMap({ 
  courts, 
  onCourtSelect, 
  onMapClick, 
  height = '400px',
  allowAddCourt = false,
  selectedLocation = null
}: LeafletCourtMapProps) {
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [currentLayerId, setCurrentLayerId] = useState<string>(() => getSavedLayerPreference())

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court)
    onCourtSelect?.(court)
  }

  const handleLocationFound = (lat: number, lng: number) => {
    setUserLocation({ lat, lng })
  }

  const handleLayerChange = (layerId: string) => {
    setCurrentLayerId(layerId)
  }

  // Default center (Germany)
  const defaultCenter: [number, number] = [51.165691, 10.451526]
  
  // Get current layer configuration
  const currentLayer = MAP_LAYERS[currentLayerId] || MAP_LAYERS[DEFAULT_LAYER_ID]

  return (
    <div className="relative">
      <div style={{ height }} className="rounded-lg overflow-hidden">
        <MapContainer
          center={defaultCenter}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          {/* Dynamic tile layer based on user selection */}
          <TileLayer
            attribution={currentLayer.attribution}
            url={currentLayer.url}
            maxZoom={currentLayer.maxZoom}
            {...(currentLayer.subdomains !== undefined && currentLayer.subdomains.length > 0 && { subdomains: currentLayer.subdomains })}
          />
          
          {/* Court markers */}
          {courts.map((court) => (
            <Marker 
              key={court.id} 
              position={[court.latitude, court.longitude]}
              icon={createSportIcon(court.sports, selectedCourt?.id === court.id)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-sm mb-1">{court.name}</h3>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {court.sports.map(sport => (
                      <Badge key={sport} variant="secondary" className="text-xs">
                        {sportNames[sport]}
                      </Badge>
                    ))}
                  </div>
                  {court.description && (
                    <p className="text-xs text-gray-600 mb-2">{court.description}</p>
                  )}
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleCourtSelect(court)}
                  >
                    Select Court
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* User location marker */}
          {userLocation && (
            <Marker 
              position={[userLocation.lat, userLocation.lng]}
              icon={createUserLocationIcon()}
            >
              <Popup>Your Location</Popup>
            </Marker>
          )}
          
          {/* Selected location marker (for adding courts) */}
          {selectedLocation && (
            <Marker 
              position={[selectedLocation.lat, selectedLocation.lng]}
              icon={createSelectedLocationIcon()}
            >
              <Popup>Selected Court Location</Popup>
            </Marker>
          )}
          
          {/* Handle map clicks */}
          <MapClickHandler onMapClick={onMapClick} allowAddCourt={allowAddCourt} />
          
          {/* User location control */}
          <UserLocationHandler onLocationFound={handleLocationFound} />
          
          {/* Layer control */}
          <LayerControlHandler currentLayerId={currentLayerId} onLayerChange={handleLayerChange} />
        </MapContainer>
      </div>
      
      {/* Add court instruction */}
      {allowAddCourt && (
        <div className="absolute top-4 right-4 bg-white/90 rounded-lg p-2 text-sm shadow-lg">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Plus className="h-3 w-3" />
            Click map to add court
          </div>
        </div>
      )}

      {/* Selected Court Info */}
      {selectedCourt && (
        <Card className="absolute bottom-4 left-4 right-4 bg-white/95 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{selectedCourt.name}</CardTitle>
            <div className="flex flex-wrap gap-1">
              {selectedCourt.sports.map((sport) => (
                <Badge key={sport} variant="secondary" className="text-xs">
                  {sportNames[sport]}
                </Badge>
              ))}
            </div>
          </CardHeader>
          {selectedCourt.description && (
            <CardContent className="pt-0">
              <CardDescription className="text-sm">
                {selectedCourt.description}
              </CardDescription>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}