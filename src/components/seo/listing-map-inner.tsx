'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { createSportIcon } from '@/lib/utils/sport-styles'
import { MAP_LAYERS } from '@/lib/utils/map-layers'
import 'leaflet/dist/leaflet.css'

interface PlacePin {
  id: string
  name: string
  latitude: number
  longitude: number
  sports: string[] | null
}

interface BoundsFitterProps {
  bounds: [[number, number], [number, number]]
}

function BoundsFitter({ bounds }: BoundsFitterProps) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 })
  }, [map, bounds])
  return null
}

interface ListingMapInnerProps {
  places: PlacePin[]
}

export default function ListingMapInner({ places }: ListingMapInnerProps) {
  if (places.length === 0) return null

  const lats = places.map(p => p.latitude)
  const lngs = places.map(p => p.longitude)
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ]

  const layer = MAP_LAYERS['voyager']

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [32, 32], maxZoom: 13 }}
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
      <BoundsFitter bounds={bounds} />
      {places.map(place => {
        const sports = (place.sports ?? []).filter(s => s !== 'other')
        return (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={createSportIcon(sports, false)}
            eventHandlers={{
              click: () => {
                window.location.href = `/places/${place.id}`
              },
            }}
          />
        )
      })}
    </MapContainer>
  )
}
