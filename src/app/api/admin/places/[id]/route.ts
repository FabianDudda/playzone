import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

const adminSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CourtInput {
  id?: string
  sport: string
  surface?: string | null
  quantity?: number | null
  notes?: string | null
  customSportName?: string | null
  attributes?: Record<string, boolean>
}

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

  // Update place fields
  const allowed = [
    'name', 'description', 'place_type',
    'street', 'house_number', 'city', 'postcode',
    'district', 'county', 'state', 'country',
    'latitude', 'longitude', 'sports',
    'contact_phone', 'contact_email', 'contact_website', 'opening_hours',
    'image_url',
  ] as const
  type AllowedKey = typeof allowed[number]

  const update: Partial<Record<AllowedKey, unknown>> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { error: placeError } = await adminSupabase
    .from('places')
    .update(update)
    .eq('id', id)

  if (placeError) return NextResponse.json({ error: placeError.message }, { status: 500 })

  // Handle courts if provided
  if ('courts' in body) {
    const courts: CourtInput[] = body.courts ?? []

    // Delete courts not in the new list
    const keepIds = courts.filter(c => c.id).map(c => c.id!)
    if (keepIds.length > 0) {
      const { error } = await adminSupabase
        .from('courts')
        .delete()
        .eq('place_id', id)
        .not('id', 'in', `(${keepIds.join(',')})`)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      // No existing courts to keep — delete all
      const { error } = await adminSupabase
        .from('courts')
        .delete()
        .eq('place_id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Insert new courts / update existing courts
    if (courts.length > 0) {
      const newCourts = courts.filter(c => !c.id)
      const existingCourts = courts.filter(c => c.id)

      if (newCourts.length > 0) {
        const rows = newCourts.map(c => ({
          place_id: id,
          sport: c.sport as Database['public']['Enums']['sport_type'],
          surface: c.surface ?? null,
          quantity: c.quantity ?? null,
          notes: c.notes ?? null,
          custom_sport_name: c.customSportName ?? null,
        }))
        const { data: inserted, error } = await adminSupabase.from('courts').insert(rows).select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Save per-court attributes for newly inserted courts
        const newAttrRows = (inserted ?? []).flatMap((c, idx) =>
          Object.entries(newCourts[idx]?.attributes ?? {})
            .filter(([, v]) => v)
            .map(([key]) => ({ court_id: c.id, key, value: 'true' }))
        )
        if (newAttrRows.length > 0) await adminSupabase.from('court_attributes').insert(newAttrRows)
      }

      for (const c of existingCourts) {
        const { error } = await adminSupabase
          .from('courts')
          .update({
            sport: c.sport as Database['public']['Enums']['sport_type'],
            surface: c.surface ?? null,
            quantity: c.quantity ?? null,
            notes: c.notes ?? null,
            custom_sport_name: c.customSportName ?? null,
          })
          .eq('id', c.id!)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Replace attributes for this court
        await adminSupabase.from('court_attributes').delete().eq('court_id', c.id!)
        const attrRows = Object.entries(c.attributes ?? {})
          .filter(([, v]) => v)
          .map(([key]) => ({ court_id: c.id!, key, value: 'true' }))
        if (attrRows.length > 0) await adminSupabase.from('court_attributes').insert(attrRows)
      }
    }
  }

  // Save place attributes
  if ('placeAttributes' in body) {
    const attrs: Record<string, boolean> = body.placeAttributes ?? {}
    await adminSupabase.from('place_attributes').delete().eq('place_id', id)
    const rows = Object.entries(attrs).filter(([, v]) => v).map(([key]) => ({ place_id: id, key, value: 'true' }))
    if (rows.length > 0) await adminSupabase.from('place_attributes').insert(rows)
  }

  return NextResponse.json({ success: true })
}
