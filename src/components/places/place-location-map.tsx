'use client'

import dynamic from 'next/dynamic'
import { SportType } from '@/lib/supabase/types'

// Dynamic import to prevent SSR issues with Leaflet
const SimpleLocationMap = dynamic(() => import('@/components/events/simple-location-map'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-b-lg flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm">Loading map...</p>
      </div>
    </div>
  )
})

interface PlaceLocationMapProps {
  latitude: number
  longitude: number
  placeName: string
  sports: SportType[]
  height?: string
  className?: string
}

export default function PlaceLocationMap({
  latitude,
  longitude,
  placeName,
  sports,
  height = '256px',
  className = ''
}: PlaceLocationMapProps) {
  return (
    <SimpleLocationMap
      latitude={latitude}
      longitude={longitude}
      placeName={placeName}
      sports={sports}
      height={height}
      className={className}
    />
  )
}