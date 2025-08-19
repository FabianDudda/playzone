#!/usr/bin/env tsx

// Load environment variables from .env.local
import { config } from 'dotenv'
import { join } from 'path'
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
  attributes: {
    name: string
    district?: string
    fußballplätze?: string | null
    platzbelag_fußball?: string | null
    basketballplätze?: string | null
    boulebahn?: string | null
    skatepark_elemente?: string | null
    tischtennisplatten?: string | null
  }
  geometry: {
    x: number // longitude
    y: number // latitude
  }
}

interface JsonData {
  places: JsonPlace[]
}

// System user ID for data attribution - will be created automatically
const SYSTEM_USER_ID = 'a0000000-0000-0000-0000-000000000001' // Import system user

function transformJsonPlace(jsonPlace: JsonPlace) {
  const { attributes, geometry } = jsonPlace
  
  // Extract available sports and their details
  const courts: Array<{
    sport: string
    quantity: number
    surface?: string
  }> = []
  
  // Map each sport field to court data
  if (attributes.fußballplätze && parseInt(attributes.fußballplätze) > 0) {
    courts.push({
      sport: 'fußball',
      quantity: parseInt(attributes.fußballplätze),
      surface: attributes.platzbelag_fußball || undefined
    })
  }
  
  if (attributes.basketballplätze && parseInt(attributes.basketballplätze) > 0) {
    courts.push({
      sport: 'basketball',
      quantity: parseInt(attributes.basketballplätze)
    })
  }
  
  if (attributes.boulebahn && parseInt(attributes.boulebahn) > 0) {
    courts.push({
      sport: 'boule',
      quantity: parseInt(attributes.boulebahn)
    })
  }
  
  if (attributes.skatepark_elemente && parseInt(attributes.skatepark_elemente) > 0) {
    courts.push({
      sport: 'skatepark',
      quantity: parseInt(attributes.skatepark_elemente)
    })
  }
  
  if (attributes.tischtennisplatten && parseInt(attributes.tischtennisplatten) > 0) {
    courts.push({
      sport: 'tischtennis',
      quantity: parseInt(attributes.tischtennisplatten)
    })
  }
  
  // Create the place data (added_by_user will be set later)
  const place = {
    name: attributes.name,
    latitude: geometry.y,
    longitude: geometry.x,
    district: attributes.district || null,
    sports: courts.map(c => c.sport as Database['public']['Enums']['sport_type']),
    source: 'json_import',
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

async function importPlace(jsonPlace: JsonPlace, userId: string) {
  const { place, courts } = transformJsonPlace(jsonPlace)
  
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
  
  if (!jsonData.places || !Array.isArray(jsonData.places)) {
    console.error('❌ Invalid JSON format. Expected { "places": [...] }')
    process.exit(1)
  }
  
  console.log(`📦 Found ${jsonData.places.length} places to import`)
  
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
  
  for (let i = 0; i < jsonData.places.length; i++) {
    const place = jsonData.places[i]
    console.log(`\n[${i + 1}/${jsonData.places.length}] Processing: ${place.attributes.name}`)
    
    const result = await importPlace(place, systemUserId)
    
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
  console.log(`📦 Total processed: ${jsonData.places.length}`)
  
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