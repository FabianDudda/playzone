import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    // Raw query to see exactly what's in the database
    const { data, error } = await supabase
      .from('places')
      .select('id, name, latitude, longitude, street, house_number, city, county, state, country, postcode')
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Debug query - showing first 5 places with address fields',
      places: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}