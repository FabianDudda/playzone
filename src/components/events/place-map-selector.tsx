'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { MapPin, X } from 'lucide-react'
import { PlaceWithCourts, SportType } from '@/lib/supabase/types'
import { sportNames, sportIcons, getSportBadgeClasses } from '@/lib/utils/sport-utils'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'

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
  selectedSports?: SportType[]
  onSportsChange?: (sports: SportType[]) => void
  preSelectedPlaceId?: string
  className?: string
  height?: string
}

export default function PlaceMapSelector({
  selectedPlaceId,
  onPlaceSelect,
  selectedSports = [],
  onSportsChange,
  preSelectedPlaceId,
  className = "",
  height = "300px"
}: PlaceMapSelectorProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithCourts | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['places'],
    queryFn: () => database.courts.getAllCourts(),
  })

  useEffect(() => {
    if (places.length > 0) {
      const placeToSelect = places.find(p => p.id === (selectedPlaceId || preSelectedPlaceId))
      if (placeToSelect) {
        setSelectedPlace(placeToSelect)
        setMapCenter([placeToSelect.latitude, placeToSelect.longitude])
      }
    }
  }, [places, selectedPlaceId, preSelectedPlaceId])

  // Auto-select all sports when place has exactly one sport type
  useEffect(() => {
    if (!selectedPlace || !onSportsChange) return
    const sports = [...new Set((selectedPlace.courts || []).map(c => c.sport))] as SportType[]
    if (sports.length === 1) {
      onSportsChange(sports)
    }
  }, [selectedPlace]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlaceSelect = (place: PlaceWithCourts) => {
    setSelectedPlace(place)
    onPlaceSelect(place.id, place)
  }

  const handleClearSelection = () => {
    setSelectedPlace(null)
    onPlaceSelect('', {} as PlaceWithCourts)
    setMapCenter(null)
  }

  const toggleSport = (sport: SportType) => {
    if (!onSportsChange) return
    if (selectedSports.includes(sport)) {
      onSportsChange(selectedSports.filter(s => s !== sport))
    } else {
      onSportsChange([...selectedSports, sport])
    }
  }

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className={`bg-gray-100 rounded-lg animate-pulse`} style={{ height }}></div>
      </div>
    )
  }

  const availableSports = selectedPlace?.courts
    ? ([...new Set(selectedPlace.courts.map(c => c.sport))] as SportType[])
    : []

  return (
    <div className={`space-y-3 ${className}`}>
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
            onClick={handleClearSelection}
            className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Tippe auf einen Marker, um einen Ort auszuwählen
          </p>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height }}>
        <LeafletCourtMap
          courts={places}
          onCourtSelect={handlePlaceSelect}
          height="100%"
          enableClustering={true}
          showAddCourtButton={false}
          placesCount={0}
          embedded={true}
          showFilter={false}
          showFavorite={false}
        />
      </div>

      {onSportsChange && availableSports.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Sportart *</p>
          <div className="flex flex-wrap gap-2">
            {availableSports.map(sport => {
              const isSelected = selectedSports.includes(sport)
              return (
                <button
                  key={sport}
                  type="button"
                  onClick={() => toggleSport(sport)}
                  className={`inline-flex items-center gap-1 pl-3 pr-3.5 h-9 rounded-full text-sm font-medium border transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <span>{sportIcons[sport]}</span>
                  <span>{sportNames[sport] ?? sport.charAt(0).toUpperCase() + sport.slice(1)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
