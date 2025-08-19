'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { PlaceWithCourts } from '@/lib/supabase/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, TestTube, MapIcon, Loader2 } from 'lucide-react'

export default function TestPage() {
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodingResults, setGeocodingResults] = useState<string | null>(null)
  const [enrichedPlaces, setEnrichedPlaces] = useState<PlaceWithCourts[]>([])
  const queryClient = useQueryClient()

  const { data: places = [], isLoading, error } = useQuery({
    queryKey: ['test-places'],
    queryFn: () => database.courts.getAllCourts(),
  })

  // Use enriched places if available, otherwise use original places
  const displayPlaces = enrichedPlaces.length > 0 ? enrichedPlaces : places

  const handleBulkGeocode = async () => {
    if (places.length === 0) return
    
    setIsGeocoding(true)
    setGeocodingResults(null)
    
    try {
      const enrichedPlacesArray = [...places]
      let successCount = 0
      let errorCount = 0
      
      // Process each place individually for real-time feedback
      for (let i = 0; i < places.length; i++) {
        const place = places[i]
        
        try {
          // Fetch address for this place
          const response = await fetch('/api/geocode/lookup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude: place.latitude,
              longitude: place.longitude
            }),
          })
          
          if (response.ok) {
            const result = await response.json()
            
            // Update the place with address data
            enrichedPlacesArray[i] = {
              ...place,
              street: result.address.street || null,
              house_number: result.address.house_number || null,
              city: result.address.city || null,
              county: result.address.county || null,
              state: result.address.state || null,
              country: result.address.country || null,
              postcode: result.address.postcode || null,
            }
            
            successCount++
            
            // Update UI with progress
            setGeocodingResults(`🔄 Processing... ${i + 1}/${places.length} (${successCount} successful)`)
            setEnrichedPlaces([...enrichedPlacesArray])
            
          } else {
            console.error(`Failed to geocode place ${place.id}:`, response.status)
            errorCount++
          }
        } catch (error) {
          console.error(`Error geocoding place ${place.id}:`, error)
          errorCount++
        }
        
        // Add a small delay to respect rate limits
        if (i < places.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100)) // 1.1 second delay
        }
      }
      
      setGeocodingResults(`✅ Completed! ${successCount} places enriched${errorCount > 0 ? `, ${errorCount} errors` : ''}`)
      
    } catch (error) {
      setGeocodingResults(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleDebugData = () => {
    console.log('Original places data:', places)
    console.log('Display places data (enriched):', displayPlaces)
    // Check if any place has address data
    const enrichedPlaces = displayPlaces.filter(p => p.street || p.city)
    console.log(`Places with address data: ${enrichedPlaces.length}/${displayPlaces.length}`)
    setGeocodingResults(`🔍 Debug: ${enrichedPlaces.length}/${displayPlaces.length} places have address data. Check browser console for details.`)
  }

  if (isLoading) {
    return (
      <div className="container px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <TestTube className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Test Page</h1>
        </div>
        <div className="text-center py-8">Loading places...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <TestTube className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Test Page</h1>
        </div>
        <div className="text-center py-8 text-red-500">
          Error loading places: {(error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <TestTube className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Test Page - All Places</h1>
      </div>
      
      <div className="mb-6 space-y-4">
        {/* Data Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{displayPlaces.length}</div>
            <div className="text-sm text-muted-foreground">Total Places</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {displayPlaces.reduce((sum, place) => sum + (place.courts?.length || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Courts</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {displayPlaces.filter(p => p.street && p.city).length}
            </div>
            <div className="text-sm text-muted-foreground">With Addresses</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {displayPlaces.filter(p => p.image_url).length}
            </div>
            <div className="text-sm text-muted-foreground">With Images</div>
          </Card>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            All available data fields are displayed below
            {enrichedPlaces.length > 0 && ` (${enrichedPlaces.length} places enriched)`}
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleDebugData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              🔍 Debug Data
            </Button>
            <Button 
              onClick={handleBulkGeocode}
              disabled={isGeocoding || displayPlaces.length === 0}
              className="flex items-center gap-2"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Geocoding...
                </>
              ) : (
                <>
                  <MapIcon className="h-4 w-4" />
                  Enrich Addresses
                </>
              )}
            </Button>
          </div>
        </div>
        
        {geocodingResults && (
          <div className="p-3 rounded-md bg-muted">
            <p className="text-sm">{geocodingResults}</p>
          </div>
        )}
      </div>

      {displayPlaces.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No places found</h3>
            <p className="text-muted-foreground">
              No places are currently available in the database.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayPlaces.map((place: PlaceWithCourts) => {
            // Get unique sports from the courts array, fallback to legacy sports array
            const availableSports = place.courts?.length > 0 
              ? [...new Set(place.courts.map(court => court.sport))]
              : (place.sports || [])

            return (
              <Card key={place.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{place.name}</span>
                    <Badge variant="outline">
                      {place.courts?.length || 0} court{place.courts?.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    📍 {place.latitude}, {place.longitude}
                    {place.district && ` • ${place.district}`}
                    {place.neighborhood && ` • ${place.neighborhood}`}
                  </CardDescription>
                  {(place.street || place.city || place.country) && (
                    <CardDescription className="mt-1">
                      🏠 {[
                        place.house_number && place.street ? `${place.street} ${place.house_number}` : place.street,
                        place.city,
                        place.state,
                        place.country
                      ].filter(Boolean).join(', ')}
                      {place.postcode && ` (${place.postcode})`}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Available Sports */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Available Sports:</h4>
                      <div className="flex flex-wrap gap-1">
                        {availableSports.length > 0 ? (
                          availableSports.map((sport) => (
                            <Badge key={sport} variant="secondary" className="text-xs">
                              {sport}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No sports specified</span>
                        )}
                      </div>
                    </div>

                    {/* Individual Courts */}
                    {place.courts && place.courts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Court Details:</h4>
                        <div className="space-y-2">
                          {place.courts.map((court, index) => (
                            <div key={court.id} className="text-sm bg-muted/50 p-2 rounded">
                              <div className="font-medium">
                                Court {index + 1}: {court.sport}
                              </div>
                              {court.quantity > 1 && (
                                <div className="text-muted-foreground">
                                  Quantity: {court.quantity}
                                </div>
                              )}
                              {court.surface && (
                                <div className="text-muted-foreground">
                                  Surface: {court.surface}
                                </div>
                              )}
                              {court.notes && (
                                <div className="text-muted-foreground">
                                  Notes: {court.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Place Details */}
                    {place.description && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Description:</h4>
                        <p className="text-sm text-muted-foreground">{place.description}</p>
                      </div>
                    )}

                    {/* Address Details */}
                    {(place.street || place.city || place.country) && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Address Details:</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {place.street && <div>Street: {place.street}{place.house_number && ` ${place.house_number}`}</div>}
                          {place.city && <div>City: {place.city}</div>}
                          {place.county && <div>County: {place.county}</div>}
                          {place.state && <div>State: {place.state}</div>}
                          {place.country && <div>Country: {place.country}</div>}
                          {place.postcode && <div>Postal Code: {place.postcode}</div>}
                        </div>
                      </div>
                    )}

                    {/* Image */}
                    {place.image_url && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Court Image:</h4>
                        <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
                          <img 
                            src={place.image_url} 
                            alt={place.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              target.parentElement!.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                                  ❌ Image failed to load
                                </div>
                              `
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          URL: <a href={place.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{place.image_url}</a>
                        </div>
                      </div>
                    )}

                    {/* Additional Location Fields */}
                    {(place.area || place.district || place.neighborhood) && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Location Details:</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {place.area && <div>Area: {place.area}</div>}
                          {place.district && <div>District: {place.district}</div>}
                          {place.neighborhood && <div>Neighborhood: {place.neighborhood}</div>}
                        </div>
                      </div>
                    )}

                    {/* Complete Metadata */}
                    <div className="pt-2 border-t">
                      <h4 className="text-sm font-medium mb-2">Complete Metadata:</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div><span className="font-medium">ID:</span> {place.id}</div>
                        <div><span className="font-medium">Source:</span> {place.source || 'unknown'}</div>
                        {place.source_id && <div><span className="font-medium">Source ID:</span> {place.source_id}</div>}
                        {place.features && place.features.length > 0 && (
                          <div><span className="font-medium">Features:</span> {place.features.join(', ')}</div>
                        )}
                        <div><span className="font-medium">Added By:</span> {place.added_by_user}</div>
                        <div><span className="font-medium">Created:</span> {new Date(place.created_at).toLocaleString()}</div>
                        {place.import_date && (
                          <div><span className="font-medium">Import Date:</span> {new Date(place.import_date).toLocaleString()}</div>
                        )}
                        <div><span className="font-medium">Coordinates:</span> {place.latitude}, {place.longitude}</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Address Status:</span>
                          {(place.street && place.city) ? (
                            <Badge variant="default" className="text-xs">✅ Enriched</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">📍 Coordinates Only</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Image Status:</span>
                          {place.image_url ? (
                            <Badge variant="default" className="text-xs">📸 Has Image</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">📷 No Image</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Raw JSON Data (Collapsible) */}
                    <details className="pt-2 border-t">
                      <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                        🔍 Raw JSON Data (Click to expand)
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
                          {JSON.stringify(place, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}