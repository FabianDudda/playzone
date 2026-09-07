import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

const adminSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverClient = await createServerClient()
  const { data: { user }, error: authError } = await serverClient.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await serverClient
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.user_role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { moderation_status, rejection_reason, action } = body

  // Apply or reject a pending_changes update
  if (action === 'apply_update') {
    const { data: event } = await adminSupabase
      .from('events')
      .select('pending_changes')
      .eq('id', id)
      .single()

    if (!event?.pending_changes) {
      return NextResponse.json({ error: 'No pending changes found' }, { status: 400 })
    }

    const changes = event.pending_changes as Record<string, unknown>

    // Validate organizer_id in pending changes to avoid FK violations
    if (changes.organizer_id) {
      const { data: org } = await adminSupabase
        .from('organizers')
        .select('id')
        .eq('id', changes.organizer_id as string)
        .maybeSingle()
      if (!org) {
        changes.organizer_id = null
        changes.organizer_ids = []
      }
    }

    const { error } = await adminSupabase
      .from('events')
      .update({
        ...changes,
        pending_changes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'reject_update') {
    const { error } = await adminSupabase
      .from('events')
      .update({ pending_changes: null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Admin direct edit of event fields
  if (action === 'edit') {
    const allowedFields = [
      'title', 'description', 'sports', 'place_id', 'inline_location',
      'schedule', 'contact', 'image_url', 'location_type', 'age_restriction',
      'gender_restriction', 'organizer_id', 'organizer_ids',
    ]
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    // Validate organizer_id — stale IDs in organizer_ids[] can violate the FK
    if (updates.organizer_id) {
      const { data: org } = await adminSupabase
        .from('organizers')
        .select('id')
        .eq('id', updates.organizer_id as string)
        .maybeSingle()
      if (!org) {
        updates.organizer_id = null
        updates.organizer_ids = []
      }
    }

    const { error } = await adminSupabase.from('events').update(updates as any).eq('id', id)
    if (error) {
      console.error('[admin/events PATCH edit] supabase error:', error)
      return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  // Standard moderation (approve/reject new event)
  const { error } = await adminSupabase
    .from('events')
    .update({
      moderation_status,
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
      rejection_reason: rejection_reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverClient = await createServerClient()
  const { data: { user }, error: authError } = await serverClient.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await serverClient
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.user_role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { error } = await adminSupabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
