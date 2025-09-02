'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { Court, SportType, PlaceWithCourts } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Plus, MapPin, Navigation, Share2, Heart, Search, Filter, Edit } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import FilterBottomSheet from './filter-bottom-sheet'
import { sportNames, getSportBadgeClasses, sportIcons } from '@/lib/utils/sport-utils'
import { createSportIcon, createUserLocationIcon, createSelectedLocationIcon } from '@/lib/utils/sport-styles'
import { MAP_LAYERS, DEFAULT_LAYER_ID, createTileLayer, getSavedLayerPreference, saveLayerPreference } from '@/lib/utils/map-layers'
import { getDistanceText } from '@/lib/utils/distance'
import L from 'leaflet'
import MarkerClusterGroup from './marker-cluster-group'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'
import './cluster-styles.css'
import './map-controls.css'

interface LeafletCourtMapProps {
  courts: PlaceWithCourts[]
  onCourtSelect?: (court: PlaceWithCourts) => void
  onMapClick?: (lng: number, lat: number) => void
  height?: string
  allowAddCourt?: boolean
  selectedLocation?: { lat: number; lng: number } | null
  enableClustering?: boolean
  selectedSport?: SportType | 'all'
  // Search and filter props
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onSportChange?: (sport: SportType | 'all') => void
  showSearchControls?: boolean
  placesCount?: number
  showAddCourtButton?: boolean
  onAddCourtClick?: () => void
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
      console.log('🗺️ Map click detected - closing sheets')
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


// Component to handle modern search control with filter button
function SearchFilterControlHandler({ 
  searchQuery = '', 
  onSearchChange,
  onFilterClick
}: { 
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onFilterClick?: () => void
}) {
  const map = useMap()
  const inputRef = useRef<HTMLInputElement | null>(null)
  
  useEffect(() => {
    // Create modern search control with filter button
    const SearchControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function(map: L.Map) {
        // Main container centered
        const mainContainer = L.DomUtil.create('div', 'leaflet-control-search-main')
        
        // Search container
        const searchContainer = L.DomUtil.create('div', 'search-container', mainContainer)
        
        // Search icon (left)
        const searchIcon = L.DomUtil.create('div', 'search-icon', searchContainer)
        searchIcon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        `
        
        // Search input
        const searchInput = L.DomUtil.create('input', 'search-input', searchContainer) as HTMLInputElement
        searchInput.type = 'text'
        searchInput.placeholder = 'Search courts...'
        searchInput.value = searchQuery
        
        // Store reference to input for direct updates
        inputRef.current = searchInput
        
        // Filter button (right)
        const filterButton = L.DomUtil.create('button', 'filter-button', searchContainer)
        filterButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
        `
        
        // Note: Hover and focus effects are now handled by CSS classes
        
        // Debounce search input
        let searchTimeout: NodeJS.Timeout
        
        // Handle events
        L.DomEvent.on(searchInput, 'input', (e: any) => {
          clearTimeout(searchTimeout)
          searchTimeout = setTimeout(() => {
            onSearchChange?.(e.target.value)
          }, 300) // 300ms debounce delay
        })
        
        L.DomEvent.on(filterButton, 'click', (e: any) => {
          L.DomEvent.preventDefault(e)
          onFilterClick?.()
        })
        
        // Prevent map interactions
        L.DomEvent.disableClickPropagation(mainContainer)
        L.DomEvent.disableScrollPropagation(mainContainer)
        
        // Add to map container
        map.getContainer().appendChild(mainContainer)
        
        return { 
          remove: () => {
            clearTimeout(searchTimeout)
            mainContainer.remove()
            inputRef.current = null
          }
        }
      }
    })
    
    const searchControl = new SearchControl()
    const controlInstance = searchControl.onAdd(map)
    
    return () => {
      if (controlInstance && controlInstance.remove) {
        controlInstance.remove()
      }
    }
  }, [map, onSearchChange, onFilterClick]) // Removed searchQuery from dependencies
  
  // Update input value directly when searchQuery changes (without recreating control)
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== searchQuery) {
      inputRef.current.value = searchQuery
    }
  }, [searchQuery])
  
  return null
}

// Component to handle user location with modern bottom-right positioning
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
    // Create modern location control positioned at bottom-right
    const LocationControl = L.Control.extend({
      options: {
        position: 'bottomright'
      },
      onAdd: function(map: L.Map) {
        // Create location button container
        const locationContainer = L.DomUtil.create('div', 'leaflet-control-location-modern')
        
        // Create modern location button
        const locationButton = L.DomUtil.create('button', 'location-button', locationContainer)
        locationButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        `
        locationButton.title = 'Find my location'
        
        // Note: Hover and active effects are now handled by CSS classes
        
        // Handle click events
        L.DomEvent.on(locationButton, 'click', L.DomEvent.preventDefault)
        L.DomEvent.on(locationButton, 'click', findUserLocation)
        
        // Prevent map interactions
        L.DomEvent.disableClickPropagation(locationContainer)
        L.DomEvent.disableScrollPropagation(locationContainer)
        
        // Add to map container
        map.getContainer().appendChild(locationContainer)
        
        return { remove: () => locationContainer.remove() }
      }
    })
    
    const locationControl = new LocationControl()
    const controlInstance = locationControl.onAdd(map)
    
    return () => {
      if (controlInstance && controlInstance.remove) {
        controlInstance.remove()
      }
    }
  }, [map])
  
  return null
}

// Component to handle custom attribution control positioned at bottom-left
function AttributionControlHandler({ attribution }: { attribution: string }) {
  const map = useMap()
  
  useEffect(() => {
    // Create custom attribution control
    const CustomAttributionControl = L.Control.extend({
      options: {
        position: 'bottomleft'
      },
      onAdd: function(map: L.Map) {
        const container = L.DomUtil.create('div', 'leaflet-control-attribution leaflet-control')
        container.innerHTML = attribution
        
        // Prevent map interactions
        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.disableScrollPropagation(container)
        
        return container
      }
    })
    
    const attributionControl = new CustomAttributionControl()
    map.addControl(attributionControl)
    
    return () => {
      map.removeControl(attributionControl)
    }
  }, [map, attribution])
  
  return null
}

// Component to handle layer toggle button positioned above places count
function LayerToggleHandler({ currentLayerId, onLayerChange }: { currentLayerId: string, onLayerChange: (layerId: string) => void }) {
  const map = useMap()
  
  const toggleLayer = () => {
    const newLayerId = currentLayerId === 'light' ? 'satellite' : 'light'
    onLayerChange(newLayerId)
  }
  
  const getLayersIcon = () => {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    `
  }

  useEffect(() => {
    // Create layer toggle button positioned at bottom-left above places count
    const LayerToggleControl = L.Control.extend({
      options: {
        position: 'bottomleft'
      },
      onAdd: function(map: L.Map) {
        // Create layer toggle button container
        const layerContainer = L.DomUtil.create('div', 'leaflet-control-layer-toggle')
        layerContainer.style.cssText = `
          position: absolute;
          bottom: 60px;
          left: 8px;
          z-index: 1000;
        `
        
        // Create modern layer toggle button
        const layerButton = L.DomUtil.create('button', 'layer-toggle-button', layerContainer)
        layerButton.innerHTML = getLayersIcon()
        layerButton.title = 'Toggle Map Style'
        layerButton.style.cssText = `
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: white;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          transition: all 0.2s ease;
          outline: none;
        `
        
        // Add hover and active effects
        L.DomEvent.on(layerButton, 'mouseenter', () => {
          layerButton.style.transform = 'scale(1.05)'
          layerButton.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'
          layerButton.style.background = '#f8fafc'
        })
        
        L.DomEvent.on(layerButton, 'mouseleave', () => {
          layerButton.style.transform = 'scale(1)'
          layerButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)'
          layerButton.style.background = 'white'
        })
        
        L.DomEvent.on(layerButton, 'mousedown', () => {
          layerButton.style.transform = 'scale(0.95)'
        })
        
        L.DomEvent.on(layerButton, 'mouseup', () => {
          layerButton.style.transform = 'scale(1.05)'
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
        
        return { remove: () => layerContainer.remove() }
      }
    })
    
    const layerToggleControl = new LayerToggleControl()
    const controlInstance = layerToggleControl.onAdd(map)
    
    return () => {
      if (controlInstance && controlInstance.remove) {
        controlInstance.remove()
      }
    }
  }, [map, currentLayerId, onLayerChange])
  
  return null
}

// Component to display places count above attribution
function PlacesCountHandler({ count }: { count: number }) {
  const map = useMap()
  
  useEffect(() => {
    // Create places count display
    const CountControl = L.Control.extend({
      options: {
        position: 'bottomleft'
      },
      onAdd: function(map: L.Map) {
        const container = L.DomUtil.create('div', 'leaflet-control-places-count')
        container.innerHTML = count.toString()
        container.style.cssText = `
          background: rgba(255, 255, 255, 0.9);
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(4px);
          margin: 8px;
          margin-bottom: 2px;
          user-select: none;
        `
        
        // Prevent map interactions
        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.disableScrollPropagation(container)
        
        return container
      }
    })
    
    const countControl = new CountControl()
    map.addControl(countControl)
    
    return () => {
      map.removeControl(countControl)
    }
  }, [map, count])
  
  return null
}

// Component to handle add court button positioned above locate button
function AddCourtButtonHandler({ onAddCourtClick }: { onAddCourtClick: () => void }) {
  const map = useMap()
  
  useEffect(() => {
    // Create add court button
    const AddCourtControl = L.Control.extend({
      options: {
        position: 'bottomright'
      },
      onAdd: function(map: L.Map) {
        // Create add court button container
        const addCourtContainer = L.DomUtil.create('div', 'leaflet-control-add-court')
        addCourtContainer.style.cssText = `
          position: absolute;
          bottom: 70px;
          right: 10px;
          z-index: 1000;
        `
        
        // Create modern add court button
        const addCourtButton = L.DomUtil.create('button', 'add-court-button', addCourtContainer)
        addCourtButton.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        `
        addCourtButton.title = 'Add court'
        addCourtButton.style.cssText = `
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: white;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          transition: all 0.2s ease;
          outline: none;
        `
        
        // Add hover and active effects
        L.DomEvent.on(addCourtButton, 'mouseenter', () => {
          addCourtButton.style.transform = 'scale(1.05)'
          addCourtButton.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'
          addCourtButton.style.background = '#f8fafc'
        })
        
        L.DomEvent.on(addCourtButton, 'mouseleave', () => {
          addCourtButton.style.transform = 'scale(1)'
          addCourtButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)'
          addCourtButton.style.background = 'white'
        })
        
        L.DomEvent.on(addCourtButton, 'mousedown', () => {
          addCourtButton.style.transform = 'scale(0.95)'
        })
        
        L.DomEvent.on(addCourtButton, 'mouseup', () => {
          addCourtButton.style.transform = 'scale(1.05)'
        })
        
        // Handle click events
        L.DomEvent.on(addCourtButton, 'click', (e) => {
          L.DomEvent.preventDefault(e)
          onAddCourtClick()
        })
        
        // Prevent map interactions
        L.DomEvent.disableClickPropagation(addCourtContainer)
        L.DomEvent.disableScrollPropagation(addCourtContainer)
        
        // Add to map container
        map.getContainer().appendChild(addCourtContainer)
        
        return { remove: () => addCourtContainer.remove() }
      }
    })
    
    const addCourtControl = new AddCourtControl()
    const controlInstance = addCourtControl.onAdd(map)
    
    return () => {
      if (controlInstance && controlInstance.remove) {
        controlInstance.remove()
      }
    }
  }, [map, onAddCourtClick])
  
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
  selectedSport = 'all',
  searchQuery = '',
  onSearchChange,
  onSportChange,
  showSearchControls = false,
  placesCount = 0,
  showAddCourtButton = false,
  onAddCourtClick
}: LeafletCourtMapProps) {
  const { user, profile } = useAuth()
  const [selectedCourt, setSelectedCourt] = useState<PlaceWithCourts | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [currentLayerId, setCurrentLayerId] = useState<string>(() => getSavedLayerPreference())
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const isClosingExplicitly = useRef(false)

  // Debug: Track state changes
  useEffect(() => {
    console.log('📊 State changed:', {
      isBottomSheetOpen,
      isBottomSheetExpanded,
      selectedCourtId: selectedCourt?.id,
      selectedCourtName: selectedCourt?.name
    })
  }, [isBottomSheetOpen, isBottomSheetExpanded, selectedCourt])

  const handleCourtSelect = useCallback((court: PlaceWithCourts) => {
    console.log('🎯 handleCourtSelect called:', {
      courtId: court.id,
      courtName: court.name,
      isBottomSheetOpen,
      previousCourtId: selectedCourt?.id
    })
    
    setSelectedCourt(court)
    if (!isBottomSheetOpen) {
      console.log('📂 Opening bottom sheet')
      setIsBottomSheetOpen(true)
    } else {
      console.log('📂 Bottom sheet already open, just updating content')
    }
    onCourtSelect?.(court)
  }, [isBottomSheetOpen, selectedCourt?.id, onCourtSelect])

  const handleExplicitClose = useCallback(() => {
    console.log('🗂️ Explicit close requested - clearing selection and closing sheet')
    setSelectedCourt(null)
    setIsBottomSheetOpen(false)
    setIsBottomSheetExpanded(false)
  }, [])

  const handleLocationFound = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng })
  }, [])

  const handleLayerChange = useCallback((layerId: string) => {
    setCurrentLayerId(layerId)
    saveLayerPreference(layerId)
  }, [])

  const handleFilterClick = useCallback(() => {
    setIsFilterSheetOpen(true)
  }, [])

  const handleBottomSheetExpand = useCallback(() => {
    console.log('🔼 Expanding bottom sheet')
    setIsBottomSheetExpanded(true)
  }, [])

  const handleBottomSheetCollapse = useCallback(() => {
    console.log('🔽 Collapsing bottom sheet')
    setIsBottomSheetExpanded(false)
  }, [])

  const handleBottomSheetToggle = useCallback(() => {
    console.log('🔄 Toggling bottom sheet expansion')
    setIsBottomSheetExpanded(prev => !prev)
  }, [])

  // Touch/swipe gesture handlers
  const touchStart = useRef<{ y: number; time: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return

    const touchEnd = e.changedTouches[0].clientY
    const deltaY = touchStart.current.y - touchEnd
    const deltaTime = Date.now() - touchStart.current.time

    // Swipe up detection (minimum distance and not too slow)
    if (deltaY > 50 && deltaTime < 300 && !isBottomSheetExpanded) {
      handleBottomSheetExpand()
    }
    // Swipe down detection when expanded
    else if (deltaY < -50 && deltaTime < 300 && isBottomSheetExpanded) {
      handleBottomSheetCollapse()
    }

    touchStart.current = null
  }, [isBottomSheetExpanded, handleBottomSheetExpand, handleBottomSheetCollapse])

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    // Don't expand if clicking on buttons or interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button, a, [role="button"]')) {
      return
    }

    // Only expand on click if not already expanded
    if (!isBottomSheetExpanded) {
      handleBottomSheetExpand()
    }
  }, [isBottomSheetExpanded, handleBottomSheetExpand])

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBottomSheetOpen && isBottomSheetExpanded) {
        e.preventDefault()
        handleBottomSheetCollapse()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isBottomSheetOpen, isBottomSheetExpanded, handleBottomSheetCollapse])

  // Default center (Germany)
  const defaultCenter: [number, number] = [51.165691, 10.451526]
  
  // Get current layer configuration (memoized)
  const currentLayer = useMemo(() => MAP_LAYERS[currentLayerId] || MAP_LAYERS[DEFAULT_LAYER_ID], [currentLayerId])

  return (
    <div className="relative" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={7}
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
          
          {/* Court markers - with optional clustering */}
          {useMemo(() => {
            if (enableClustering && courts.length > 10) {
              return (
                <MarkerClusterGroup 
                  courts={courts}
                  onCourtSelect={handleCourtSelect}
                  selectedCourt={selectedCourt}
                  selectedSport={selectedSport}
                />
              )
            }
            
            // Individual markers when not clustering
            return courts.map((court) => {
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
                  click: (e) => {
                    console.log('📍 Regular marker clicked:', {
                      courtId: court.id,
                      eventPropagationStopped: true
                    })
                    e.originalEvent.stopPropagation()
                    handleCourtSelect(court)
                  }
                }}
              />
            )
            })
          }, [enableClustering, courts, selectedSport, handleCourtSelect])}
          
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
            onCloseFilterSheet={() => setIsFilterSheetOpen(false)}
            onCloseMapPinSheet={() => {
              console.log('🗺️ Explicitly closing map pin sheet via map click')
              handleExplicitClose()
            }}
          />
          
          {/* User location control */}
          <UserLocationHandler onLocationFound={handleLocationFound} />
          
          {/* Modern search control */}
          {showSearchControls && (
            <SearchFilterControlHandler 
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              onFilterClick={handleFilterClick}
            />
          )}
          
          
          {/* Custom attribution control */}
          <AttributionControlHandler attribution={currentLayer.attribution} />
          
          {/* Layer toggle button */}
          <LayerToggleHandler currentLayerId={currentLayerId} onLayerChange={handleLayerChange} />
          
          {/* Places count display */}
          <PlacesCountHandler count={placesCount} />
          
          {/* Add court button */}
          {showAddCourtButton && onAddCourtClick && (
            <AddCourtButtonHandler onAddCourtClick={onAddCourtClick} />
          )}
        </MapContainer>
      
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
      <Sheet 
        open={isBottomSheetOpen} 
        onOpenChange={(open) => {
          console.log('📋 Sheet onOpenChange triggered:', {
            open,
            previousState: isBottomSheetOpen,
            selectedCourtId: selectedCourt?.id,
            isClosingExplicitly: isClosingExplicitly.current
          })
          
          if (open === false) {
            // If this is an explicit close (map click), it's already handled
            if (isClosingExplicitly.current) {
              console.log('🗂️ Explicit close - already handled by trigger')
              isClosingExplicitly.current = false
              return
            }
            
            // Prevent unwanted closes when a court is selected
            if (selectedCourt) {
              console.log('🚫 Ignoring close - court is selected, use explicit close instead')
              return
            }
          }
          
          setIsBottomSheetOpen(open)
        }} 
        modal={false}
      >
        <SheetContent 
          side="bottom" 
          className={`border-0 transition-all duration-300 ${
            isBottomSheetExpanded 
              ? 'h-[85vh] max-h-[90vh]' 
              : 'h-auto max-h-[45vh]'
          }`}
          hideOverlay
          onClose={handleExplicitClose}
        >
          {selectedCourt && (
            <div 
              className="space-y-4"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={handleContentClick}
            >
              {/* Drag Handle */}
              <div className="flex justify-center py-2 -mt-2">
                <div 
                  className="w-12 h-1 bg-gray-300 rounded-full cursor-pointer hover:bg-gray-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBottomSheetToggle()
                  }}
                />
              </div>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <SheetTitle className="text-lg">{selectedCourt.name}</SheetTitle>
                    {userLocation && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {getDistanceText(userLocation, { lat: selectedCourt.latitude, lng: selectedCourt.longitude })}
                      </p>
                    )}
                  </div>
                  {/* View Details button */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-xs"
                    onClick={() => window.location.href = `/places/${selectedCourt.id}`}
                  >
                    View Details
                  </Button>
                </div>
                {/* Quick Address */}
                {(() => {
                  const quickAddress = [selectedCourt.street, selectedCourt.district || selectedCourt.city]
                    .filter(Boolean)
                    .join(', ')
                  return quickAddress && (
                    <SheetDescription className="text-sm text-muted-foreground">
                      {quickAddress}
                    </SheetDescription>
                  )
                })()}
                {selectedCourt.description && (
                  <SheetDescription className="mt-2">
                    {selectedCourt.description}
                  </SheetDescription>
                )}
              </SheetHeader>
              
              {/* Place Image */}
              {selectedCourt.image_url && (
                <div className={`w-full rounded-lg overflow-hidden transition-all duration-300 ${
                  isBottomSheetExpanded ? 'h-48' : 'h-24'
                }`}>
                  <img 
                    src={selectedCourt.image_url} 
                    alt={selectedCourt.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.parentElement?.remove()
                    }}
                  />
                </div>
              )}
              
              <div className={`space-y-3 ${!isBottomSheetExpanded ? 'overflow-hidden' : ''}`}>
                {/* Sports badges */}
                {(() => {
                  if (!selectedCourt) return null;
                  
                  const sportsWithCounts = selectedCourt.courts?.length > 0 
                    ? selectedCourt.courts.reduce((acc, c) => {
                        acc[c.sport] = (acc[c.sport] || 0) + (c.quantity || 1)
                        return acc
                      }, {} as Record<string, number>)
                    : (selectedCourt.sports?.reduce((acc, sport) => ({ ...acc, [sport]: 1 }), {} as Record<string, number>) || {})
                  
                  return Object.keys(sportsWithCounts).length > 0 && (
                    <div>
                      {isBottomSheetExpanded && (
                        <h4 className="text-sm font-medium mb-2">Available Sports</h4>
                      )}
                      <div className={`flex flex-wrap gap-2 ${
                        !isBottomSheetExpanded ? 'max-h-8 overflow-hidden' : ''
                      }`}>
                        {Object.entries(sportsWithCounts).map(([sport, count]) => (
                          <Badge 
                            key={sport} 
                            className={`${isBottomSheetExpanded ? 'text-sm' : 'text-xs'} ${getSportBadgeClasses(sport)}`}
                          >
                            {sportIcons[sport] || '📍'} {sportNames[sport] || sport} 
                            {isBottomSheetExpanded && ` (${count})`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                
                {/* Action buttons - only show when expanded */}
                {isBottomSheetExpanded && (() => {
                  const isAdmin = profile?.user_role === 'admin'
                  const canEdit = !!user // Any authenticated user can edit (community-based)
                  
                  return (
                    <div className="space-y-2 pt-2">
                      {/* Edit button (if can edit) */}
                      {canEdit && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => window.location.href = `/places/${selectedCourt.id}/edit`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {isAdmin ? 'Edit Place' : 'Suggest Edit'}
                        </Button>
                      )}
                      
                      {/* Other action buttons */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            // TODO: Implement save functionality
                            console.log('Save place:', selectedCourt.id)
                          }}
                        >
                          <Heart className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            const url = `https://maps.google.com/?q=${selectedCourt.latitude},${selectedCourt.longitude}`
                            window.open(url, '_blank', 'noopener,noreferrer')
                          }}
                        >
                          <Navigation className="h-4 w-4 mr-1" />
                          Directions
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            // TODO: Implement share functionality
                            if (navigator.share) {
                              navigator.share({
                                title: selectedCourt.name,
                                text: `Check out ${selectedCourt.name}`,
                                url: `${window.location.origin}/places/${selectedCourt.id}`
                              }).catch(err => console.log('Share failed:', err))
                            } else {
                              console.log('Share not supported')
                            }
                          }}
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  )
                })()}
                
                {/* Expand indicator when collapsed */}
                {!isBottomSheetExpanded && (
                  <div className="flex items-center justify-center pt-2 text-muted-foreground">
                    <div className="flex items-center gap-2 text-xs">
                      <span>Swipe up or tap to see more</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Filter Bottom Sheet */}
      <FilterBottomSheet 
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        selectedSport={selectedSport}
        onSportChange={onSportChange}
      />
    </div>
  )
}