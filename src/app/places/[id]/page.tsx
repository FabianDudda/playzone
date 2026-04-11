import { notFound } from 'next/navigation'
import Link from 'next/link'
import { database } from '@/lib/supabase/database'
import { PlaceImage, PlaceWithCourts } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Phone, Mail, Globe } from 'lucide-react'
import { sportNames, sportIcons, getPlaceTypeBadgeClasses, placeTypeLabels, placeTypeIcons, PlaceType } from '@/lib/utils/sport-utils'
import { Metadata } from 'next'
import PlaceActions from '@/components/places/place-actions'
import PlaceLocationMap from '@/components/places/place-location-map'
import PlaceImageGallery from '@/components/places/place-image-gallery'
import BackButton from '@/components/places/back-button'

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
      title: 'Ort nicht gefunden | OpenSportMap',
      description: 'Der gesuchte Sportplatz konnte nicht gefunden werden.',
    }
  }

  const placeCourts = place.courts ?? []
  const availableSports = placeCourts.length > 0
    ? [...new Set(placeCourts.map(court => court.sport))]
    : (place.sports || [])

  const sportsText = availableSports.length > 0 ? availableSports.join(', ') : 'Multiple sports'

  const addressParts = [
    place.street && place.house_number ? `${place.street} ${place.house_number}` : place.street,
    place.city,
    place.state,
    place.country
  ].filter(Boolean)
  const address = addressParts.length > 0 ? addressParts.join(', ') : `${place.latitude}, ${place.longitude}`

  return {
    title: `${place.name} | OpenSportMap`,
    description: `${place.description || `Sportplatz mit ${sportsText}`}. Adresse: ${address}. Alle Infos, verfügbare Sportarten und Standort.`,
    openGraph: {
      title: `${place.name} | OpenSportMap`,
      description: `Sportplatz mit ${sportsText}. Adresse: ${address}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${place.name} | OpenSportMap`,
      description: `Sportplatz mit ${sportsText}`,
    }
  }
}

export default async function PlacePage({ params }: PlacePageProps) {
  const { id } = await params
  const [place, placeImages] = await Promise.all([
    getPlace(id),
    database.community.getPlaceImages(id) as Promise<PlaceImage[]>,
  ])

  if (!place) {
    notFound()
  }

  // Fall back to legacy image_url if no gallery images yet
  const galleryImages: PlaceImage[] =
    placeImages.length > 0
      ? placeImages
      : place.image_url
      ? [
          {
            id: 'legacy',
            place_id: place.id,
            storage_path: '',
            url: place.image_url,
            is_cover: true,
            sort_order: 0,
            uploaded_by: null,
            created_at: '',
          },
        ]
      : []

  const courts = place.courts ?? []

  const availableSports = courts.length > 0
    ? [...new Set(courts.map(court => court.sport))]
    : (place.sports || [])

  const quickAddress = [place.street, place.district || place.city].filter(Boolean).join(', ')

  // Sports with court counts
  const sportsWithCounts = courts.length > 0
    ? courts.reduce((acc, c) => {
        acc[c.sport] = (acc[c.sport] || 0) + (c.quantity || 1)
        return acc
      }, {} as Record<string, number>)
    : (place.sports?.reduce((acc, sport) => ({ ...acc, [sport]: 1 }), {} as Record<string, number>) || {})

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: place.name,
    ...(place.description && { description: place.description }),
    url: `https://opensportmap.de/places/${place.id}`,
    ...(place.image_url && { image: place.image_url }),
    address: {
      '@type': 'PostalAddress',
      ...(place.street && { streetAddress: [place.street, place.house_number].filter(Boolean).join(' ') }),
      ...(place.city && { addressLocality: place.city }),
      ...(place.postcode && { postalCode: place.postcode }),
      addressCountry: place.country ?? 'DE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: place.latitude,
      longitude: place.longitude,
    },
  }

  return (
    <div className="max-w-2xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <BackButton />
          <h1 className="text-xl font-semibold truncate">{place.name}</h1>
        </div>
        <PlaceActions place={place} />
      </div>

      {/* Content */}
      <div className="space-y-4 px-4 pb-8">

        {/* Address */}
        {quickAddress && (
          <div className="flex flex-col gap-1">
            <p className="text-base text-muted-foreground">{quickAddress}</p>
          </div>
        )}

        {/* Place type badge */}
        {place.place_type && (
          <div>
            <Badge className={`text-xs ${getPlaceTypeBadgeClasses(place.place_type)}`}>
              {placeTypeIcons[place.place_type as PlaceType] || ''} {placeTypeLabels[place.place_type as PlaceType] || place.place_type}
            </Badge>
          </div>
        )}

        {/* Image gallery */}
        <PlaceImageGallery
          images={galleryImages}
          placeId={place.id}
          placeName={place.name}
        />

        {/* Sports pills */}
        {Object.keys(sportsWithCounts).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(sportsWithCounts).map(([sport, count]) => (
              <div
                key={sport}
                className="flex items-center gap-1 border border-border rounded-full px-3 py-1.5 self-start"
              >
                <span className="text-[16px] leading-none">{sportIcons[sport] || '📍'}</span>
                <span className="text-[14px] font-medium text-muted-foreground">{sportNames[sport] || sport}</span>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {place.description && (
          <p className="text-sm text-muted-foreground">{place.description}</p>
        )}

        {/* Contact */}
        {(place.contact_phone || place.contact_email || place.contact_website) && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Kontakt</p>
            <div className="space-y-2">
              {place.contact_phone && (
                <a href={`tel:${place.contact_phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{place.contact_phone}</span>
                </a>
              )}
              {place.contact_email && (
                <a href={`mailto:${place.contact_email}`} className="flex items-center gap-2 text-sm hover:text-primary">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{place.contact_email}</span>
                </a>
              )}
              {place.contact_website && (
                <a href={place.contact_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{place.contact_website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Route button */}
        <a
          href={`https://maps.google.com/?q=${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button variant="default" className="w-full text-base">
            <Navigation className="h-4 w-4 mr-1" />
            Route
          </Button>
        </a>

        {/* Courts / facilities */}
        {courts.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Plätze & Einrichtungen</p>
            <div className="space-y-2">
              {courts.map((court) => (
                <div key={court.id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                  <div className="flex items-center gap-2">
                    <span className="text-[18px]">{court.sport === 'other' ? '🏅' : (sportIcons[court.sport] || '📍')}</span>
                    <div>
                      <p className="text-sm font-medium">{court.sport === 'other' ? ((court as any).custom_sport_name || 'Andere Sportart') : (sportNames[court.sport] || court.sport)}</p>
                      {(court.surface || court.notes) && (
                        <p className="text-xs text-muted-foreground">
                          {[court.surface, court.notes].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {(court.quantity ?? 1) > 1 && (
                    <span className="text-sm text-muted-foreground">{court.quantity}×</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        {place.features && place.features.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Ausstattung</p>
            <div className="flex flex-wrap gap-2">
              {place.features.map((feature) => (
                <Badge key={feature} variant="outline">{feature}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="pt-2">
          <p className="text-sm font-medium text-muted-foreground mb-2">Standort</p>
          <PlaceLocationMap
            latitude={place.latitude}
            longitude={place.longitude}
            placeName={place.name}
            sports={availableSports}
            height="200px"
            className="rounded-xl overflow-hidden border"
          />
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
          </p>
        </div>

      </div>
    </div>
  )
}
