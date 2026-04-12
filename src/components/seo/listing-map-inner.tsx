'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { MAP_LAYERS } from '@/lib/utils/map-layers'
import MarkerClusterGroup from '@/components/map/marker-cluster-group'
import 'leaflet/dist/leaflet.css'
import '@/components/map/cluster-styles.css'

interface PlacePin {
  id: string
  name: string
  latitude: number
  longitude: number
  sports: string[] | null
}

interface CenterSetterProps {
  center: [number, number]
}

function CenterSetter({ center }: CenterSetterProps) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 14)
  }, [map, center])
  return null
}

interface ListingMapInnerProps {
  places: PlacePin[]
  center?: { lat: number; lng: number }
}

export default function ListingMapInner({ places, center }: ListingMapInnerProps) {
  if (places.length === 0) return null

  const lats = places.map(p => p.latitude)
  const lngs = places.map(p => p.longitude)

  const fallbackLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const fallbackLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const mapCenter: [number, number] = center ? [center.lat, center.lng] : [fallbackLat, fallbackLng]

  const layer = MAP_LAYERS['voyager']

  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        attribution={layer.attribution}
        url={layer.url}
        maxZoom={layer.maxZoom}
        subdomains={layer.subdomains ?? []}
      />
      <CenterSetter center={mapCenter} />
      <MarkerClusterGroup
        courts={places}
        onCourtSelect={(place) => { window.location.href = `/places/${place.id}` }}
      />
    </MapContainer>
  )
}
