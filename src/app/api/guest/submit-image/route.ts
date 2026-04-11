import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { Database } from '@/lib/supabase/types'

const BUCKET_NAME = 'court-images'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const RATE_LIMIT = 20

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const placeId = formData.get('placeId') as string | null

  if (!file || !placeId) {
    return Response.json({ error: 'Fehlende Daten' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return Response.json({ error: 'Nur Bilddateien erlaubt' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'Datei zu groß (max. 10 MB)' }, { status: 400 })
  }

  const ip = getClientIp(req)
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Rate limit: shared pool with other guest submissions
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

  // Verify place exists
  const { data: place, error: placeError } = await supabase
    .from('places')
    .select('id')
    .eq('id', placeId)
    .single()

  if (placeError || !place) {
    return Response.json({ error: 'Ort nicht gefunden' }, { status: 404 })
  }

  // Upload to storage using service role (bypasses auth requirement)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const fileName = `${timestamp}_${random}.${ext}`
  const storagePath = `places/${placeId}/${fileName}`

  const bytes = await file.arrayBuffer()

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, bytes, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return Response.json(
      { error: 'Upload fehlgeschlagen: ' + uploadError.message },
      { status: 500 }
    )
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(uploadData.path)

  // Create pending change record
  const { data, error } = await (supabase as any)
    .from('pending_place_changes')
    .insert({
      place_id: placeId,
      submitted_by: null,
      change_type: 'image_add',
      proposed_data: { storage_path: uploadData.path, url: publicUrl },
      current_data: null,
      status: 'pending',
      is_guest_submission: true,
      guest_ip: ip,
    })
    .select()
    .single()

  if (error) {
    // Clean up orphaned storage file if DB insert fails
    await supabase.storage.from(BUCKET_NAME).remove([uploadData.path])
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ data })
}
