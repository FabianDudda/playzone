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

  // Validate required fields
  if (!body.name?.trim() || !body.sports?.length || !body.latitude || !body.longitude) {
    return Response.json({ error: 'Pflichtfelder fehlen.' }, { status: 400 })
  }

  // Insert place
  const { data: place, error: placeError } = await supabase
    .from('places')
    .insert({
      name: body.name,
      place_type: body.place_type || 'öffentlich',
      latitude: body.latitude,
      longitude: body.longitude,
      sports: body.sports,
      description: body.description || null,
      image_url: body.image_url || null,
      added_by_user: null,
      source: 'user_submitted',
      source_id: null,
      features: null,
      import_date: new Date().toISOString(),
      street: body.address?.street || null,
      house_number: body.address?.house_number || null,
      city: body.address?.city || null,
      county: body.address?.county || null,
      state: body.address?.state || null,
      country: body.address?.country || null,
      postcode: body.address?.postcode || null,
      district: body.address?.district || null,
      contact_phone: body.contact_phone || null,
      contact_email: body.contact_email || null,
      contact_website: body.contact_website || null,
      opening_hours: body.opening_hours || null,
      moderation_status: 'pending',
      is_guest_submission: true,
      guest_ip: ip,
    })
    .select()
    .single()

  if (placeError || !place) {
    return Response.json({ error: placeError?.message || 'Failed to create place' }, { status: 500 })
  }

  // Insert courts
  if (body.courts?.length > 0) {
    const { error: courtsError } = await supabase
      .from('courts')
      .insert(
        body.courts.map((court: { sport: string; quantity: number; surface: string | null; notes: string | null }) => ({
          place_id: place.id,
          sport: court.sport,
          quantity: court.quantity,
          surface: court.surface || null,
          notes: court.notes || null,
        }))
      )

    if (courtsError) {
      return Response.json({ error: courtsError.message }, { status: 500 })
    }
  }

  return Response.json({ data: place })
}
