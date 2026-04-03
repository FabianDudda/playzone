import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Area, PlaceMarker } from '@/lib/supabase/types'
import WidgetMapLoader from '@/components/map/widget-map-loader'

interface WidgetPageProps {
  params: Promise<{ areaId: string }>
}

export default async function WidgetPage({ params }: WidgetPageProps) {
  const { areaId } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawArea } = await (supabase as any)
    .from('areas')
    .select('*')
    .eq('slug', areaId)
    .eq('is_active', true)
    .single()

  if (!rawArea) notFound()

  const area = rawArea as Area

  const { data: places } = await supabase
    .from('places')
    .select('id, name, latitude, longitude, sports, place_type')
    .eq('moderation_status', 'approved')
    .gte('latitude', area.min_lat)
    .lte('latitude', area.max_lat)
    .gte('longitude', area.min_lng)
    .lte('longitude', area.max_lng)

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://opensportmap.de'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <WidgetMapLoader
        courts={(places ?? []) as PlaceMarker[]}
        area={area}
        siteUrl={siteUrl}
      />
    </div>
  )
}
