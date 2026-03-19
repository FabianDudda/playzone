'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { PlaceMarker, SportType } from '@/lib/supabase/types'
import { createSportIcon } from '@/lib/utils/sport-styles'
import { PlaceType } from '@/lib/utils/sport-utils'

interface MarkerClusterGroupProps {
  courts: PlaceMarker[]
  onCourtSelect?: (court: PlaceMarker) => void
  selectedCourt?: PlaceMarker | null
  selectedSports?: SportType[]
  selectedPlaceType?: PlaceType | null
}

function isMarkerVisible(court: PlaceMarker, selectedSports: SportType[], selectedPlaceType: PlaceType | null | undefined): boolean {
  if (selectedSports.length > 0 && !selectedSports.some(s => court.sports?.includes(s))) return false
  if (selectedPlaceType != null && (court.place_type || 'öffentlich') !== selectedPlaceType) return false
  return true
}

// Create custom cluster icon
function createClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount()
  
  // Determine cluster size class
  let sizeClass = 'small'
  if (count >= 100) sizeClass = 'large'
  else if (count >= 10) sizeClass = 'medium'
  
  const iconSize = sizeClass === 'large' ? 50 : sizeClass === 'medium' ? 40 : 30
  
  return L.divIcon({
    html: `
      <div class="cluster-icon cluster-${sizeClass}">
        <div class="cluster-count">${count}</div>
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: L.point(iconSize, iconSize),
    iconAnchor: L.point(iconSize / 2, iconSize / 2)
  })
}

export default function MarkerClusterGroup({ courts, onCourtSelect, selectedCourt, selectedSports = [], selectedPlaceType = null }: MarkerClusterGroupProps) {
  const map = useMap()
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
  // Stable maps: id → marker / court — rebuilt only when underlying data changes
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map())
  const courtMapRef = useRef<Map<string, PlaceMarker>>(new Map())
  const onCourtSelectRef = useRef(onCourtSelect)
  const selectedSportsRef = useRef(selectedSports)
  const selectedPlaceTypeRef = useRef(selectedPlaceType)

  useEffect(() => { onCourtSelectRef.current = onCourtSelect }, [onCourtSelect])
  useEffect(() => { selectedSportsRef.current = selectedSports }, [selectedSports])
  useEffect(() => { selectedPlaceTypeRef.current = selectedPlaceType }, [selectedPlaceType])

  // Incrementally add new markers when courts array grows — avoids full cluster rebuild on each batch
  useEffect(() => {
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        maxClusterRadius: 100,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        removeOutsideVisibleBounds: true,
        iconCreateFunction: createClusterIcon,
        disableClusteringAtZoom: 15,
      })
      map.addLayer(clusterGroupRef.current)
    }

    const clusterGroup = clusterGroupRef.current
    const toAdd: L.Marker[] = []

    courts.forEach((court) => {
      // Skip courts that are already tracked
      if (markerMapRef.current.has(court.id)) return

      const availableSports = court.sports || []
      const marker = L.marker([court.latitude, court.longitude], {
        icon: createSportIcon(availableSports, false),
      } as any)
      ;(marker as any).options.placeData = court
      marker.on('click', (e) => {
        e.originalEvent.stopPropagation()
        onCourtSelectRef.current?.(court)
      })

      markerMapRef.current.set(court.id, marker)
      courtMapRef.current.set(court.id, court)

      if (isMarkerVisible(court, selectedSportsRef.current, selectedPlaceTypeRef.current)) {
        toAdd.push(marker)
      }
    })

    if (toAdd.length > 0) {
      clusterGroup.addLayers(toAdd)
    }
  }, [courts, map])

  // Cheap show/hide + icon update when filters change — no marker rebuild
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current
    if (!clusterGroup) return

    markerMapRef.current.forEach((marker, id) => {
      const court = courtMapRef.current.get(id)
      if (!court) return

      const visible = isMarkerVisible(court, selectedSports, selectedPlaceType)
      const inGroup = clusterGroup.hasLayer(marker)

      if (visible && !inGroup) {
        clusterGroup.addLayer(marker)
      } else if (!visible && inGroup) {
        clusterGroup.removeLayer(marker)
      }

      // Also update icon for sport highlight
      if (visible) {
        const availableSports = court.sports || []
        const matchingSports = availableSports.filter(s => selectedSports.includes(s))
        const sportsForIcon = selectedSports.length === 0 ? availableSports : matchingSports.length > 0 ? matchingSports : availableSports
        marker.setIcon(createSportIcon(sportsForIcon, false))
      }
    })
  }, [selectedSports, selectedPlaceType])

  // Handle court selection events from popups
  useEffect(() => {
    const handleCourtSelect = (event: any) => {
      const courtId = event.detail
      const court = courtMapRef.current.get(courtId)
      if (court) onCourtSelectRef.current?.(court)
    }

    window.addEventListener('courtSelect', handleCourtSelect)
    return () => window.removeEventListener('courtSelect', handleCourtSelect)
  }, [])

  // Log zoom level changes
  useEffect(() => {
    const handleZoomEnd = () => {
      const currentZoom = map.getZoom()
      // console.log(`🗺️ Current zoom level: ${currentZoom}`)
    }

    // Log initial zoom level
    // console.log(`🗺️ Initial zoom level: ${map.getZoom()}`)
    
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
        markerMapRef.current.clear()
        courtMapRef.current.clear()
      }
    }
  }, [map])

  return null // This component doesn't render anything directly
}