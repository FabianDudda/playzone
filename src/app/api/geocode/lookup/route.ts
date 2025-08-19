import { NextResponse } from 'next/server'
import { reverseGeocode, formatAddress } from '@/lib/geocoding'

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

    console.log(`Looking up address for coordinates: ${latitude}, ${longitude}`)

    const address = await reverseGeocode(latitude, longitude, { 
      useRateLimit: true,
      timeout: 10000, // 10 second timeout for user-facing requests
      language
    })

    if (!address) {
      return NextResponse.json(
        { 
          error: 'No address information found for these coordinates',
          coordinates: { latitude, longitude }
        },
        { status: 404 }
      )
    }

    const formattedAddress = formatAddress(address)

    return NextResponse.json({
      coordinates: { latitude, longitude },
      address,
      formatted: formattedAddress,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Geocoding lookup error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Geocoding service error',
          details: error.message 
        },
        { status: 503 }
      )
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