import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { Database } from '@/lib/supabase/types'

const RATE_LIMIT_PER_DAY = 5

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const ip = getClientIp(req)
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Rate limit: max 5 guest event submissions per IP per 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('is_guest_submission', true)
    .eq('guest_ip', ip)
    .gte('created_at', twentyFourHoursAgo)

  if ((count || 0) >= RATE_LIMIT_PER_DAY) {
    return Response.json(
      { error: 'Zu viele Einreichungen. Versuche es morgen wieder.' },
      { status: 429 }
    )
  }

  // Validate required fields
  if (!body.title?.trim() || !body.sports?.length || (!body.place_id && !body.inline_location) || !body.schedule) {
    return Response.json({ error: 'Pflichtfelder fehlen.' }, { status: 400 })
  }

  if (body.inline_location && (!body.inline_location.name?.trim() || !body.inline_location.latitude || !body.inline_location.longitude)) {
    return Response.json({ error: 'Ortsdaten unvollständig.' }, { status: 400 })
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: body.title.trim(),
      description: body.description?.trim() || null,
      event_type: body.event_type || 'session',
      place_id: body.place_id || null,
      organizer_id: body.organizer_id || null,
      organizer_ids: Array.isArray(body.organizer_ids) ? body.organizer_ids : [],
      sports: body.sports,
      schedule: body.schedule,
      contact: body.contact || {},
      image_url: body.image_url || null,
      creator_id: null,
      status: 'active',
      moderation_status: 'pending',
      is_guest_submission: true,
      guest_ip: ip,
      inline_location: body.inline_location || null,
      location_type: body.location_type || null,
      age_restriction: body.age_restriction || null,
      gender_restriction: body.gender_restriction || null,
    })
    .select('id')
    .single()

  if (error || !event) {
    return Response.json({ error: error?.message || 'Fehler beim Erstellen des Events.' }, { status: 500 })
  }

  return Response.json({ id: event.id })
}
