'use client'

import dynamic from 'next/dynamic'

interface PlacePin {
  id: string
  name: string
  latitude: number
  longitude: number
  sports: string[] | null
}

const ListingMapInner = dynamic(() => import('./listing-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted rounded-xl">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
})

interface ListingMapProps {
  places: PlacePin[]
  height?: string
  className?: string
}

export default function ListingMap({
  places,
  height = '280px',
  className = '',
}: ListingMapProps) {
  if (places.length === 0) return null

  return (
    <div className={`rounded-xl overflow-hidden border ${className}`} style={{ height }}>
      <ListingMapInner places={places} />
    </div>
  )
}
