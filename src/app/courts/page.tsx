'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { Court, SportType } from '@/lib/supabase/types'
import CourtMap from '@/components/map/court-map'
import { MapPin, Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'

const SPORTS = ['tennis', 'basketball', 'volleyball', 'spikeball', 'badminton', 'squash', 'pickleball'] as const

export default function CourtsPage() {
  const { user } = useAuth()
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)

  // Fetch all courts
  const { data: courts = [], isLoading } = useQuery({
    queryKey: ['courts'],
    queryFn: () => database.courts.getAllCourts(),
  })

  // Filter courts based on sport and search
  const filteredCourts = courts.filter((court) => {
    const matchesSport = selectedSport === 'all' || court.sports.includes(selectedSport)
    const matchesSearch = !searchQuery || 
      court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      court.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSport && matchesSearch
  })

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court)
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Court Locations</CardTitle>
              <CardDescription>
                {filteredCourts.length} court{filteredCourts.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <CourtMap 
                courts={filteredCourts}
                onCourtSelect={handleCourtSelect}
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
              <div className="text-center py-8">Loading courts...</div>
            ) : filteredCourts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No courts found</h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedSport || searchQuery 
                      ? 'Try adjusting your filters to find more courts.'
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
                {filteredCourts.map((court) => (
                  <Card 
                    key={court.id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedCourt?.id === court.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleCourtSelect(court)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{court.name}</h3>
                        
                        <div className="flex flex-wrap gap-1">
                          {court.sports.map((sport) => (
                            <Badge key={sport} variant="secondary" className="text-xs">
                              {sport}
                            </Badge>
                          ))}
                        </div>
                        
                        {court.description && (
                          <p className="text-sm text-muted-foreground">
                            {court.description}
                          </p>
                        )}
                        
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Click to view on map</span>
                          {user && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Navigate to match creation with this court pre-selected
                                const url = new URL('/matches/new', window.location.origin)
                                url.searchParams.set('court', court.id)
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}