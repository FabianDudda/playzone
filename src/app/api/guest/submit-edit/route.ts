import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { Database } from '@/lib/supabase/types'

const RATE_LIMIT = 20

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Honeypot check
  if (body.website) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const ip = getClientIp(req)
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Rate limit: max 3 combined guest submissions (new + edits) per IP per 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ count: placesCount }, { count: editsCount }] = await Promise.all([
    supabase
      .from('places')
      .select('*', { count: 'exact', head: true })
      .eq('is_guest_submission', true)
      .eq('guest_ip', ip)
      .gte('created_at', twentyFourHoursAgo),
    supabase
      .from('pending_place_changes')
      .select('*', { count: 'exact', head: true })
      .eq('is_guest_submission', true)
      .eq('guest_ip', ip)
      .gte('created_at', twentyFourHoursAgo),
  ])

  if (((placesCount || 0) + (editsCount || 0)) >= RATE_LIMIT) {
    return Response.json(
      { error: 'Zu viele Einreichungen. Versuche es morgen wieder.' },
      { status: 429 }
    )
  }

  const { placeId, placeData, courts, placeAttributes } = body

  if (!placeId) {
    return Response.json({ error: 'Ort nicht gefunden.' }, { status: 400 })
  }

  // Fetch current place for comparison
  const { data: currentPlace, error: fetchError } = await supabase
    .from('places')
    .select('*, courts (*)')
    .eq('id', placeId)
    .single()

  if (fetchError || !currentPlace) {
    return Response.json({ error: 'Ort nicht gefunden.' }, { status: 404 })
  }

  // Snapshot current place attributes for the diff
  const { data: currentPlaceAttrRows } = await supabase
    .from('place_attributes')
    .select('key, value')
    .eq('place_id', placeId)

  const currentCourtIds = (currentPlace.courts ?? []).map((c: any) => c.id)
  const { data: currentCourtAttrRows } = currentCourtIds.length > 0
    ? await supabase.from('court_attributes').select('court_id, key, value').in('court_id', currentCourtIds)
    : { data: [] }

  const currentPlaceAttrs = Object.fromEntries(
    (currentPlaceAttrRows ?? []).filter((r: any) => r.value === 'true').map((r: any) => [r.key, true])
  )
  const currentCourtAttrsById: Record<string, Record<string, boolean>> = {}
  for (const court of currentPlace.courts ?? []) {
    const keys = (currentCourtAttrRows ?? [])
      .filter((r: any) => r.court_id === court.id && r.value === 'true')
      .map((r: any) => r.key)
    if (keys.length > 0) {
      const attrMap: Record<string, boolean> = {}
      for (const k of keys) attrMap[k] = true
      currentCourtAttrsById[court.id] = attrMap
    }
  }

  // Create pending change record (courts include embedded attributes)
  const { data, error } = await supabase
    .from('pending_place_changes')
    .insert({
      place_id: placeId,
      submitted_by: null,
      change_type: 'update',
      proposed_data: {
        place: placeData,
        courts,
        place_attributes: placeAttributes ?? {},
      },
      current_data: {
        place: currentPlace,
        courts: currentPlace.courts,
        place_attributes: currentPlaceAttrs,
        court_attrs_by_id: currentCourtAttrsById,
      },
      status: 'pending',
      is_guest_submission: true,
      guest_ip: ip,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ data })
}
