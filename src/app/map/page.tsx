'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="container px-4 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Find Courts
          </h1>
          <p className="text-muted-foreground">Discover sports courts in your area</p>
        </div>
        {user && (
          <Button asChild>
            <Link href="/courts/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Court
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={selectedSport} onValueChange={(value) => {
                setSelectedSport(value as SportType | 'all')
                setSelectedSurface('all') // Reset surface filter when sport changes
              }}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All sports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sports</SelectItem>
                  {SPORTS.map((sport) => (
                    <SelectItem key={sport} value={sport}>
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSport !== 'all' && (
              <div className="sm:w-48">
                <Select value={selectedSurface} onValueChange={(value) => setSelectedSurface(value)}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All surfaces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All surfaces</SelectItem>
                    {SURFACE_TYPES.map((surface) => (
                      <SelectItem key={surface} value={surface}>
                        {surface}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map View */}
      <Card>
        <CardHeader>
          <CardTitle>Court Locations</CardTitle>
          <CardDescription>
            {filteredPlaces.length} place{filteredPlaces.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <LeafletCourtMap 
            courts={filteredPlaces}
            onCourtSelect={handlePlaceSelect}
            height="600px"
            selectedSport={selectedSport}
          />
        </CardContent>
      </Card>
    </div>
  )
}