import { notFound } from 'next/navigation'
import Link from 'next/link'
import { database } from '@/lib/supabase/database'
import { PlaceWithCourts } from '@/lib/supabase/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, ArrowLeft, Share2, Calendar, Users, Navigation } from 'lucide-react'
import { getSportBadgeClasses, sportNames, sportIcons } from '@/lib/utils/sport-utils'
import { Metadata } from 'next'

interface PlacePageProps {
  params: Promise<{ id: string }>
}

async function getPlace(id: string): Promise<PlaceWithCourts | null> {
  try {
    return await database.courts.getCourt(id)
  } catch (error) {
    console.error('Error fetching place:', error)
    return null
  }
}

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
  const { id } = await params
  const place = await getPlace(id)
  
  if (!place) {
    return {
      title: 'Place Not Found - Court Sports',
      description: 'The requested place could not be found.',
    }
  }

  // Get available sports from courts
  const availableSports = place.courts?.length > 0 
    ? [...new Set(place.courts.map(court => court.sport))]
    : (place.sports || [])

  const sportsText = availableSports.length > 0 ? availableSports.join(', ') : 'Multiple sports'
  
  // Build address string
  const addressParts = [
    place.street && place.house_number ? `${place.street} ${place.house_number}` : place.street,
    place.city,
    place.state,
    place.country
  ].filter(Boolean)
  const address = addressParts.length > 0 ? addressParts.join(', ') : `${place.latitude}, ${place.longitude}`

  return {
    title: `${place.name} - Court Sports`,
    description: `${place.description || `Sports facility offering ${sportsText}`}. Located at ${address}. Find court details, sports available, and location information.`,
    openGraph: {
      title: `${place.name} - Court Sports`,
      description: `Sports facility with ${sportsText}. Located at ${address}`,
      images: place.image_url ? [place.image_url] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${place.name} - Court Sports`,
      description: `Sports facility with ${sportsText}`,
      images: place.image_url ? [place.image_url] : [],
    }
  }
}

export default async function PlacePage({ params }: PlacePageProps) {
  const { id } = await params
  const place = await getPlace(id)

  if (!place) {
    notFound()
  }

  // Get unique sports from the courts array, fallback to legacy sports array
  const availableSports = place.courts?.length > 0 
    ? [...new Set(place.courts.map(court => court.sport))]
    : (place.sports || [])

  // Build address string
  const addressParts = [
    place.street && place.house_number ? `${place.street} ${place.house_number}` : place.street,
    place.city,
    place.district,
    place.state,
    place.country
  ].filter(Boolean)

  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null

  return (
    <div className="container px-4 py-6 max-w-6xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <Link 
          href="/map" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courts
        </Link>
      </div>

      {/* Place Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Place Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{place.name}</h1>
            
            {/* Location */}
            <div className="flex items-start gap-2 text-muted-foreground mb-4">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                {fullAddress ? (
                  <div>{fullAddress}</div>
                ) : (
                  <div>Coordinates: {place.latitude}, {place.longitude}</div>
                )}
                {place.postcode && (
                  <div className="text-xs mt-1">Postal Code: {place.postcode}</div>
                )}
              </div>
            </div>

            {/* Available Sports */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Available Sports:</h3>
              <div className="flex flex-wrap gap-1">
                {availableSports.length > 0 ? (
                  availableSports.map((sport) => (
                    <Badge key={sport} className={`text-xs ${getSportBadgeClasses(sport)}`}>
                      {sportIcons[sport] || '📍'} {sportNames[sport] || sport}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No sports specified</span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {place.courts?.length || 0} court{(place.courts?.length || 0) !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Added {new Date(place.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Description */}
            {place.description && (
              <div className="mb-4">
                <p className="text-muted-foreground">{place.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`https://maps.google.com/?q=${place.latitude},${place.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Directions
                </a>
              </Button>
            </div>
          </div>

          {/* Place Image */}
          {place.image_url && (
            <div className="w-full md:w-80 h-64">
              <img 
                src={place.image_url} 
                alt={place.name}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Courts Section */}
          <Card>
            <CardHeader>
              <CardTitle>Courts & Facilities</CardTitle>
              <CardDescription>
                All sports facilities available at this location
              </CardDescription>
            </CardHeader>
            <CardContent>
              {place.courts && place.courts.length > 0 ? (
                <div className="space-y-4">
                  {place.courts.map((court, index) => (
                    <div key={court.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">
                            {court.sport}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {court.quantity}
                          </p>
                        </div>
                        <Badge className={`${getSportBadgeClasses(court.sport)}`}>
                          {sportIcons[court.sport] || '📍'} {sportNames[court.sport] || court.sport}
                        </Badge>
                      </div>
                      
                      {court.surface && (
                        <p className="text-sm text-muted-foreground mb-1">
                          Surface: {court.surface}
                        </p>
                      )}
                      
                      {court.notes && (
                        <p className="text-sm text-muted-foreground">
                          Notes: {court.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No detailed court information available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Additional Details */}
          {(place.features && place.features.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Features & Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {place.features.map((feature) => (
                    <Badge key={feature} variant="outline">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-64 bg-gray-100 rounded-b-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Interactive map coming soon</p>
                  <p className="text-xs mt-1">Coordinates: {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Place Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source:</span>
                <span>{place.source || 'Unknown'}</span>
              </div>
              {place.source_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source ID:</span>
                  <span className="font-mono text-xs">{place.source_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added by:</span>
                <span>{place.added_by_user}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(place.created_at).toLocaleDateString()}</span>
              </div>
              {place.import_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Import Date:</span>
                  <span>{new Date(place.import_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coordinates:</span>
                <span className="font-mono text-xs">
                  {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}