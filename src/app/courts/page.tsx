'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { MapPin, Plus, Search, Filter, Map, List, Grid3X3 } from 'lucide-react'
import Link from 'next/link'
import { getSportBadgeClasses } from '@/lib/utils/sport-styles'

const SPORTS = ['tennis', 'basketball', 'volleyball', 'spikeball', 'badminton', 'squash', 'pickleball'] as const

export default function CourtsPage() {
  const { user } = useAuth()
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithCourts | null>(null)

  // Fetch all places (formerly courts)
  const { data: places = [], isLoading } = useQuery({
    queryKey: ['places'],
    queryFn: () => database.courts.getAllCourts(),
  })

  // Filter places based on sport and search
  const filteredPlaces = places.filter((place) => {
    // Check if place has courts with the selected sport
    const matchesSport = selectedSport === 'all' || 
      place.courts?.some(court => court.sport === selectedSport) ||
      place.sports?.includes(selectedSport) // fallback to legacy sports array
      
    const matchesSearch = !searchQuery || 
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSport && matchesSearch
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
              <Select value={selectedSport} onValueChange={(value) => setSelectedSport(value as SportType | 'all')}>
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
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="both" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Map
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="both" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Both
          </TabsTrigger>
        </TabsList>

        {/* Map Only View */}
        <TabsContent value="map" className="mt-6">
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
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* List Only View */}
        <TabsContent value="list" className="mt-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Places List</h2>
              <p className="text-sm text-muted-foreground">
                {filteredPlaces.length} place{filteredPlaces.length !== 1 ? 's' : ''} found
              </p>
            </div>
            {isLoading ? (
              <div className="text-center py-8">Loading places...</div>
            ) : filteredPlaces.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No places found</h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedSport || searchQuery 
                      ? 'Try adjusting your filters to find more places.'
                      : 'Be the first to add a place in your area!'
                    }
                  </p>
                  {user && (
                    <Button asChild size="sm">
                      <Link href="/courts/new">Add First Place</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPlaces.map((place) => {
                  // Calculate sport quantities from courts array, fallback to legacy sports array
                  const sportsWithCounts = place.courts?.length > 0 
                    ? place.courts.reduce((acc, court) => {
                        acc[court.sport] = (acc[court.sport] || 0) + (court.quantity || 1)
                        return acc
                      }, {} as Record<string, number>)
                    : (place.sports?.reduce((acc, sport) => ({ ...acc, [sport]: 1 }), {} as Record<string, number>) || {})
                    
                  return (
                    <Card 
                      key={place.id}
                      className="cursor-pointer transition-colors hover:bg-accent"
                      onClick={() => handlePlaceSelect(place)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-semibold">{place.name}</h3>
                          
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(sportsWithCounts).map(([sport, count]) => (
                              <Badge 
                                key={sport} 
                                className={`text-xs border-0 ${getSportBadgeClasses(sport)}`}
                              >
                                {sport} ({count})
                              </Badge>
                            ))}
                          </div>
                          
                          {place.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {place.description}
                            </p>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.location.href = `/places/${place.id}`
                              }}
                            >
                              View Details
                            </Button>
                            {user && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const url = new URL('/matches/new', window.location.origin)
                                  url.searchParams.set('place', place.id)
                                  window.location.href = url.toString()
                                }}
                              >
                                Log Match
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Both Views */}
        <TabsContent value="both" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
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
                    height="500px"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Court List */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-4">Courts List</h2>
                {isLoading ? (
                  <div className="text-center py-8">Loading places...</div>
                ) : filteredPlaces.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No places found</h3>
                      <p className="text-muted-foreground mb-4">
                        {selectedSport || searchQuery 
                          ? 'Try adjusting your filters to find more places.'
                          : 'Be the first to add a court in your area!'
                        }
                      </p>
                      {user && (
                        <Button asChild size="sm">
                          <Link href="/courts/new">Add First Court</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {filteredPlaces.map((place) => {
                      // Calculate sport quantities from courts array, fallback to legacy sports array
                      const sportsWithCounts = place.courts?.length > 0 
                        ? place.courts.reduce((acc, court) => {
                            acc[court.sport] = (acc[court.sport] || 0) + (court.quantity || 1)
                            return acc
                          }, {} as Record<string, number>)
                        : (place.sports?.reduce((acc, sport) => ({ ...acc, [sport]: 1 }), {} as Record<string, number>) || {})
                        
                      return (
                        <Card 
                          key={place.id}
                          className={`cursor-pointer transition-colors hover:bg-accent ${
                            selectedPlace?.id === place.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => handlePlaceSelect(place)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <h3 className="font-semibold">{place.name}</h3>
                              
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(sportsWithCounts).map(([sport, count]) => (
                                  <Badge 
                                    key={sport} 
                                    className={`text-xs border-0 ${getSportBadgeClasses(sport)}`}
                                  >
                                    {sport} ({count})
                                  </Badge>
                                ))}
                              </div>
                              
                              {place.description && (
                                <p className="text-sm text-muted-foreground">
                                  {place.description}
                                </p>
                              )}
                              
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Click to view on map</p>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.location.href = `/places/${place.id}`
                                    }}
                                  >
                                    View Details
                                  </Button>
                                  {user && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="flex-1"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const url = new URL('/matches/new', window.location.origin)
                                        url.searchParams.set('place', place.id)
                                        window.location.href = url.toString()
                                      }}
                                    >
                                      Log Match
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}