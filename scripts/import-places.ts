#!/usr/bin/env tsx

// Load environment variables from .env.local
import { config } from 'dotenv'
import { join, basename } from 'path'
config({ path: join(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { Database } from '../src/lib/supabase/types'

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

// Create Supabase client with service role key for admin operations
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Types for the JSON data
interface JsonPlace {
  street?: string
  name: string
  district?: string
  place_type?: 'öffentlich' | 'verein' | 'schule'
  image_url?: string | null
  fußballplätze?: number | null
  platzbelag_fußball?: string | null
  basketballplätze?: number | null
  platzbelag_basketball?: string | null
  beachvolleyballplätze?: number | null
  platzbelag_beachvolleyball?: string | null
  bouleplätze?: number | null
  platzbelag_boule?: string | null
  skatepark?: number | null
  platzbelag_skatepark?: string | null
  tischtennisplatten?: number | null
  platzbelag_tischtennis?: string | null
  tennisplätze?: number | null
  platzbelag_tennis?: string | null
  hockeyplätze?: number | null
  platzbelag_hockey?: string | null
  volleyballplätze?: number | null
  platzbelag_volleyball?: string | null
  klettern?: number | null
  calisthenics?: number | null
  platzbelag_calisthenics?: string | null
  laufbahnen?: number | null
  padelplätze?: number | null
  platzbelag_padel?: string | null
  badmintonplätze?: number | null
  platzbelag_badminton?: string | null
  schwimmplätze?: number | null
  schachfelder?: number | null
  geometry: {
    x: number // longitude
    y: number // latitude
  }
}

type JsonData = JsonPlace[]

// System user ID for data attribution
const SYSTEM_USER_ID = 'eb32b670-8359-4683-ae9b-20834d193391'

function transformJsonPlace(jsonPlace: JsonPlace, sourceFilename: string) {
  const { geometry } = jsonPlace
  
  // Extract available sports and their details
  const courts: Array<{
    sport: string
    quantity: number
    surface?: string
  }> = []
  
  // Map each sport field to court data
  if (jsonPlace.fußballplätze && jsonPlace.fußballplätze > 0) {
    courts.push({ sport: 'fußball', quantity: jsonPlace.fußballplätze, surface: jsonPlace.platzbelag_fußball || undefined })
  }

  if (jsonPlace.basketballplätze && jsonPlace.basketballplätze > 0) {
    courts.push({ sport: 'basketball', quantity: jsonPlace.basketballplätze, surface: jsonPlace.platzbelag_basketball || undefined })
  }

  if (jsonPlace.beachvolleyballplätze && jsonPlace.beachvolleyballplätze > 0) {
    courts.push({ sport: 'beachvolleyball', quantity: jsonPlace.beachvolleyballplätze, surface: jsonPlace.platzbelag_beachvolleyball || undefined })
  }

  if (jsonPlace.bouleplätze && jsonPlace.bouleplätze > 0) {
    courts.push({ sport: 'boule', quantity: jsonPlace.bouleplätze, surface: jsonPlace.platzbelag_boule || undefined })
  }

  if (jsonPlace.skatepark && jsonPlace.skatepark > 0) {
    courts.push({ sport: 'skatepark', quantity: jsonPlace.skatepark, surface: jsonPlace.platzbelag_skatepark || undefined })
  }

  if (jsonPlace.tischtennisplatten && jsonPlace.tischtennisplatten > 0) {
    courts.push({ sport: 'tischtennis', quantity: jsonPlace.tischtennisplatten, surface: jsonPlace.platzbelag_tischtennis || undefined })
  }

  if (jsonPlace.tennisplätze && jsonPlace.tennisplätze > 0) {
    courts.push({ sport: 'tennis', quantity: jsonPlace.tennisplätze, surface: jsonPlace.platzbelag_tennis || undefined })
  }

  if (jsonPlace.volleyballplätze && jsonPlace.volleyballplätze > 0) {
    courts.push({ sport: 'volleyball', quantity: jsonPlace.volleyballplätze, surface: jsonPlace.platzbelag_volleyball || undefined })
  }

  if (jsonPlace.hockeyplätze && jsonPlace.hockeyplätze > 0) {
    courts.push({ sport: 'hockey', quantity: jsonPlace.hockeyplätze, surface: jsonPlace.platzbelag_hockey || undefined })
  }

  if (jsonPlace.klettern && jsonPlace.klettern > 0) {
    courts.push({ sport: 'klettern', quantity: jsonPlace.klettern })
  }

  if (jsonPlace.calisthenics && jsonPlace.calisthenics > 0) {
    courts.push({ sport: 'calisthenics', quantity: jsonPlace.calisthenics, surface: jsonPlace.platzbelag_calisthenics || undefined })
  }

  if (jsonPlace.laufbahnen && jsonPlace.laufbahnen > 0) {
    courts.push({ sport: 'laufen', quantity: jsonPlace.laufbahnen })
  }

  if (jsonPlace.padelplätze && jsonPlace.padelplätze > 0) {
    courts.push({ sport: 'padel', quantity: jsonPlace.padelplätze, surface: jsonPlace.platzbelag_padel || undefined })
  }

  if (jsonPlace.badmintonplätze && jsonPlace.badmintonplätze > 0) {
    courts.push({ sport: 'badminton', quantity: jsonPlace.badmintonplätze, surface: jsonPlace.platzbelag_badminton || undefined })
  }

  if (jsonPlace.schwimmplätze && jsonPlace.schwimmplätze > 0) {
    courts.push({ sport: 'schwimmen', quantity: jsonPlace.schwimmplätze })
  }

  if (jsonPlace.schachfelder && jsonPlace.schachfelder > 0) {
    courts.push({ sport: 'schach', quantity: jsonPlace.schachfelder })
  }

  // Create the place data (added_by_user will be set later)
  const place = {
    name: jsonPlace.name,
    latitude: geometry.y,
    longitude: geometry.x,
    district: jsonPlace.district || null,
    place_type: jsonPlace.place_type || 'öffentlich',
    image_url: jsonPlace.image_url || null,
    sports: courts.map(c => c.sport as Database['public']['Enums']['sport_type']),
    source: sourceFilename,
    import_date: new Date().toISOString()
  }
  
  return { place, courts }
}

async function checkForDuplicates(latitude: number, longitude: number) {
  // Check for existing places with same coordinates (within ~20m tolerance)
  const { data, error } = await supabase
    .from('places')
    .select('id, name, latitude, longitude')
    .gte('latitude', latitude - 0.0002)
    .lte('latitude', latitude + 0.0002)
    .gte('longitude', longitude - 0.0002)
    .lte('longitude', longitude + 0.0002)

  if (error) {
    console.error('Error checking for duplicates:', error)
    return null
  }

  const existingPlace = data.find(place =>
    Math.abs(place.latitude - latitude) < 0.0002 &&
    Math.abs(place.longitude - longitude) < 0.0002
  )

  if (!existingPlace) return null

  // Fetch existing sports for this place
  const { data: existingCourts, error: courtsError } = await supabase
    .from('courts')
    .select('sport')
    .eq('place_id', existingPlace.id)

  if (courtsError) {
    console.error('Error fetching existing courts:', courtsError)
    return { ...existingPlace, existingSports: [] as string[] }
  }

  return {
    ...existingPlace,
    existingSports: existingCourts.map(c => c.sport as string)
  }
}

async function importPlace(jsonPlace: JsonPlace, userId: string, sourceFilename: string) {
  const { place, courts } = transformJsonPlace(jsonPlace, sourceFilename)
  
  // Set the user attribution
  const placeWithUser = {
    ...place,
    added_by_user: userId
  }
  
  // Check for duplicates
  const duplicate = await checkForDuplicates(placeWithUser.latitude, placeWithUser.longitude)
  if (duplicate) {
    // Filter out courts for sports that already exist at this location
    const newCourts = courts.filter(c => !duplicate.existingSports.includes(c.sport))

    if (newCourts.length === 0) {
      console.log(`⚠️  Skipping duplicate place: ${placeWithUser.name} (matches existing: ${duplicate.name}, all sports already present)`)
      return { success: true, skipped: true }
    }

    // Insert only the new sports into the existing place
    const courtInserts = newCourts.map(court => ({
      place_id: duplicate.id,
      sport: court.sport as Database['public']['Enums']['sport_type'],
      quantity: court.quantity,
      surface: court.surface || null,
      notes: null
    }))

    const { error: courtsError } = await supabase.from('courts').insert(courtInserts)
    if (courtsError) {
      console.error(`❌ Error inserting new courts for existing place ${duplicate.name}:`, courtsError)
      return { success: false, error: courtsError }
    }

    // Update the places.sports array to include the newly added sports
    const updatedSports = [...duplicate.existingSports, ...newCourts.map(c => c.sport)]
    const { error: updateError } = await supabase
      .from('places')
      .update({ sports: updatedSports })
      .eq('id', duplicate.id)
    if (updateError) {
      console.error(`❌ Error updating sports array for existing place ${duplicate.name}:`, updateError)
      return { success: false, error: updateError }
    }

    const newSports = newCourts.map(c => c.sport).join(', ')
    console.log(`🔄 Merged ${newCourts.length} new courts (${newSports}) into existing place: ${duplicate.name}`)
    return { success: true, skipped: false, merged: true }
  }
  
  try {
    // Insert the place
    const { data: insertedPlace, error: placeError } = await supabase
      .from('places')
      .insert(placeWithUser)
      .select()
      .single()
    
    if (placeError) {
      console.error(`❌ Error inserting place ${placeWithUser.name}:`, placeError)
      return { success: false, error: placeError }
    }
    
    // Insert the courts for this place
    if (courts.length > 0) {
      const courtInserts = courts.map(court => ({
        place_id: insertedPlace.id,
        sport: court.sport as Database['public']['Enums']['sport_type'],
        quantity: court.quantity,
        surface: court.surface || null,
        notes: null
      }))
      
      const { error: courtsError } = await supabase
        .from('courts')
        .insert(courtInserts)
      
      if (courtsError) {
        console.error(`⚠️  Error inserting courts for ${placeWithUser.name}:`, courtsError)
        // Don't fail the whole import for court errors
      }
    }
    
    console.log(`✅ Imported: ${placeWithUser.name} (${courts.length} courts)`)
    return { success: true, place: insertedPlace, courtsCount: courts.length }
    
  } catch (error) {
    console.error(`❌ Unexpected error importing ${placeWithUser.name}:`, error)
    return { success: false, error }
  }
}


async function main() {
  const args = process.argv.slice(2)
  const jsonFilePath = args[0]
  
  if (!jsonFilePath) {
    console.error('Usage: tsx scripts/import-places.ts <path-to-json-file>')
    console.error('Example: tsx scripts/import-places.ts data/places.json')
    process.exit(1)
  }
  
  let jsonData: JsonData
  
  try {
    const fileContent = readFileSync(jsonFilePath, 'utf-8')
    jsonData = JSON.parse(fileContent)
  } catch (error) {
    console.error('❌ Error reading JSON file:', error)
    process.exit(1)
  }
  
  if (!Array.isArray(jsonData)) {
    console.error('❌ Invalid JSON format. Expected array of places [...] ')
    process.exit(1)
  }
  
  console.log(`📦 Found ${jsonData.length} places to import`)
  
  // Extract filename for source attribution
  const sourceFilename = basename(jsonFilePath, '.json')
  console.log(`📄 Using source: ${sourceFilename}`)
  
  const systemUserId = SYSTEM_USER_ID
  console.log(`👤 Using system user for attribution: ${systemUserId}`)
  
  // Import places
  let successCount = 0
  let skipCount = 0
  let mergeCount = 0
  let errorCount = 0

  for (let i = 0; i < jsonData.length; i++) {
    const place = jsonData[i]
    console.log(`\n[${i + 1}/${jsonData.length}] Processing: ${place.name}`)

    const result = await importPlace(place, systemUserId, sourceFilename)

    if (result.success) {
      if (result.skipped) {
        skipCount++
      } else if ('merged' in result && result.merged) {
        mergeCount++
      } else {
        successCount++
      }
    } else {
      errorCount++
    }
    
    // Small delay to be nice to the database
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Import Summary:')
  console.log(`✅ Successful imports: ${successCount}`)
  console.log(`🔄 Merged (new sports into existing place): ${mergeCount}`)
  console.log(`⚠️  Skipped (all sports already present): ${skipCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log(`📦 Total processed: ${jsonData.length}`)
  
  if (errorCount === 0) {
    console.log('\n🎉 Import completed successfully!')
  } else {
    console.log('\n⚠️  Import completed with some errors. Check the logs above.')
    process.exit(1)
  }
}

// Run the import
main().catch((error) => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})