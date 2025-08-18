'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { Court } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, Plus } from 'lucide-react'

import 'mapbox-gl/dist/mapbox-gl.css'

interface CourtMapProps {
  courts: Court[]
  onCourtSelect?: (court: Court) => void
  onMapClick?: (lng: number, lat: number) => void
  height?: string
  allowAddCourt?: boolean
  selectedLocation?: { lat: number; lng: number } | null
}

export default function CourtMap({ 
  courts, 
  onCourtSelect, 
  onMapClick, 
  height = '400px',
  allowAddCourt = false,
  selectedLocation = null
}: CourtMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const selectedLocationMarker = useRef<mapboxgl.Marker | null>(null)
  const courtMarkersRef = useRef<mapboxgl.Marker[]>([])

  // Initialize map only once
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Check if Mapbox token is available
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!mapboxToken) {
      console.warn('Mapbox access token not found. Map will not be rendered.')
      return
    }

    mapboxgl.accessToken = mapboxToken

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40], // Default center (New York area)
      zoom: 9,
    })

    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Global function for popup buttons
    ;(window as any).selectCourt = (courtId: string) => {
      const court = courts.find(c => c.id === courtId)
      if (court) {
        setSelectedCourt(court)
        onCourtSelect?.(court)
      }
    }

    return () => {
      selectedLocationMarker.current?.remove()
      courtMarkersRef.current.forEach(marker => marker.remove())
      map.current?.remove()
      map.current = null
    }
  }, []) // No dependencies - only initialize once

  // Handle courts markers
  useEffect(() => {
    if (!map.current) return

    // Clear existing court markers
    courtMarkersRef.current.forEach(marker => marker.remove())
    courtMarkersRef.current = []

    // Add new court markers
    courts.forEach((court) => {
      const marker = new mapboxgl.Marker({ color: '#10B981' })
        .setLngLat([court.longitude, court.latitude])
        .addTo(map.current!)

      // Create popup content
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-sm mb-1">${court.name}</h3>
          <div class="flex flex-wrap gap-1 mb-2">
            ${court.sports.map(sport => 
              `<span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">${sport}</span>`
            ).join('')}
          </div>
          ${court.description ? `<p class="text-xs text-gray-600 mb-2">${court.description}</p>` : ''}
          <button 
            class="w-full px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            onclick="window.selectCourt('${court.id}')"
          >
            Select Court
          </button>
        </div>
      `

      marker.setPopup(new mapboxgl.Popup().setHTML(popupContent))
      courtMarkersRef.current.push(marker)
    })
  }, [courts, onCourtSelect])

  // Handle map click events for adding courts
  useEffect(() => {
    if (!map.current) return

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (allowAddCourt && onMapClick) {
        onMapClick(e.lngLat.lng, e.lngLat.lat)
      }
    }

    if (allowAddCourt && onMapClick) {
      map.current.on('click', handleClick)
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleClick)
      }
    }
  }, [allowAddCourt, onMapClick])

  // Handle selected location marker
  useEffect(() => {
    if (!map.current) return

    // Remove existing selected location marker
    if (selectedLocationMarker.current) {
      selectedLocationMarker.current.remove()
      selectedLocationMarker.current = null
    }

    // Add new selected location marker if location is set
    if (selectedLocation) {
      selectedLocationMarker.current = new mapboxgl.Marker({ 
        color: '#EF4444', // Red color for selected location
        scale: 1.2 // Slightly larger
      })
        .setLngLat([selectedLocation.lng, selectedLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<div>Selected Court Location</div>'))
        .addTo(map.current)
    }
  }, [selectedLocation])

  const centerOnUserLocation = () => {
    if (userLocation && map.current) {
      map.current.flyTo({
        center: userLocation,
        zoom: 14
      })
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude]
          setUserLocation(coords)
          
          if (map.current) {
            map.current.flyTo({
              center: coords,
              zoom: 14
            })
            
            // Add user location marker
            new mapboxgl.Marker({ color: '#3B82F6' })
              .setLngLat(coords)
              .setPopup(new mapboxgl.Popup().setHTML('<div>Your Location</div>'))
              .addTo(map.current)
          }
        },
        (error) => {
          console.warn('Could not get user location:', error)
          // Show user-friendly error message instead of just console warning
          alert('Could not access your location. Please check your browser settings and try again.')
        }
      )
    }
  }

  // Check if Mapbox token is available
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (!mapboxToken) {
    return (
      <Card style={{ height }}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">Map Unavailable</CardTitle>
            <CardDescription>
              Mapbox configuration is required to display the map.
              <br />
              Please set up your Mapbox access token.
            </CardDescription>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative">
      <div ref={mapContainer} style={{ height }} className="rounded-lg overflow-hidden" />
      
      {/* Map Controls */}
      <div className="absolute top-4 left-4 space-y-2">
        <Button
          size="sm"
          variant="secondary"
          className="bg-white/90 hover:bg-white"
          onClick={centerOnUserLocation}
        >
          <Navigation className="h-4 w-4 mr-1" />
          My Location
        </Button>
        
        {allowAddCourt && (
          <div className="bg-white/90 rounded-lg p-2 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Plus className="h-3 w-3" />
              Click map to add court
            </div>
          </div>
        )}
      </div>

      {/* Selected Court Info */}
      {selectedCourt && (
        <Card className="absolute bottom-4 left-4 right-4 bg-white/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{selectedCourt.name}</CardTitle>
            <div className="flex flex-wrap gap-1">
              {selectedCourt.sports.map((sport) => (
                <Badge key={sport} variant="secondary" className="text-xs">
                  {sport}
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