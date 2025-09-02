import { NextRequest, NextResponse } from 'next/server'
import { ReverseGeocodeResponse } from '@/lib/geocoding'

/**
 * Rate limiter to ensure we don't exceed Nominatim's 1 request/second limit
 */
class RateLimiter {
  private lastRequest = 0
  private readonly minInterval = 1000 // 1 second

  async throttle(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequest = Date.now()
  }
}

const rateLimiter = new RateLimiter()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const language = searchParams.get('language') || 'de'

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat and lon' },
      { status: 400 }
    )
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lon)

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: 'Invalid coordinates: lat and lon must be numbers' },
      { status: 400 }
    )
  }

  try {
    // Apply rate limiting for Nominatim
    await rateLimiter.throttle()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'json')
    url.searchParams.set('lat', latitude.toString())
    url.searchParams.set('lon', longitude.toString())
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('accept-language', language)
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Court-Sports-App/1.0 (contact@example.com)', // Required by Nominatim
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Reverse geocoding failed: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: `Geocoding service error: ${response.status}` },
        { status: response.status }
      )
    }

    const data: ReverseGeocodeResponse = await response.json()
    
    if (!data.address) {
      return NextResponse.json(
        { error: 'No address data found for coordinates' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out' },
          { status: 408 }
        )
      } else {
        console.error('Reverse geocoding error:', error.message)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 }
    )
  }
}