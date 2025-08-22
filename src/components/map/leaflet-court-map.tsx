'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { Court, SportType } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Plus } from 'lucide-react'
import { sportNames, getSportBadgeClasses, sportIcons } from '@/lib/utils/sport-utils'
import { createSportIcon, createUserLocationIcon, createSelectedLocationIcon } from '@/lib/utils/sport-styles'
import { MAP_LAYERS, DEFAULT_LAYER_ID, createTileLayer, getSavedLayerPreference, saveLayerPreference } from '@/lib/utils/map-layers'
import L from 'leaflet'
import MarkerClusterGroup from './marker-cluster-group'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'
import './cluster-styles.css'

interface LeafletCourtMapProps {
  courts: Court[]
  onCourtSelect?: (court: Court) => void
  onMapClick?: (lng: number, lat: number) => void
  height?: string
  allowAddCourt?: boolean
  selectedLocation?: { lat: number; lng: number } | null
  enableClustering?: boolean
  selectedSport?: SportType | 'all'
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
  selectedLocation = null,
  enableClustering = true,
  selectedSport = 'all'
}: LeafletCourtMapProps) {
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [currentLayerId, setCurrentLayerId] = useState<string>(() => getSavedLayerPreference())
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court)
    setIsBottomSheetOpen(true)
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
          
          {/* Court markers - with optional clustering */}
          {enableClustering && courts.length > 10 ? (
            <MarkerClusterGroup 
              courts={courts}
              onCourtSelect={handleCourtSelect}
              selectedCourt={selectedCourt}
              selectedSport={selectedSport}
            />
          ) : (
            courts.map((court) => {
              // Calculate sport quantities for this court
              const sportsWithCounts = court.courts?.length > 0 
                ? court.courts.reduce((acc, c) => {
                    acc[c.sport] = (acc[c.sport] || 0) + (c.quantity || 1)
                    return acc
                  }, {} as Record<string, number>)
                : (court.sports?.reduce((acc, sport) => ({ ...acc, [sport]: 1 }), {} as Record<string, number>) || {})
              
              // Filter sports for icon display based on selected sport filter
              const sportsForIcon = selectedSport === 'all' 
                ? (court.sports || [])
                : (court.sports || []).includes(selectedSport) 
                  ? [selectedSport]
                  : (court.sports || [])
              
              return (
              <Marker 
                key={court.id} 
                position={[court.latitude, court.longitude]}
                icon={createSportIcon(sportsForIcon, false)}
                eventHandlers={{
                  click: () => {
                    handleCourtSelect(court)
                  }
                }}
              />
            )
            })
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

      {/* Bottom Sheet for Court Details */}
      <Sheet open={isBottomSheetOpen} onOpenChange={setIsBottomSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] border-0" hideOverlay>
          {selectedCourt && (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>{selectedCourt.name}</SheetTitle>
                {selectedCourt.description && (
                  <SheetDescription>
                    {selectedCourt.description}
                  </SheetDescription>
                )}
              </SheetHeader>
              
              <div className="space-y-3">
                {/* Sports badges */}
                {(() => {
                  const sportsWithCounts = selectedCourt.courts?.length > 0 
                    ? selectedCourt.courts.reduce((acc, c) => {
                        acc[c.sport] = (acc[c.sport] || 0) + (c.quantity || 1)
                        return acc
                      }, {} as Record<string, number>)
                    : (selectedCourt.sports?.reduce((acc, sport) => ({ ...acc, [sport]: 1 }), {} as Record<string, number>) || {})
                  
                  return Object.keys(sportsWithCounts).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Available Sports</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(sportsWithCounts).map(([sport, count]) => (
                          <Badge 
                            key={sport} 
                            className={`text-sm ${getSportBadgeClasses(sport)}`}
                          >
                            {sportIcons[sport] || '📍'} {sportNames[sport] || sport} ({count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                
                {/* Action button */}
                <div className="pt-2">
                  <Button 
                    className="w-full"
                    onClick={() => window.location.href = `/places/${selectedCourt.id}`}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}