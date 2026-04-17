/**
 * One-time migration: copy the legacy `places.features[]` strings into
 * the new `place_attributes` table using the attribute key mapping below.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/backfill-place-attributes.ts
 *   -- or --
 *   npx tsx scripts/backfill-place-attributes.ts
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Map legacy feature strings (case-insensitive) → attribute key
const FEATURE_MAP: Record<string, string> = {
  'flutlicht':         'lighting',
  'beleuchtung':       'lighting',
  'überdacht':         'roof',
  'überdachung':       'roof',
  'toiletten':         'toilets',
  'wc':                'toilets',
  'trinkwasser':       'drinking_water',
  'wasserhahn':        'drinking_water',
}

async function main() {
  console.log('Fetching places with features...')

  let from = 0
  const batchSize = 1000
  let totalMapped = 0
  let totalSkipped = 0

  while (true) {
    const { data: places, error } = await supabase
      .from('places')
      .select('id, features')
      .not('features', 'is', null)
      .range(from, from + batchSize - 1)

    if (error) throw error
    if (!places || places.length === 0) break

    for (const place of places) {
      if (!place.features || place.features.length === 0) continue

      const rows: { place_id: string; key: string; value: string }[] = []
      const seenKeys = new Set<string>()

      for (const feature of place.features as string[]) {
        const key = FEATURE_MAP[feature.toLowerCase().trim()]
        if (key && !seenKeys.has(key)) {
          rows.push({ place_id: place.id, key, value: 'true' })
          seenKeys.add(key)
          totalMapped++
        } else {
          totalSkipped++
        }
      }

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from('place_attributes')
          .upsert(rows, { onConflict: 'place_id,key' })
        if (insertError) {
          console.error(`  Error inserting for place ${place.id}:`, insertError.message)
        }
      }
    }

    console.log(`  Processed batch ${from}–${from + places.length - 1}`)
    if (places.length < batchSize) break
    from += batchSize
  }

  console.log(`Done. Mapped: ${totalMapped}, Skipped (unknown): ${totalSkipped}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
