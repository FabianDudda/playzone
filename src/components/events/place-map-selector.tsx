'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, X } from 'lucide-react'
import { PlaceWithCourts } from '@/lib/supabase/types'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'

// Dynamic import to prevent SSR issues with Leaflet
const LeafletCourtMap = dynamic(() => import('@/components/map/leaflet-court-map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-xs text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
})

interface PlaceMapSelectorProps {
  selectedPlaceId: string
  onPlaceSelect: (placeId: string, place: PlaceWithCourts) => void
  preSelectedPlaceId?: string
  className?: string
  height?: string
}

export default function PlaceMapSelector({
  selectedPlaceId,
  onPlaceSelect,
  preSelectedPlaceId,
  className = "",
  height = "300px"
}: PlaceMapSelectorProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithCourts | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)

  // Fetch all places
  const { data: places = [], isLoading } = useQuery({
    queryKey: ['places'],
    queryFn: () => database.courts.getAllCourts(),
  })

  // Handle pre-selection from URL parameters or form state
  useEffect(() => {
    if (places.length > 0) {
      const placeToSelect = places.find(p => p.id === (selectedPlaceId || preSelectedPlaceId))
      if (placeToSelect) {
        setSelectedPlace(placeToSelect)
        // Center map on pre-selected place
        setMapCenter([placeToSelect.latitude, placeToSelect.longitude])
      }
    }
  }, [places, selectedPlaceId, preSelectedPlaceId])

  const handlePlaceSelect = (place: PlaceWithCourts) => {
    setSelectedPlace(place)
    onPlaceSelect(place.id, place)
  }

  const handleClearSelection = () => {
    setSelectedPlace(null)
    onPlaceSelect('', {} as PlaceWithCourts)
    setMapCenter(null)
  }

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className={`bg-gray-100 rounded-lg animate-pulse`} style={{ height }}></div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected Place Display */}
      {selectedPlace ? (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-blue-900 truncate">{selectedPlace.name}</p>
              {(selectedPlace.city || selectedPlace.district) && (
                <p className="text-sm text-blue-700 truncate">
                  {[selectedPlace.street, selectedPlace.district || selectedPlace.city]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Click on a location marker on the map to select it
          </p>
        </div>
      )}

      {/* Map Container */}
      <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height }}>
        <LeafletCourtMap
          courts={places}
          onCourtSelect={handlePlaceSelect}
          height="100%"
          enableClustering={true} // Enable clustering for consistency and performance
          selectedSport="all"
          showAddCourtButton={false} // Hide add court button in selector mode
          placesCount={0} // Hide places count in selector mode
        />
      </div>

      {/* Map Instructions */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span>Click on any marker to select that location for your event</span>
      </div>

      {/* Selected Place Sports Info */}
      {selectedPlace && selectedPlace.courts && selectedPlace.courts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Available sports at this location:</p>
          <div className="flex flex-wrap gap-1">
            {[...new Set(selectedPlace.courts.map(court => court.sport))].map(sport => (
              <Badge key={sport} variant="outline" className="text-xs">
                {sport}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}