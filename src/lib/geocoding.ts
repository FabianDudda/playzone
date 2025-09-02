export interface AddressComponents {
  street?: string
  house_number?: string
  district?: string
  city?: string
  county?: string
  state?: string
  country?: string
  postcode?: string
}

export interface ReverseGeocodeResponse {
  display_name: string
  address: {
    house_number?: string
    road?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    county?: string
    state?: string
    country?: string
    postcode?: string
  }
}

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

/**
 * Reverse geocode latitude and longitude coordinates to address information
 * Uses internal API route to proxy Nominatim (OpenStreetMap) service
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  options: {
    useRateLimit?: boolean
    timeout?: number
    language?: string
  } = {}
): Promise<AddressComponents | null> {
  const { timeout = 5000, language = 'de' } = options

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const url = new URL('/api/geocoding/reverse', window.location.origin)
    url.searchParams.set('lat', latitude.toString())
    url.searchParams.set('lon', longitude.toString())
    url.searchParams.set('language', language)
    
    const response = await fetch(url.toString(), {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Reverse geocoding failed: ${response.status} ${response.statusText}`)
      return null
    }

    const data: ReverseGeocodeResponse = await response.json()
    
    if (!data.address) {
      console.warn('No address data returned for coordinates:', latitude, longitude)
      return null
    }

    // Extract and normalize address components
    const address = data.address
    const components: AddressComponents = {
      house_number: address.house_number,
      street: address.road,
      district: address.neighbourhood || address.suburb,
      city: address.city || address.town || address.village,
      county: address.county,
      state: address.state,
      country: address.country,
      postcode: address.postcode,
    }

    return components

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Reverse geocoding request timed out')
      } else {
        console.error('Reverse geocoding error:', error.message)
      }
    } else {
      console.error('Unknown reverse geocoding error:', error)
    }
    return null
  }
}

/**
 * Batch reverse geocode multiple coordinates with proper rate limiting
 */
export async function batchReverseGeocode(
  coordinates: Array<{ id: string; latitude: number; longitude: number }>,
  options: {
    onProgress?: (completed: number, total: number) => void
    onError?: (id: string, error: string) => void
    language?: string
  } = {}
): Promise<Array<{ id: string; address: AddressComponents | null }>> {
  const results: Array<{ id: string; address: AddressComponents | null }> = []
  
  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i]
    
    try {
      const address = await reverseGeocode(coord.latitude, coord.longitude, {
        language: options.language
      })
      results.push({ id: coord.id, address })
      
      options.onProgress?.(i + 1, coordinates.length)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      options.onError?.(coord.id, errorMessage)
      results.push({ id: coord.id, address: null })
    }
  }
  
  return results
}

/**
 * Format address components into a human-readable string
 */
export function formatAddress(components: AddressComponents): string {
  const parts: string[] = []
  
  if (components.house_number && components.street) {
    parts.push(`${components.street} ${components.house_number}`)
  } else if (components.street) {
    parts.push(components.street)
  }
  
  if (components.district) {
    parts.push(components.district)
  }
  
  if (components.city) {
    parts.push(components.city)
  }
  
  if (components.country) {
    parts.push(components.country)
  }
  
  return parts.join(', ')
}

/**
 * Check if coordinates are likely to be in water (basic check)
 * More sophisticated checks would require additional APIs
 */
export function isLikelyWater(latitude: number, longitude: number): boolean {
  // Very basic check - this would need improvement for production
  // You might want to use a more sophisticated service for this
  
  // Rough check for major oceans (very basic)
  const majorOceanAreas = [
    // Atlantic Ocean (rough bounds)
    { minLat: -60, maxLat: 70, minLng: -80, maxLng: 20 },
    // Pacific Ocean (rough bounds)  
    { minLat: -60, maxLat: 70, minLng: -180, maxLng: -70 },
    { minLat: -60, maxLat: 70, minLng: 120, maxLng: 180 },
  ]
  
  return majorOceanAreas.some(area => 
    latitude >= area.minLat && latitude <= area.maxLat &&
    longitude >= area.minLng && longitude <= area.maxLng
  )
}