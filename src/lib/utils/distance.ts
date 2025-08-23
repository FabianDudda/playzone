/**
 * Calculate the distance between two geographical points using the Haversine formula
 */
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371 // Earth's radius in kilometers
  
  const lat1Rad = (point1.lat * Math.PI) / 180
  const lat2Rad = (point2.lat * Math.PI) / 180
  const deltaLatRad = ((point2.lat - point1.lat) * Math.PI) / 180
  const deltaLngRad = ((point2.lng - point1.lng) * Math.PI) / 180

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c // Distance in kilometers
}

/**
 * Format distance for display with appropriate units
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000)
    return `${meters} m`
  }
  
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`
  }
  
  return `${Math.round(distanceKm)} km`
}

/**
 * Calculate and format distance between two points
 */
export function getFormattedDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): string {
  const distance = calculateDistance(point1, point2)
  return formatDistance(distance)
}

/**
 * Get distance text for display (e.g., "0.3 km away")
 */
export function getDistanceText(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): string {
  const formattedDistance = getFormattedDistance(point1, point2)
  return `${formattedDistance} away`
}