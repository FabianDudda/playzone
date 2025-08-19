import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { reverseGeocode, batchReverseGeocode } from '@/lib/geocoding'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { placeIds, batchMode = false } = body

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      return NextResponse.json(
        { error: 'placeIds array is required' },
        { status: 400 }
      )
    }

    // Fetch places that don't have address information yet
    const { data: places, error: fetchError } = await supabase
      .from('places')
      .select('id, latitude, longitude, name, street, city')
      .in('id', placeIds)

    if (fetchError) {
      console.error('Error fetching places:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch places' },
        { status: 500 }
      )
    }

    if (!places || places.length === 0) {
      return NextResponse.json(
        { message: 'No places found', enriched: 0 },
        { status: 200 }
      )
    }

    // Filter places that need geocoding (no street or city info)
    const placesToEnrich = places.filter(place => 
      !place.street || !place.city
    )

    if (placesToEnrich.length === 0) {
      return NextResponse.json(
        { message: 'All places already have address information', enriched: 0 },
        { status: 200 }
      )
    }

    console.log(`Starting geocoding for ${placesToEnrich.length} places...`)

    let enrichedCount = 0
    const errors: string[] = []

    if (batchMode && placesToEnrich.length > 1) {
      // Batch processing with progress tracking
      const coordinates = placesToEnrich.map(place => ({
        id: place.id,
        latitude: place.latitude,
        longitude: place.longitude
      }))

      const results = await batchReverseGeocode(coordinates, {
        onProgress: (completed, total) => {
          console.log(`Geocoding progress: ${completed}/${total}`)
        },
        onError: (id, error) => {
          console.error(`Geocoding error for place ${id}:`, error)
          errors.push(`Place ${id}: ${error}`)
        }
      })

      // Update database with results
      for (const result of results) {
        if (result.address) {
          console.log(`Updating place ${result.id} with address:`, result.address)
          
          const { error: updateError } = await supabase
            .from('places')
            .update({
              street: result.address.street,
              house_number: result.address.house_number,
              city: result.address.city,
              county: result.address.county,
              state: result.address.state,
              country: result.address.country,
              postcode: result.address.postcode,
            })
            .eq('id', result.id)

          if (updateError) {
            console.error(`Error updating place ${result.id}:`, updateError)
            errors.push(`Failed to update place ${result.id}`)
          } else {
            console.log(`Successfully updated place ${result.id}`)
            enrichedCount++
          }
        } else {
          console.log(`No address data returned for place ${result.id}`)
          errors.push(`No address found for place ${result.id}`)
        }
      }
    } else {
      // Single-place processing (for real-time requests)
      for (const place of placesToEnrich) {
        try {
          const address = await reverseGeocode(place.latitude, place.longitude)
          
          if (address) {
            const { error: updateError } = await supabase
              .from('places')
              .update({
                street: address.street,
                house_number: address.house_number,
                city: address.city,
                county: address.county,
                state: address.state,
                country: address.country,
                postcode: address.postcode,
              })
              .eq('id', place.id)

            if (updateError) {
              console.error(`Error updating place ${place.id}:`, updateError)
              errors.push(`Failed to update place ${place.id}`)
            } else {
              enrichedCount++
            }
          } else {
            errors.push(`No address found for place ${place.id}`)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Error geocoding place ${place.id}:`, errorMessage)
          errors.push(`Place ${place.id}: ${errorMessage}`)
        }
      }
    }

    return NextResponse.json({
      message: `Successfully enriched ${enrichedCount} out of ${placesToEnrich.length} places`,
      enriched: enrichedCount,
      total: placesToEnrich.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Geocoding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get places that need geocoding (no street or city)
    const { data: places, error } = await supabase
      .from('places')
      .select('id, name, latitude, longitude, street, city, created_at')
      .or('street.is.null,city.is.null')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching places needing geocoding:', error)
      return NextResponse.json(
        { error: 'Failed to fetch places' },
        { status: 500 }
      )
    }

    const { count } = await supabase
      .from('places')
      .select('*', { count: 'exact', head: true })
      .or('street.is.null,city.is.null')

    return NextResponse.json({
      places: places || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error in geocoding GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}