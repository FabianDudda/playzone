'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { PlaceMarker, SportType } from '@/lib/supabase/types'
import { createSportIcon, createEventOnlyIcon } from '@/lib/utils/sport-styles'
import { PlaceType } from '@/lib/utils/sport-utils'

interface MarkerClusterGroupProps {
  courts: PlaceMarker[]
  onCourtSelect?: (court: PlaceMarker) => void
  selectedCourt?: PlaceMarker | null
  selectedSports?: SportType[]
  selectedPlaceType?: PlaceType[]
  placeIdsWithEvents?: Set<string>
  showOrte?: boolean
  showEvents?: boolean
  themeKey?: string
}

function getPlaceIcon(court: PlaceMarker, sports: string[], isSelected: boolean, hasEvents: boolean, isDark = false): L.DivIcon {
  if (court.is_event_only) {
    return createEventOnlyIcon(sports, isSelected, isDark)
  }
  return createSportIcon(sports, isSelected, hasEvents, isDark)
}

function isMarkerVisible(court: PlaceMarker, selectedSports: SportType[], selectedPlaceType: PlaceType[] | undefined, showOrte = true, showEvents = true, placeIdsWithEvents = new Set<string>()): boolean {
  if (court.is_event_only && !showEvents) return false
  if (!court.is_event_only && !showOrte && !(showEvents && placeIdsWithEvents.has(court.id))) return false
  if (selectedSports.length > 0 && !selectedSports.some(s => court.sports?.includes(s))) return false
  if (!court.is_event_only && selectedPlaceType && selectedPlaceType.length > 0 && !selectedPlaceType.includes((court.place_type || 'öffentlich') as PlaceType)) return false
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

export default function MarkerClusterGroup({ courts, onCourtSelect, selectedCourt, selectedSports = [], selectedPlaceType = [], placeIdsWithEvents = new Set(), showOrte = true, showEvents = true, themeKey = 'light' }: MarkerClusterGroupProps) {
  const map = useMap()
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
  // Stable maps: id → marker / court — rebuilt only when underlying data changes
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map())
  const courtMapRef = useRef<Map<string, PlaceMarker>>(new Map())
  const onCourtSelectRef = useRef(onCourtSelect)
  const selectedSportsRef = useRef(selectedSports)
  const selectedPlaceTypeRef = useRef(selectedPlaceType)
  const placeIdsWithEventsRef = useRef(placeIdsWithEvents)
  const showOrteRef = useRef(showOrte)
  const showEventsRef = useRef(showEvents)
  const themeKeyRef = useRef(themeKey)
  const prevSelectedIdRef = useRef<string | null>(null)

  useEffect(() => { onCourtSelectRef.current = onCourtSelect }, [onCourtSelect])
  useEffect(() => { selectedSportsRef.current = selectedSports }, [selectedSports])
  useEffect(() => { selectedPlaceTypeRef.current = selectedPlaceType }, [selectedPlaceType])
  useEffect(() => { placeIdsWithEventsRef.current = placeIdsWithEvents }, [placeIdsWithEvents])
  useEffect(() => { showOrteRef.current = showOrte }, [showOrte])
  useEffect(() => { showEventsRef.current = showEvents }, [showEvents])
  useEffect(() => { themeKeyRef.current = themeKey }, [themeKey])

  // Incrementally add new markers when courts array grows — avoids full cluster rebuild on each batch
  useEffect(() => {
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        maxClusterRadius: 100,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: false,
        removeOutsideVisibleBounds: true,
        iconCreateFunction: createClusterIcon,
        disableClusteringAtZoom: 13,
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
        icon: getPlaceIcon(court, availableSports, false, placeIdsWithEventsRef.current.has(court.id), themeKeyRef.current === 'dark'),
        zIndexOffset: availableSports.length > 1 ? 1000 : availableSports.length === 1 && availableSports[0] === 'tischtennis' ? -1000 : 0,
      } as any)
      ;(marker as any).options.placeData = court
      marker.on('click', (e) => {
        e.originalEvent.stopPropagation()
        onCourtSelectRef.current?.(court)
      })

      markerMapRef.current.set(court.id, marker)
      courtMapRef.current.set(court.id, court)

      if (isMarkerVisible(court, selectedSportsRef.current, selectedPlaceTypeRef.current, showOrteRef.current, showEventsRef.current, placeIdsWithEventsRef.current)) {
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

    const toAdd: L.Marker[] = []
    const toRemove: L.Marker[] = []

    markerMapRef.current.forEach((marker, id) => {
      const court = courtMapRef.current.get(id)
      if (!court) return

      const visible = isMarkerVisible(court, selectedSports, selectedPlaceType, showOrte, showEvents, placeIdsWithEvents)
      const isSelected = id === selectedCourt?.id
      const shouldBeVisible = visible || isSelected
      const inGroup = clusterGroup.hasLayer(marker)

      if (shouldBeVisible && !inGroup) {
        toAdd.push(marker)
      } else if (!shouldBeVisible && inGroup) {
        toRemove.push(marker)
      }

      // Also update icon for sport highlight
      if (shouldBeVisible) {
        const availableSports = court.sports || []
        const matchingSports = availableSports.filter(s => selectedSports.includes(s))
        const sportsForIcon = selectedSports.length === 0 ? availableSports : matchingSports.length > 0 ? matchingSports : availableSports
        marker.setIcon(getPlaceIcon(court, sportsForIcon, isSelected, placeIdsWithEventsRef.current.has(court.id), themeKey === 'dark'))
      }
    })

    if (toRemove.length > 0) clusterGroup.removeLayers(toRemove)
    if (toAdd.length > 0) clusterGroup.addLayers(toAdd)
  }, [selectedSports, selectedPlaceType, showOrte, showEvents, selectedCourt, themeKey])

  // Update active marker icon on selection change
  useEffect(() => {
    const getSportsForIcon = (court: PlaceMarker) => {
      const sports = court.sports || []
      const matching = sports.filter(s => selectedSportsRef.current.includes(s))
      return selectedSportsRef.current.length === 0 || matching.length === 0 ? sports : matching
    }

    // Deselect previous
    if (prevSelectedIdRef.current) {
      const prevMarker = markerMapRef.current.get(prevSelectedIdRef.current)
      const prevCourt = courtMapRef.current.get(prevSelectedIdRef.current)
      if (prevMarker && prevCourt) {
        prevMarker.setIcon(getPlaceIcon(prevCourt, getSportsForIcon(prevCourt), false, placeIdsWithEventsRef.current.has(prevSelectedIdRef.current), themeKeyRef.current === 'dark'))
      }
    }

    // Select new
    if (selectedCourt) {
      const marker = markerMapRef.current.get(selectedCourt.id)
      const court = courtMapRef.current.get(selectedCourt.id)
      if (marker && court) {
        marker.setIcon(getPlaceIcon(court, getSportsForIcon(court), true, placeIdsWithEventsRef.current.has(selectedCourt.id), themeKeyRef.current === 'dark'))
      }
    }

    prevSelectedIdRef.current = selectedCourt?.id ?? null
  }, [selectedCourt])

  // Update icons when placeIdsWithEvents loads (async after initial render)
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current
    if (!clusterGroup || placeIdsWithEvents.size === 0) return

    markerMapRef.current.forEach((marker, id) => {
      const court = courtMapRef.current.get(id)
      if (!court || !isMarkerVisible(court, selectedSportsRef.current, selectedPlaceTypeRef.current)) return
      const availableSports = court.sports || []
      const matchingSports = availableSports.filter(s => selectedSportsRef.current.includes(s))
      const sportsForIcon = selectedSportsRef.current.length === 0 ? availableSports : matchingSports.length > 0 ? matchingSports : availableSports
      const isSelected = prevSelectedIdRef.current === id
      marker.setIcon(getPlaceIcon(court, sportsForIcon, isSelected, placeIdsWithEvents.has(id), themeKeyRef.current === 'dark'))
    })
  }, [placeIdsWithEvents])

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