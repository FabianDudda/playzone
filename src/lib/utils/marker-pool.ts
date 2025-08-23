import L from 'leaflet'
import { PlaceWithCourts, SportType } from '@/lib/supabase/types'
import { createSportIcon } from './sport-styles'

export interface PooledMarker extends L.Marker {
  placeData?: PlaceWithCourts
  isActive: boolean
  lastSports: string[]
  lastSelected: boolean
}

/**
 * Marker Pool Manager
 * Reuses marker instances instead of creating/destroying them
 * Significant performance improvement for dynamic map updates
 */
export class MarkerPool {
  private pool: PooledMarker[] = []
  private activeMarkers: PooledMarker[] = []
  private map: L.Map | null = null
  private clusterGroup: L.MarkerClusterGroup | null = null

  constructor(map?: L.Map, clusterGroup?: L.MarkerClusterGroup) {
    this.map = map || null
    this.clusterGroup = clusterGroup || null
  }

  setMap(map: L.Map) {
    this.map = map
  }

  setClusterGroup(clusterGroup: L.MarkerClusterGroup) {
    this.clusterGroup = clusterGroup
  }

  /**
   * Get a marker from the pool or create a new one
   */
  private getMarker(): PooledMarker {
    // Try to find an inactive marker in the pool
    const reusableMarker = this.pool.find(marker => !marker.isActive)
    
    if (reusableMarker) {
      reusableMarker.isActive = true
      return reusableMarker
    }

    // Create new marker if pool is empty or all markers are active
    const newMarker = L.marker([0, 0]) as PooledMarker
    newMarker.isActive = true
    newMarker.lastSports = []
    newMarker.lastSelected = false
    
    this.pool.push(newMarker)
    return newMarker
  }

  /**
   * Configure marker for a specific court with optimized icon updates
   */
  private configureMarker(
    marker: PooledMarker, 
    court: PlaceWithCourts,
    sportsForIcon: string[],
    isSelected: boolean,
    onCourtSelect?: (court: PlaceWithCourts) => void
  ): void {
    // Update position
    marker.setLatLng([court.latitude, court.longitude])
    
    // Store court data
    marker.placeData = court
    
    // Only update icon if sports or selection state changed
    const sportsChanged = JSON.stringify(marker.lastSports) !== JSON.stringify(sportsForIcon)
    const selectionChanged = marker.lastSelected !== isSelected
    
    if (sportsChanged || selectionChanged) {
      marker.setIcon(createSportIcon(sportsForIcon, isSelected))
      marker.lastSports = [...sportsForIcon]
      marker.lastSelected = isSelected
    }

    // Remove old event listeners to prevent memory leaks
    marker.off('click')
    
    // Add click handler
    if (onCourtSelect) {
      marker.on('click', () => {
        onCourtSelect(court)
      })
    }
  }

  /**
   * Update markers for given courts with optimized filtering and cluster support
   */
  updateMarkers(
    courts: PlaceWithCourts[],
    selectedSport: SportType | 'all' = 'all',
    selectedCourt?: PlaceWithCourts | null,
    onCourtSelect?: (court: PlaceWithCourts) => void
  ): PooledMarker[] {
    // Deactivate all currently active markers first
    this.activeMarkers.forEach(marker => {
      marker.isActive = false
      this.removeMarkerFromLayers(marker)
    })
    this.activeMarkers = []

    // Configure markers for current courts
    courts.forEach(court => {
      // Get available sports for icon
      const availableSports = court.courts?.length > 0 
        ? [...new Set(court.courts.map(c => c.sport))]
        : (court.sports || [])
      
      // Filter sports for icon display based on selected sport filter
      const sportsForIcon = selectedSport === 'all' 
        ? availableSports
        : availableSports.includes(selectedSport) 
          ? [selectedSport]
          : availableSports

      const isSelected = selectedCourt?.id === court.id
      const marker = this.getMarker()
      
      this.configureMarker(marker, court, sportsForIcon, isSelected, onCourtSelect)
      this.addMarkerToLayers(marker)
      
      this.activeMarkers.push(marker)
    })

    return this.activeMarkers
  }

  /**
   * Add marker to appropriate layer (cluster or map)
   */
  private addMarkerToLayers(marker: PooledMarker): void {
    if (this.clusterGroup) {
      if (!this.clusterGroup.hasLayer(marker)) {
        this.clusterGroup.addLayer(marker)
      }
    } else if (this.map) {
      if (!this.map.hasLayer(marker)) {
        this.map.addLayer(marker)
      }
    }
  }

  /**
   * Remove marker from appropriate layer (cluster or map)
   */
  private removeMarkerFromLayers(marker: PooledMarker): void {
    if (this.clusterGroup && this.clusterGroup.hasLayer(marker)) {
      this.clusterGroup.removeLayer(marker)
    } else if (this.map && this.map.hasLayer(marker)) {
      this.map.removeLayer(marker)
    }
  }

  /**
   * Apply visibility-based filtering without recreating markers
   */
  applyFilter(
    selectedSport: SportType | 'all',
    searchQuery: string = ''
  ): void {
    this.activeMarkers.forEach(marker => {
      const court = marker.placeData
      if (!court) return

      // Check sport filter
      const matchesSport = selectedSport === 'all' || 
        (court.courts?.some(c => c.sport === selectedSport)) ||
        (court.sports?.includes(selectedSport))

      // Check search filter  
      const matchesSearch = !searchQuery || 
        court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        court.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const shouldShow = matchesSport && matchesSearch

      // Show/hide marker based on filter using cluster-aware methods
      const isInLayer = this.clusterGroup ? 
        this.clusterGroup.hasLayer(marker) : 
        (this.map ? this.map.hasLayer(marker) : false)

      if (shouldShow && !isInLayer) {
        this.addMarkerToLayers(marker)
      } else if (!shouldShow && isInLayer) {
        this.removeMarkerFromLayers(marker)
      }
    })
  }

  /**
   * Get currently active markers
   */
  getActiveMarkers(): PooledMarker[] {
    return this.activeMarkers.filter(marker => marker.isActive)
  }

  /**
   * Clean up all markers and clear the pool
   */
  cleanup(): void {
    this.pool.forEach(marker => {
      marker.off() // Remove all event listeners
      this.removeMarkerFromLayers(marker)
    })
    
    this.pool = []
    this.activeMarkers = []
  }

  /**
   * Get pool statistics for debugging/monitoring
   */
  getStats(): { total: number; active: number; available: number } {
    return {
      total: this.pool.length,
      active: this.activeMarkers.length,
      available: this.pool.length - this.activeMarkers.length
    }
  }

  /**
   * Apply viewport-based rendering optimization
   * Only show markers within current map bounds plus a buffer
   */
  applyViewportFilter(bufferRatio: number = 0.2): void {
    if (!this.map) return

    const bounds = this.map.getBounds()
    
    // Add buffer around viewport for smooth scrolling
    const latRange = bounds.getNorth() - bounds.getSouth()
    const lngRange = bounds.getEast() - bounds.getWest()
    
    const bufferedBounds = L.latLngBounds([
      [bounds.getSouth() - latRange * bufferRatio, bounds.getWest() - lngRange * bufferRatio],
      [bounds.getNorth() + latRange * bufferRatio, bounds.getEast() + lngRange * bufferRatio]
    ])

    this.activeMarkers.forEach(marker => {
      const court = marker.placeData
      if (!court) return

      const markerLatLng = L.latLng(court.latitude, court.longitude)
      const shouldShow = bufferedBounds.contains(markerLatLng)

      const isInLayer = this.clusterGroup ? 
        this.clusterGroup.hasLayer(marker) : 
        (this.map ? this.map.hasLayer(marker) : false)

      if (shouldShow && !isInLayer) {
        this.addMarkerToLayers(marker)
      } else if (!shouldShow && isInLayer) {
        this.removeMarkerFromLayers(marker)
      }
    })
  }

  /**
   * Optimize pool size by removing excess inactive markers
   */
  optimizePool(maxSize: number = 100): void {
    const inactiveMarkers = this.pool.filter(marker => !marker.isActive)
    
    if (inactiveMarkers.length > maxSize) {
      const excessMarkers = inactiveMarkers.slice(maxSize)
      
      // Clean up excess markers
      excessMarkers.forEach(marker => {
        marker.off()
        this.removeMarkerFromLayers(marker)
      })
      
      // Remove from pool
      this.pool = this.pool.filter(marker => 
        marker.isActive || inactiveMarkers.slice(0, maxSize).includes(marker)
      )
    }
  }
}

// Global marker pool instance for reuse across components
export const globalMarkerPool = new MarkerPool()