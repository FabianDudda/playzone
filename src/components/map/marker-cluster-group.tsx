'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { PlaceWithCourts } from '@/lib/supabase/types'
import { createSportIcon } from '@/lib/utils/sport-styles'

interface MarkerClusterGroupProps {
  courts: PlaceWithCourts[]
  onCourtSelect?: (court: PlaceWithCourts) => void
  selectedCourt?: PlaceWithCourts | null
}

// Create custom cluster icon
function createClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount()
  const markers = cluster.getAllChildMarkers()
  
  // Get all sports from courts in this cluster
  const allSports = new Set<string>()
  markers.forEach((marker: any) => {
    const court = marker.options.placeData as PlaceWithCourts
    if (court.courts && court.courts.length > 0) {
      court.courts.forEach(c => allSports.add(c.sport))
    } else if (court.sports) {
      court.sports.forEach(sport => allSports.add(sport))
    }
  })
  
  const sportsArray = Array.from(allSports)
  const displaySports = sportsArray.slice(0, 3) // Show max 3 sports
  const hasMore = sportsArray.length > 3
  
  // Determine cluster size class
  let sizeClass = 'small'
  if (count >= 100) sizeClass = 'large'
  else if (count >= 10) sizeClass = 'medium'
  
  const iconSize = sizeClass === 'large' ? 50 : sizeClass === 'medium' ? 40 : 30
  
  return L.divIcon({
    html: `
      <div class="cluster-icon cluster-${sizeClass}">
        <div class="cluster-count">${count}</div>
        <div class="cluster-sports">
          ${displaySports.map(sport => `<span class="sport-dot" title="${sport}"></span>`).join('')}
          ${hasMore ? '<span class="sport-more">+</span>' : ''}
        </div>
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: L.point(iconSize, iconSize),
    iconAnchor: L.point(iconSize / 2, iconSize / 2)
  })
}

export default function MarkerClusterGroup({ courts, onCourtSelect, selectedCourt }: MarkerClusterGroupProps) {
  const map = useMap()
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    // Initialize cluster group if not exists
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        maxClusterRadius: 50, // Cluster radius in pixels
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        removeOutsideVisibleBounds: true,
        iconCreateFunction: createClusterIcon,
        // Zoom-dependent clustering
        disableClusteringAtZoom: 14, // Stop clustering at zoom level 14
      })
      
      map.addLayer(clusterGroupRef.current)
    }

    const clusterGroup = clusterGroupRef.current

    // Clear existing markers
    clusterGroup.clearLayers()
    markersRef.current = []

    // Add new markers
    courts.forEach((court) => {
      // Get available sports for icon
      const availableSports = court.courts?.length > 0 
        ? [...new Set(court.courts.map(c => c.sport))]
        : (court.sports || [])

      const marker = L.marker([court.latitude, court.longitude], {
        icon: createSportIcon(availableSports, selectedCourt?.id === court.id),
        placeData: court, // Store court data for cluster processing
      })

      // Add popup with court info
      const popupContent = `
        <div class="place-popup">
          <h3 class="font-semibold text-sm mb-2">${court.name}</h3>
          <div class="space-y-1 text-xs">
            ${availableSports.length > 0 ? `
              <div class="flex flex-wrap gap-1 mb-2">
                ${availableSports.map(sport => `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">${sport}</span>`).join('')}
              </div>
            ` : ''}
            ${court.courts?.length ? `<p><strong>Courts:</strong> ${court.courts.length}</p>` : ''}
            ${court.description ? `<p class="text-gray-600">${court.description.substring(0, 100)}${court.description.length > 100 ? '...' : ''}</p>` : ''}
          </div>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('courtSelect', { detail: '${court.id}' }))"
            class="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
          >
            View Details
          </button>
        </div>
      `
      
      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: 'custom-popup'
      })

      // Handle marker clicks
      marker.on('click', () => {
        onCourtSelect?.(court)
      })

      clusterGroup.addLayer(marker)
      markersRef.current.push(marker)
    })

    // Cleanup function
    return () => {
      clusterGroup.clearLayers()
      markersRef.current = []
    }
  }, [courts, map, onCourtSelect, selectedCourt])

  // Handle court selection events from popups
  useEffect(() => {
    const handleCourtSelect = (event: any) => {
      const courtId = event.detail
      const court = courts.find(c => c.id === courtId)
      if (court && onCourtSelect) {
        onCourtSelect(court)
      }
    }

    window.addEventListener('courtSelect', handleCourtSelect)
    return () => window.removeEventListener('courtSelect', handleCourtSelect)
  }, [courts, onCourtSelect])

  // Log zoom level changes
  useEffect(() => {
    const handleZoomEnd = () => {
      const currentZoom = map.getZoom()
      console.log(`🗺️ Current zoom level: ${currentZoom}`)
    }

    // Log initial zoom level
    console.log(`🗺️ Initial zoom level: ${map.getZoom()}`)
    
    // Listen for zoom changes
    map.on('zoomend', handleZoomEnd)
    
    // Cleanup listener on unmount
    return () => {
      map.off('zoomend', handleZoomEnd)
    }
  }, [map])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clusterGroupRef.current && map) {
        map.removeLayer(clusterGroupRef.current)
        clusterGroupRef.current = null
      }
    }
  }, [map])

  return null // This component doesn't render anything directly
}