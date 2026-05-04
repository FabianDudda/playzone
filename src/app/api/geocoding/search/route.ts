import { NextRequest, NextResponse } from 'next/server'
import { GeocodingResult } from '@/lib/supabase/types'

class RateLimiter {
  private lastRequest = 0
  private readonly minInterval = 1000

  async throttle(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest))
    }
    this.lastRequest = Date.now()
  }
}

const rateLimiter = new RateLimiter()

function zoomFromPlaceRank(rank: number): number {
  if (rank <= 12) return 11
  if (rank <= 16) return 12
  if (rank <= 22) return 14
  if (rank <= 26) return 16
  return 17
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'q must be at least 2 characters' }, { status: 400 })
  }

  try {
    await rateLimiter.throttle()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'json')
    url.searchParams.set('q', q)
    url.searchParams.set('countrycodes', 'de')
    url.searchParams.set('limit', '5')
    url.searchParams.set('addressdetails', '0')
    url.searchParams.set('accept-language', 'de')

    const contact = process.env.NOMINATIM_CONTACT ?? 'court-sports-app'
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': `Court-Sports-App/1.0 (${contact})`,
        'Referer': contact,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({ error: `Geocoding service error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json() as Array<{
      osm_id: number
      display_name: string
      lat: string
      lon: string
      place_rank: number
    }>

    const results: GeocodingResult[] = (data || []).map(item => {
      const parts = item.display_name.split(',').map(s => s.trim())
      return {
        id: String(item.osm_id),
        shortName: parts[0] ?? item.display_name,
        subtitle: parts.slice(1, 3).join(', '),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        zoom: zoomFromPlaceRank(item.place_rank),
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 408 })
    }
    console.error('Geocoding search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
