import { NextResponse } from 'next/server'
import { formatAddress, AddressComponents, ReverseGeocodeResponse } from '@/lib/geocoding'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { latitude, longitude, language = 'de' } = body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      )
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinate values' },
        { status: 400 }
      )
    }

    console.log(`🔍 Looking up address for coordinates: ${latitude}, ${longitude}`)

    // Apply rate limiting for Nominatim
    await rateLimiter.throttle()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'json')
    url.searchParams.set('lat', latitude.toString())
    url.searchParams.set('lon', longitude.toString())
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('accept-language', language)
    
    console.log(`📡 Making request to: ${url.toString()}`)

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Court-Sports-App/1.0 (contact@example.com)', // Required by Nominatim
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    console.log(`📡 Response status: ${response.status}`)

    if (!response.ok) {
      console.error(`❌ Reverse geocoding failed: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { 
          error: 'No address information found for these coordinates',
          coordinates: { latitude, longitude }
        },
        { status: 404 }
      )
    }

    const data: ReverseGeocodeResponse = await response.json()
    console.log(`📋 Raw geocoding response:`, JSON.stringify(data, null, 2))
    
    if (!data.address) {
      console.warn('⚠️ No address data returned for coordinates:', latitude, longitude)
      return NextResponse.json(
        { 
          error: 'No address information found for these coordinates',
          coordinates: { latitude, longitude }
        },
        { status: 404 }
      )
    }

    // Extract and normalize address components
    const rawAddress = data.address
    const address: AddressComponents = {
      house_number: rawAddress.house_number,
      street: rawAddress.road,
      district: rawAddress.neighbourhood || rawAddress.suburb,
      city: rawAddress.city || rawAddress.town || rawAddress.village,
      county: rawAddress.county,
      state: rawAddress.state,
      country: rawAddress.country,
      postcode: rawAddress.postcode,
    }

    console.log(`✅ Processed address:`, JSON.stringify(address, null, 2))

    const formattedAddress = formatAddress(address)

    return NextResponse.json({
      coordinates: { latitude, longitude },
      address: {
        street: address.street || null,
        house_number: address.house_number || null,
        city: address.city || null,
        district: address.district || null,
        county: address.county || null,
        state: address.state || null,
        country: address.country || null,
        postcode: address.postcode || null,
      },
      formatted: formattedAddress,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Geocoding lookup error:', error)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏰ Request timed out')
        return NextResponse.json(
          { error: 'Request timed out' },
          { status: 408 }
        )
      } else {
        console.error('🚨 Geocoding service error:', error.message)
        return NextResponse.json(
          { 
            error: 'Geocoding service error',
            details: error.message 
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'lat and lng query parameters are required' },
      { status: 400 }
    )
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: 'lat and lng must be valid numbers' },
      { status: 400 }
    )
  }

  // Forward to POST handler with the same logic
  return POST(new Request(request.url, {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
    headers: { 'Content-Type': 'application/json' }
  }))
}