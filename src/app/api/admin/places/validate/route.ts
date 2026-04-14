import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'
import {
  checkOSM,
  checkGoogle,
  computeOverallStatus,
  ValidationResult,
  ValidationCheckResult,
} from '@/lib/validation/place-validation'

const adminSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyAdmin(): Promise<NextResponse | null> {
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
  return null
}

const SKIPPED: ValidationCheckResult = { source: 'osm', status: 'unavailable', matches: [], error: 'Not run' }

async function validatePlace(
  placeId: string,
  source: 'osm' | 'google' | 'both' = 'both'
): Promise<ValidationResult> {
  const { data: place, error } = await adminSupabase
    .from('places')
    .select('id, name, latitude, longitude, sports')
    .eq('id', placeId)
    .single()

  if (error || !place) throw new Error(`Place not found: ${placeId}`)

  const declaredSports: string[] = (place.sports as string[]) || []
  const { latitude: lat, longitude: lon } = place
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY

  const skipOsm: ValidationCheckResult = { ...SKIPPED, source: 'osm' }
  const skipGoogle: ValidationCheckResult = {
    source: 'google',
    status: 'unavailable',
    matches: [],
    error: googleApiKey ? 'Not run' : 'GOOGLE_MAPS_API_KEY not configured',
  }

  const [osm, google] = await Promise.all([
    source === 'google' ? Promise.resolve(skipOsm) : checkOSM(lat, lon, declaredSports),
    source === 'osm'    ? Promise.resolve(skipGoogle)
      : googleApiKey   ? checkGoogle(lat, lon, declaredSports, googleApiKey)
      :                  Promise.resolve({ ...skipGoogle, error: 'GOOGLE_MAPS_API_KEY not configured' }),
  ])

  return {
    placeId,
    osm,
    google,
    overallStatus: computeOverallStatus(osm, google),
    checkedAt: new Date().toISOString(),
  }
}

type Source = 'osm' | 'google' | 'both'

function parseSource(raw: string | null): Source {
  if (raw === 'osm' || raw === 'google') return raw
  return 'both'
}

// GET /api/admin/places/validate?id=<placeId>&source=osm|google|both
export async function GET(request: Request) {
  const authError = await verifyAdmin()
  if (authError) return authError

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const source = parseSource(url.searchParams.get('source'))

  try {
    const result = await validatePlace(id, source)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/places/validate — validate a batch of places
// Body: { placeIds: string[], source?: 'osm' | 'google' | 'both' }  (max 50)
export async function POST(request: Request) {
  const authError = await verifyAdmin()
  if (authError) return authError

  let body: { placeIds?: unknown; source?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const placeIds = body.placeIds
  if (!Array.isArray(placeIds) || placeIds.length === 0) {
    return NextResponse.json({ error: 'placeIds array is required' }, { status: 400 })
  }
  if (placeIds.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 places per batch' }, { status: 400 })
  }

  const source = parseSource(typeof body.source === 'string' ? body.source : null)
  const results: ValidationResult[] = []
  const errors: Record<string, string> = {}

  // Process in parallel batches of 5 to avoid overloading external APIs
  const CONCURRENCY = 5
  for (let i = 0; i < placeIds.length; i += CONCURRENCY) {
    const batch = (placeIds as string[]).slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(batch.map(id => validatePlace(id, source)))
    settled.forEach((result, idx) => {
      const id = batch[idx]
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        errors[id] = result.reason instanceof Error ? result.reason.message : 'Unknown error'
      }
    })
  }

  return NextResponse.json({ results, errors })
}
