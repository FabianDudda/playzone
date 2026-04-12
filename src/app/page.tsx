import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { sportNames } from '@/lib/utils/sport-utils'
import MapPageClient from './map-page-client'
import { Area } from '@/lib/supabase/types'

interface PageProps {
  searchParams: Promise<{ place?: string; area?: string; bbox?: string }>
}

async function getPlaceForSeo(placeId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select(`
      id, name, description, latitude, longitude,
      street, house_number, city, postcode, state, country,
      image_url, updated_at,
      courts (sport)
    `)
    .eq('id', placeId)
    .eq('moderation_status', 'approved')
    .single()
  return data
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { place: placeId } = await searchParams

  if (!placeId) return {}

  const place = await getPlaceForSeo(placeId)
  if (!place) return {}

  const sports = [...new Set((place.courts as { sport: string }[] ?? []).map(c => c.sport))]
  const sportsText = sports.map(s => sportNames[s] ?? s).join(', ')

  const addressParts = [
    place.street && place.house_number ? `${place.street} ${place.house_number}` : place.street,
    place.city,
    place.state,
    place.country,
  ].filter(Boolean)
  const address = addressParts.length > 0 ? addressParts.join(', ') : `${place.latitude}, ${place.longitude}`

  const description = place.description
    ? `${place.description}. Adresse: ${address}.`
    : `Sportplatz${sportsText ? ` mit ${sportsText}` : ''}. Adresse: ${address}.`

  return {
    title: `${place.name} | OpenSportMap`,
    description,
    openGraph: {
      title: `${place.name} | OpenSportMap`,
      description: `Sportplatz${sportsText ? ` mit ${sportsText}` : ''}. ${address}`,
      ...(place.image_url && { images: [place.image_url] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${place.name} | OpenSportMap`,
      description: `Sportplatz${sportsText ? ` mit ${sportsText}` : ''}`,
    },
  }
}

async function getAreaBySlug(slug: string): Promise<Area | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('areas')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data ?? null
}

function parseBbox(bbox: string): Area | null {
  const parts = bbox.split(',').map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) return null
  const [min_lat, min_lng, max_lat, max_lng] = parts
  return {
    id: 'bbox',
    slug: 'bbox',
    name: '',
    description: null,
    min_lat, min_lng, max_lat, max_lng,
    is_active: true,
    created_at: '',
  }
}

export default async function CourtsPage({ searchParams }: PageProps) {
  const { place: placeId, area: areaSlug, bbox } = await searchParams

  const area = areaSlug ? await getAreaBySlug(areaSlug) : bbox ? parseBbox(bbox) : null

  let jsonLd: object | null = null

  if (placeId) {
    const place = await getPlaceForSeo(placeId)
    if (place) {
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsActivityLocation',
        name: place.name,
        ...(place.description && { description: place.description }),
        url: `https://opensportmap.de/?place=${place.id}`,
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
    }
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <MapPageClient initialArea={area} />
    </>
  )
}
