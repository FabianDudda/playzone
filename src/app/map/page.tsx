'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { PlaceWithCourts, SportType } from '@/lib/supabase/types'
// Dynamic import to prevent SSR issues with Leaflet
const LeafletCourtMap = dynamic(() => import('@/components/map/leaflet-court-map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
})
import { MapPin, Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'


const SPORTS = [ 'fußball', 'basketball', 'tischtennis', 'volleyball', 'beachvolleyball', 'spikeball', 'boule', 'boldern', 'skatepark'] as const

const SURFACE_TYPES = [
  'Rasen',
  'Hartplatz', 
  'Asphalt',
  'Kunststoffbelag',
  'Asche',
  'Kunstrasen',
  'Sonstiges',
] as const

export default function CourtsPage() {
  const { user } = useAuth()
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all')
  const [selectedSurface, setSelectedSurface] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithCourts | null>(null)

  // Fetch all places (formerly courts)
  const { data: places = [], isLoading } = useQuery({
    queryKey: ['places'],
    queryFn: () => database.courts.getAllCourts(),
  })

  // Filter places based on sport, surface and search
  const filteredPlaces = places.filter((place) => {
    // Check if place matches the sport+surface combination
    const matchesCombination = 
      // Both filters are "all" - show all places
      (selectedSport === 'all' && selectedSurface === 'all') ||
      // Only sport filter is active
      (selectedSport !== 'all' && selectedSurface === 'all' && (
        place.courts?.some(court => court.sport === selectedSport) ||
        place.sports?.includes(selectedSport) // fallback to legacy sports array
      )) ||
      // Only surface filter is active (shouldn't happen with current UI, but for completeness)
      (selectedSport === 'all' && selectedSurface !== 'all' && 
        place.courts?.some(court => court.surface === selectedSurface)
      ) ||
      // Both filters are active - find courts with BOTH the sport AND surface
      (selectedSport !== 'all' && selectedSurface !== 'all' &&
        place.courts?.some(court => court.sport === selectedSport && court.surface === selectedSurface)
      )
      
    const matchesSearch = !searchQuery || 
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesCombination && matchesSearch
  })

  const handlePlaceSelect = (place: PlaceWithCourts) => {
    setSelectedPlace(place)
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <LeafletCourtMap 
        courts={filteredPlaces}
        onCourtSelect={handlePlaceSelect}
        height="100%"
        selectedSport={selectedSport}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSportChange={(sport) => {
          setSelectedSport(sport)
          setSelectedSurface('all') // Reset surface filter when sport changes
        }}
        showSearchControls={true}
        placesCount={filteredPlaces.length}
        showAddCourtButton={!!user}
        onAddCourtClick={() => window.location.href = '/map/new'}
      />
    </div>
  )
}