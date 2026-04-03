'use client'

import dynamic from 'next/dynamic'
import { Area, PlaceMarker } from '@/lib/supabase/types'

const WidgetMap = dynamic(() => import('./widget-map'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-muted"
      style={{ height: '100dvh' }}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
    </div>
  ),
})

export default function WidgetMapLoader({
  courts,
  area,
  siteUrl,
}: {
  courts: PlaceMarker[]
  area: Area
  siteUrl: string
}) {
  return <WidgetMap courts={courts} area={area} siteUrl={siteUrl} />
}
