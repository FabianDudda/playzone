import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

const adminSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: Request) {
  const serverClient = await createServerClient()
  const { data: { user }, error: authError } = await serverClient.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await serverClient
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.user_role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const lat = parseFloat(url.searchParams.get('lat') || '')
  const lng = parseFloat(url.searchParams.get('lng') || '')
  const radius = parseFloat(url.searchParams.get('radius') || '500')
  const excludeId = url.searchParams.get('exclude_id')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  // Bounding box approximation then exact haversine filter
  const latDelta = radius / 111000
  const lngDelta = radius / (111000 * Math.cos(lat * Math.PI / 180))

  let query = adminSupabase
    .from('places')
    .select('id, name, moderation_status, latitude, longitude, sports, courts(sport)')
    .gte('latitude', lat - latDelta)
    .lte('latitude', lat + latDelta)
    .gte('longitude', lng - lngDelta)
    .lte('longitude', lng + lngDelta)

  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const nearby = (data || [])
    .map(place => {
      const courtSports = (place.courts ?? []).map((c: { sport: string }) => c.sport)
      const sports = [...new Set([...(place.sports ?? []), ...courtSports])]
      return {
        id: place.id,
        name: place.name,
        moderation_status: place.moderation_status,
        latitude: place.latitude,
        longitude: place.longitude,
        sports,
        distance: Math.round(haversineDistance(lat, lng, place.latitude, place.longitude)),
      }
    })
    .filter(place => place.distance <= radius)
    .sort((a, b) => a.distance - b.distance)

  return NextResponse.json({ places: nearby })
}
