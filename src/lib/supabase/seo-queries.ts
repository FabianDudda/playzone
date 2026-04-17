import { createClient } from '@/lib/supabase/server'
import { createBuildClient } from '@/lib/supabase/build-client'
import { toSlug, slugToSport, sportToSlug } from '@/lib/utils/seo-slugs'

export const MIN_PLACES = 5
export const PAGE_SIZE = 24

export interface PlaceCombo {
  sport: string    // DB enum value
  country: string  // raw DB value
  state: string    // raw DB value
  city: string     // raw DB value
  count: number
}

export interface PlaceListing {
  id: string
  name: string
  description: string | null
  latitude: number
  longitude: number
  city: string | null
  state: string | null
  country: string | null
  district: string | null
  street: string | null
  house_number: string | null
  sports: string[] | null
  place_type: string | null
  features: string[] | null
  image_url: string | null
  updated_at: string | null
  place_attributes: { key: string; value: string }[] | null
}

const BATCH_SIZE = 2000
const TOTAL_PLACES_HINT = 22000 // slightly above current total; safe to over-estimate

/**
 * Fetches rows from all approved places in parallel batches of BATCH_SIZE,
 * working around the Supabase max-rows-per-request limit.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllApproved<T>(supabase: any, select: string): Promise<T[]> {
  const batchCount = Math.ceil(TOTAL_PLACES_HINT / BATCH_SIZE)
  const results = await Promise.all(
    Array.from({ length: batchCount }, (_, i) =>
      supabase
        .from('places')
        .select(select)
        .eq('moderation_status', 'approved')
        .range(i * BATCH_SIZE, (i + 1) * BATCH_SIZE - 1),
    ),
  )
  return results.flatMap(({ data }: { data: T[] | null }) => data ?? [])
}

/** Shared aggregation logic over raw place rows. */
function aggregateCombos(
  data: { sports: string[] | null; country: string | null; state: string | null; city: string | null }[],
  minCount: number,
): PlaceCombo[] {
  const map = new Map<string, PlaceCombo>()
  for (const place of data) {
    if (!place.sports || !place.state || !place.city || !place.country) continue
    for (const sport of place.sports as string[]) {
      if (sport === 'other' || !sportToSlug[sport]) continue
      const key = `${sport}|${place.country}|${place.state}|${place.city}`
      const existing = map.get(key)
      if (existing) existing.count++
      else map.set(key, { sport, country: place.country, state: place.state, city: place.city, count: 1 })
    }
  }
  return Array.from(map.values()).filter(c => c.count >= minCount)
}

/**
 * All distinct sport+country+state+city combos with count >= minCount.
 * Uses the SSR client — call from server components and API routes only.
 */
export async function getListingCombos(minCount = MIN_PLACES): Promise<PlaceCombo[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('sports, country, state, city')
    .eq('moderation_status', 'approved')
    .not('sports', 'is', null)
    .not('state', 'is', null)
    .not('city', 'is', null)
    .not('country', 'is', null)
  return aggregateCombos(data ?? [], minCount)
}

/**
 * Same as getListingCombos but uses a plain client without cookies.
 * Safe to call from generateStaticParams and sitemap (outside request scope).
 */
export async function getListingCombosStatic(minCount = MIN_PLACES): Promise<PlaceCombo[]> {
  const supabase = createBuildClient()
  const { data } = await supabase
    .from('places')
    .select('sports, country, state, city')
    .eq('moderation_status', 'approved')
    .not('sports', 'is', null)
    .not('state', 'is', null)
    .not('city', 'is', null)
    .not('country', 'is', null)
  return aggregateCombos(data ?? [], minCount)
}

/**
 * Resolve URL slugs back to raw DB values.
 * Returns null if any slug has no matching DB value.
 */
export async function resolveLocationSlugs(
  sportSlug: string,
  landSlug?: string,
  bundeslandSlug?: string,
  stadtSlug?: string,
): Promise<{ sport: string; country?: string; state?: string; city?: string } | null> {
  const sport = slugToSport[sportSlug]
  if (!sport) return null
  if (!landSlug) return { sport }

  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('country, state, city')
    .eq('moderation_status', 'approved')
    .contains('sports', [sport])
    .not('country', 'is', null)
    .not('state', 'is', null)
    .not('city', 'is', null)

  if (!data) return null

  const uniqueCountries = [...new Set(data.map(p => p.country).filter(Boolean) as string[])]
  const country = uniqueCountries.find(c => toSlug(c) === landSlug)
  if (!country) return null
  if (!bundeslandSlug) return { sport, country }

  const byCountry = data.filter(p => p.country === country)
  const uniqueStates = [...new Set(byCountry.map(p => p.state).filter(Boolean) as string[])]
  const state = uniqueStates.find(s => toSlug(s) === bundeslandSlug)
  if (!state) return null
  if (!stadtSlug) return { sport, country, state }

  const byState = byCountry.filter(p => p.state === state)
  const uniqueCities = [...new Set(byState.map(p => p.city).filter(Boolean) as string[])]
  const city = uniqueCities.find(c => toSlug(c) === stadtSlug)
  if (!city) return null

  return { sport, country, state, city }
}

/** Paginated place listings filtered by location. */
export async function getListingPlaces(filters: {
  sport: string
  country?: string
  state?: string
  city?: string
  page: number
}): Promise<{ places: PlaceListing[]; total: number }> {
  const supabase = await createClient()
  const offset = (filters.page - 1) * PAGE_SIZE

  let query = supabase
    .from('places')
    .select(
      'id, name, description, latitude, longitude, city, state, country, district, street, house_number, sports, place_type, features, image_url, updated_at, place_attributes(key, value)',
      { count: 'exact' },
    )
    .eq('moderation_status', 'approved')
    .contains('sports', [filters.sport])

  if (filters.country) query = query.eq('country', filters.country)
  if (filters.state) query = query.eq('state', filters.state)
  if (filters.city) query = query.eq('city', filters.city)

  const { data, count, error } = await query
    .order('name', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return { places: [], total: 0 }
  return { places: (data ?? []) as PlaceListing[], total: count ?? 0 }
}

/** All sports with total approved place counts (for root /orte hub).
 *  Runs one COUNT query per sport in parallel — avoids the default 1000-row
 *  client limit that would truncate a full table scan. */
export async function getSportCounts(): Promise<{ sport: string; count: number }[]> {
  const supabase = await createClient()
  const sports = Object.keys(sportToSlug).filter(s => s !== 'other')

  const results = await Promise.all(
    sports.map(async sport => {
      const { count } = await supabase
        .from('places')
        .select('id', { count: 'exact', head: true })
        .eq('moderation_status', 'approved')
        .contains('sports', [sport])
      return { sport, count: count ?? 0 }
    }),
  )

  return results
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
}

/** Countries available for a sport with counts >= minCount. */
export async function getCountriesForSport(
  sport: string,
  minCount = MIN_PLACES,
): Promise<{ country: string; count: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('country')
    .eq('moderation_status', 'approved')
    .contains('sports', [sport])
    .not('country', 'is', null)

  if (!data) return []

  const map = new Map<string, number>()
  for (const p of data) {
    if (p.country) map.set(p.country, (map.get(p.country) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .map(([country, count]) => ({ country, count }))
}

/** Bundesländer for a sport+country with counts >= minCount. */
export async function getStatesForSport(
  sport: string,
  country: string,
  minCount = MIN_PLACES,
): Promise<{ state: string; count: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('state')
    .eq('moderation_status', 'approved')
    .contains('sports', [sport])
    .eq('country', country)
    .not('state', 'is', null)

  if (!data) return []

  const map = new Map<string, number>()
  for (const p of data) {
    if (p.state) map.set(p.state, (map.get(p.state) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .filter(([, count]) => count >= minCount)
    .sort(([a], [b]) => a.localeCompare(b, 'de'))
    .map(([state, count]) => ({ state, count }))
}

/** Cities in a state with a given sport, counts >= minCount. */
export async function getCitiesInState(
  sport: string,
  country: string,
  state: string,
  minCount = MIN_PLACES,
): Promise<{ city: string; count: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('city')
    .eq('moderation_status', 'approved')
    .contains('sports', [sport])
    .eq('country', country)
    .eq('state', state)
    .not('city', 'is', null)

  if (!data) return []

  const map = new Map<string, number>()
  for (const p of data) {
    if (p.city) map.set(p.city, (map.get(p.city) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .filter(([, count]) => count >= minCount)
    .sort(([a], [b]) => a.localeCompare(b, 'de'))
    .map(([city, count]) => ({ city, count }))
}

/** All cities for a sport across all countries/states, sorted by count desc. */
export async function getAllCitiesForSport(
  sport: string,
  minCount = 0,
): Promise<{ city: string; count: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('city')
    .eq('moderation_status', 'approved')
    .contains('sports', [sport])
    .not('city', 'is', null)

  if (!data) return []

  const map = new Map<string, number>()
  for (const p of data) {
    if (p.city) map.set(p.city, (map.get(p.city) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .map(([city, count]) => ({ city, count }))
}

/** Distinct (sport, city) combos for generateStaticParams — uses plain client, safe outside request scope. */
export async function getCityCombosStatic(
  minCount = MIN_PLACES,
): Promise<{ sport: string; city: string; count: number }[]> {
  const supabase = createBuildClient()
  const data = await fetchAllApproved<{ sports: string[] | null; city: string | null }>(
    supabase,
    'sports, city',
  )

  const map = new Map<string, { sport: string; city: string; count: number }>()
  for (const place of data) {
    if (!place.sports || !place.city) continue
    for (const sport of place.sports as string[]) {
      if (sport === 'other' || !sportToSlug[sport]) continue
      const key = `${sport}|${place.city}`
      const existing = map.get(key)
      if (existing) existing.count++
      else map.set(key, { sport, city: place.city, count: 1 })
    }
  }

  return Array.from(map.values()).filter(c => c.count >= minCount)
}

/** Resolve a city slug to the raw DB city value for a given sport. */
export async function resolveCitySlug(
  sportSlug: string,
  stadtSlug: string,
): Promise<{ sport: string; city: string } | null> {
  const sport = slugToSport[sportSlug]
  if (!sport) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('city')
    .eq('moderation_status', 'approved')
    .contains('sports', [sport])
    .not('city', 'is', null)

  if (!data) return null

  const city = [...new Set(data.map(p => p.city).filter(Boolean) as string[])].find(
    c => toSlug(c) === stadtSlug,
  )
  if (!city) return null

  return { sport, city }
}

/** Paginated place listing for a city (no state/country filter). */
export async function getListingPlacesCity(filters: {
  sport: string
  city: string
  page: number
}): Promise<{ places: PlaceListing[]; total: number }> {
  const supabase = await createClient()
  const offset = (filters.page - 1) * PAGE_SIZE

  const { data, count, error } = await supabase
    .from('places')
    .select(
      'id, name, description, latitude, longitude, city, state, country, district, street, house_number, sports, place_type, features, image_url, updated_at',
      { count: 'exact' },
    )
    .eq('moderation_status', 'approved')
    .contains('sports', [filters.sport])
    .eq('city', filters.city)
    .order('name', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return { places: [], total: 0 }
  return { places: (data ?? []) as PlaceListing[], total: count ?? 0 }
}

/** All cities with total approved place count, sorted by count desc. */
export async function getCityList(minCount = MIN_PLACES): Promise<{ city: string; count: number }[]> {
  const supabase = await createClient()
  const data = await fetchAllApproved<{ city: string | null }>(supabase, 'city')

  const map = new Map<string, number>()
  for (const p of data) {
    if (p.city) map.set(p.city, (map.get(p.city) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .map(([city, count]) => ({ city, count }))
}

/** Same as getCityList but uses plain client — safe for generateStaticParams. */
export async function getCityListStatic(minCount = MIN_PLACES): Promise<{ city: string; count: number }[]> {
  const supabase = createBuildClient()
  const data = await fetchAllApproved<{ city: string | null }>(supabase, 'city')

  const map = new Map<string, number>()
  for (const p of data) {
    if (p.city) map.set(p.city, (map.get(p.city) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .map(([city, count]) => ({ city, count }))
}

/** Resolve a city URL slug to the raw DB city name. */
export async function resolveCitySlugOnly(stadtSlug: string): Promise<string | null> {
  const supabase = await createClient()
  const data = await fetchAllApproved<{ city: string | null }>(supabase, 'city')

  const cities = [...new Set(data.map(p => p.city).filter(Boolean) as string[])]
  return cities.find(c => toSlug(c) === stadtSlug) ?? null
}

/** All sports available in a city with place counts, sorted by count desc. */
export async function getSportsInCity(city: string): Promise<{ sport: string; count: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('sports')
    .eq('moderation_status', 'approved')
    .eq('city', city)
    .not('sports', 'is', null)

  if (!data) return []

  const map = new Map<string, number>()
  for (const p of data) {
    for (const sport of (p.sports ?? []) as string[]) {
      if (sport !== 'other' && sportToSlug[sport]) {
        map.set(sport, (map.get(sport) ?? 0) + 1)
      }
    }
  }

  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([sport, count]) => ({ sport, count }))
}

/** Paginated place listings for a city with no sport filter. */
export async function getAllPlacesInCity(filters: {
  city: string
  page: number
}): Promise<{ places: PlaceListing[]; total: number }> {
  const supabase = await createClient()
  const offset = (filters.page - 1) * PAGE_SIZE

  const { data, count, error } = await supabase
    .from('places')
    .select(
      'id, name, description, latitude, longitude, city, state, country, district, street, house_number, sports, place_type, features, image_url, updated_at',
      { count: 'exact' },
    )
    .eq('moderation_status', 'approved')
    .eq('city', filters.city)
    .order('image_url', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return { places: [], total: 0 }
  return { places: (data ?? []) as PlaceListing[], total: count ?? 0 }
}

/** Lightweight place pins for a city — used to populate the full map (up to 500). */
export async function getAllPlacesInCityForMap(
  city: string,
): Promise<{ id: string; name: string; latitude: number; longitude: number; sports: string[] | null }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('id, name, latitude, longitude, sports')
    .eq('moderation_status', 'approved')
    .eq('city', city)
    .range(0, 499)

  return (data ?? []) as { id: string; name: string; latitude: number; longitude: number; sports: string[] | null }[]
}

/** Lightweight place pins for a city+sport — used to populate the full map (up to 500). */
export async function getAllPlacesInCityForMapBySport(
  city: string,
  sport: string,
): Promise<{ id: string; name: string; latitude: number; longitude: number; sports: string[] | null }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('id, name, latitude, longitude, sports')
    .eq('moderation_status', 'approved')
    .eq('city', city)
    .contains('sports', [sport])
    .range(0, 499)

  return (data ?? []) as { id: string; name: string; latitude: number; longitude: number; sports: string[] | null }[]
}

/** Lightweight count of approved places for a sport+city. Uses head:true — no rows fetched. */
export async function getCityPlaceCount(sport: string, city: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('places')
    .select('id', { count: 'exact', head: true })
    .eq('moderation_status', 'approved')
    .contains('sports', [sport])
    .eq('city', city)
  return count ?? 0
}

/** Other sports in the same city with counts >= minCount. */
export async function getOtherSportsInCity(
  city: string,
  currentSport: string,
  minCount = MIN_PLACES,
): Promise<{ sport: string; count: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('places')
    .select('sports')
    .eq('moderation_status', 'approved')
    .eq('city', city)
    .not('sports', 'is', null)

  if (!data) return []

  const map = new Map<string, number>()
  for (const p of data) {
    for (const sport of (p.sports ?? []) as string[]) {
      if (sport !== currentSport && sport !== 'other' && sportToSlug[sport]) {
        map.set(sport, (map.get(sport) ?? 0) + 1)
      }
    }
  }

  return Array.from(map.entries())
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .map(([sport, count]) => ({ sport, count }))
}

export async function getCityCenter(city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', city)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    url.searchParams.set('countrycodes', 'de')
    url.searchParams.set('featureType', 'city')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'OpenSportMap/1.0 (contact@opensportmap.de)' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

