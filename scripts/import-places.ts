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
  fußballplätze?: number | null
  platzbelag_fußball?: string | null
  basketballplätze?: number | null
  beachvolleyballplätze?: number | null
  bouleplätze?: number | null
  skatepark?: number | null
  tischtennisplatten?: number | null
  tennisplätze?: number | null
  platzbelag_tennis?: string | null
  hockeyplätze?: number | null
  volleyballplätze?: number | null
  klettern?: number | null
  geometry: {
    x: number // longitude
    y: number // latitude
  }
}

type JsonData = JsonPlace[]

// System user ID for data attribution - will be created automatically
const SYSTEM_USER_ID = 'a0000000-0000-0000-0000-000000000001' // Import system user

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
    courts.push({
      sport: 'fußball',
      quantity: jsonPlace.fußballplätze,
      surface: jsonPlace.platzbelag_fußball || undefined
    })
  }
  
  if (jsonPlace.basketballplätze && jsonPlace.basketballplätze > 0) {
    courts.push({
      sport: 'basketball',
      quantity: jsonPlace.basketballplätze
    })
  }
  
  if (jsonPlace.beachvolleyballplätze && jsonPlace.beachvolleyballplätze > 0) {
    courts.push({
      sport: 'beachvolleyball',
      quantity: jsonPlace.beachvolleyballplätze
    })
  }
  
  if (jsonPlace.bouleplätze && jsonPlace.bouleplätze > 0) {
    courts.push({
      sport: 'boule',
      quantity: jsonPlace.bouleplätze
    })
  }
  
  if (jsonPlace.skatepark && jsonPlace.skatepark > 0) {
    courts.push({
      sport: 'skatepark',
      quantity: jsonPlace.skatepark
    })
  }
  
  if (jsonPlace.tischtennisplatten && jsonPlace.tischtennisplatten > 0) {
    courts.push({
      sport: 'tischtennis',
      quantity: jsonPlace.tischtennisplatten
    })
  }
  
  if (jsonPlace.tennisplätze && jsonPlace.tennisplätze > 0) {
    courts.push({
      sport: 'tennis',
      quantity: jsonPlace.tennisplätze,
      surface: jsonPlace.platzbelag_tennis || undefined
    })
  }
  
  if (jsonPlace.volleyballplätze && jsonPlace.volleyballplätze > 0) {
    courts.push({
      sport: 'volleyball',
      quantity: jsonPlace.volleyballplätze
    })
  }
  
  if (jsonPlace.hockeyplätze && jsonPlace.hockeyplätze > 0) {
    courts.push({
      sport: 'hockey',
      quantity: jsonPlace.hockeyplätze
    })
  }
  
  if (jsonPlace.klettern && jsonPlace.klettern > 0) {
    courts.push({
      sport: 'klettern',
      quantity: jsonPlace.klettern
    })
  }
  
  // Create the place data (added_by_user will be set later)
  const place = {
    name: jsonPlace.name,
    latitude: geometry.y,
    longitude: geometry.x,
    district: jsonPlace.district || null,
    sports: courts.map(c => c.sport as Database['public']['Enums']['sport_type']),
    source: sourceFilename,
    import_date: new Date().toISOString()
  }
  
  return { place, courts }
}

async function checkForDuplicates(latitude: number, longitude: number, name: string) {
  // Check for existing places with same coordinates (within 10 meters)
  const { data, error } = await supabase
    .from('places')
    .select('id, name, latitude, longitude')
    .gte('latitude', latitude - 0.0001) // ~10m tolerance
    .lte('latitude', latitude + 0.0001)
    .gte('longitude', longitude - 0.0001)
    .lte('longitude', longitude + 0.0001)
  
  if (error) {
    console.error('Error checking for duplicates:', error)
    return null
  }
  
  return data.find(place => 
    Math.abs(place.latitude - latitude) < 0.0001 && 
    Math.abs(place.longitude - longitude) < 0.0001
  )
}

async function importPlace(jsonPlace: JsonPlace, userId: string, sourceFilename: string) {
  const { place, courts } = transformJsonPlace(jsonPlace, sourceFilename)
  
  // Set the user attribution
  const placeWithUser = {
    ...place,
    added_by_user: userId
  }
  
  // Check for duplicates
  const duplicate = await checkForDuplicates(placeWithUser.latitude, placeWithUser.longitude, placeWithUser.name)
  if (duplicate) {
    console.log(`⚠️  Skipping duplicate place: ${placeWithUser.name} (matches existing: ${duplicate.name})`)
    return { success: true, skipped: true }
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

async function findOrCreateSystemUser() {
  // First, try to find any existing user to use as attribution
  const { data: existingUsers } = await supabase
    .from('profiles')
    .select('id, name')
    .limit(1)
  
  if (existingUsers && existingUsers.length > 0) {
    const user = existingUsers[0]
    console.log(`✅ Using existing user for attribution: ${user.name} (${user.id})`)
    return user.id
  }
  
  // If no users exist, we need to create one manually first
  console.log('❌ No existing users found. Please create at least one user account first by:')
  console.log('   1. Sign up through your app')
  console.log('   2. Or create a user manually in Supabase auth dashboard')
  console.log('   3. Then run the import again')
  throw new Error('No users available for attribution')
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
  
  // Find a user for attribution
  let systemUserId: string
  try {
    systemUserId = await findOrCreateSystemUser()
  } catch (error) {
    console.error('❌ Failed to find user for attribution. Import aborted.')
    process.exit(1)
  }
  
  // Import places
  let successCount = 0
  let skipCount = 0
  let errorCount = 0
  
  for (let i = 0; i < jsonData.length; i++) {
    const place = jsonData[i]
    console.log(`\n[${i + 1}/${jsonData.length}] Processing: ${place.name}`)
    
    const result = await importPlace(place, systemUserId, sourceFilename)
    
    if (result.success) {
      if (result.skipped) {
        skipCount++
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
  console.log(`⚠️  Skipped (duplicates): ${skipCount}`)
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