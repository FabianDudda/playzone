export interface ValidationMatch {
  osmId?: number            // OSM element id for deduplication
  name: string
  sportTag: string | null   // raw tag from OSM or primaryType from Google
  appSports: string[]       // mapped to app sport slugs
  matchesDeclared: boolean  // overlaps with the place's declared sports
  distance: number          // meters from place coordinates
}

export interface ValidationCheckResult {
  source: 'osm' | 'google'
  status: 'ok' | 'unavailable' | 'error'
  matches: ValidationMatch[]  // all found within 200m, sorted by distance
  error?: string
}

export interface ValidationResult {
  placeId: string
  osm: ValidationCheckResult
  google: ValidationCheckResult
  overallStatus: 'confirmed' | 'partial' | 'not_found' | 'unavailable'
  checkedAt: string
}

// Maps OSM sport tag values → app sport slugs
const OSM_SPORT_MAP: Record<string, string[]> = {
  tennis:            ['tennis'],
  basketball:        ['basketball'],
  volleyball:        ['volleyball', 'beachvolleyball'],
  beach_volleyball:  ['beachvolleyball'],
  soccer:            ['fußball'],
  football:          ['fußball'],
  american_football: ['fußball'],
  badminton:         ['badminton'],
  squash:            ['squash'],
  hockey:            ['hockey'],
  ice_hockey:        ['hockey'],
  table_tennis:      ['tischtennis'],
  skateboard:        ['skatepark'],
  skating:           ['skatepark'],
  swimming:          ['schwimmen'],
  climbing:          ['klettern'],
  bouldering:        ['klettern'],
  boules:            ['boule'],
  petanque:          ['boule'],
  padel:             ['padel'],
  calisthenics:      ['calisthenics'],
  fitness:           ['calisthenics'],
  chess:             ['schach'],
  running:           ['laufen'],
  athletics:         ['laufen'],
  spikeball:         ['spikeball'],
  multi:             [],
  pitch:             [],
}

// Maps Google Places API type values → app sport slugs
// Types not usable as includedTypes filters are still listed here
// so they can be matched when they appear in a result's `types` array.
const GOOGLE_TYPE_MAP: Record<string, string[]> = {
  // Specific courts / fields (not valid as search filters but appear in results)
  tennis_court:          ['tennis'],
  basketball_court:      ['basketball'],
  volleyball_court:      ['volleyball'],
  soccer_field:          ['fußball'],
  football_field:        ['fußball'],
  badminton_court:       ['badminton'],
  squash_court:          ['squash'],
  padel_court:           ['padel'],
  table_tennis_area:     ['tischtennis'],
  skateboard_park:       ['skatepark'],
  skating_rink:          ['skatepark'],
  swimming_pool:         ['schwimmen'],
  outdoor_swimming_pool: ['schwimmen'],
  climbing_gym:          ['klettern'],
  // Generic types — sport detected from place name via SPORT_NAME_KEYWORDS
  arena:                    [],
  athletic_field:           ['laufen', 'fußball'],
  fitness_center:           ['calisthenics'],
  gym:                      ['calisthenics', 'basketball'],
  sports_activity_location: [],
  sports_club:              [],
  sports_complex:           [],
  sports_school:            [],
  stadium:                  [],
  golf_course:              [],
  bowling_alley:            [],
}

// Keywords (lowercase, German + English) per sport slug.
// Used to detect sports from a Google result's display name when type mapping is generic.
const SPORT_NAME_KEYWORDS: Record<string, string[]> = {
  tennis:          ['tennis'],
  basketball:      ['basket', 'basketball'],
  volleyball:      ['volleyball', 'volley'],
  spikeball:       ['spikeball', 'roundnet'],
  badminton:       ['badminton'],
  squash:          ['squash'],
  hockey:          ['hockey', 'eishockey', 'feldhockey'],
  fußball:         ['fußball', 'fussball',  'bolzplatz', 'fußballplatz'],
  tischtennis:     ['tischtennis', 'table tennis', 'ping pong', 'pingpong', 'tt-'],
  beachvolleyball: ['beachvolley', 'beach volley', 'beachsport'],
  boule:           ['boule', 'pétanque', 'petanque', 'boulebahn'],
  skatepark:       ['skate', 'skateboard', 'skatepark', 'halfpipe'],
  calisthenics:    ['calisthenics', 'workout', 'fitness', 'kraftsport', 'street workout', 'crossfit'],
  laufen:          ['lauf', 'laufen', 'run', 'marathon', 'jogging', 'leichtathletik', 'athletics', 'track', 'tartanbahn'],
  schwimmen:       ['schwimm', 'freibad', 'hallenbad', 'schwimmbad', 'pool', 'badeanlage', 'bad ', 'swimming', 'aqua'],
  klettern:        ['kletter', 'boulder', 'climbing', 'kletterhalle', 'boulderhalle'],
  padel:           ['padel'],
  schach:          ['schach', 'chess', 'schachclub'],
}

function sportsFromName(name: string): string[] {
  const lower = name.toLowerCase()
  const found: string[] = []
  for (const [sport, keywords] of Object.entries(SPORT_NAME_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) found.push(sport)
  }
  return found
}

// Only types confirmed valid by Google Places API v1 (New)
export const GOOGLE_INCLUDED_TYPES = [
  'arena',
  'athletic_field',
  'fitness_center',
  'gym',
  'park',
  'playground',
  'sports_activity_location',
  'sports_club',
  'sports_complex',
  'sports_school',
  'skateboard_park',
  'swimming_pool',
  'stadium',
  'tennis_court',
  'golf_course',
  'bowling_alley',
]

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

async function fetchOverpass(queryData: string): Promise<Response> {
  let lastError: Error | null = null
  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const body = new URLSearchParams()
      body.set('data', queryData)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PlayzoneAdminValidation/1.0 (admin tool)',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(12000),
      })
      if (res.ok) return res
      if (res.status !== 504 && res.status !== 502 && res.status !== 429) {
        // Non-retryable error — return as-is
        return res
      }
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError ?? new Error('All Overpass mirrors failed')
}

export async function checkOSM(
  lat: number,
  lon: number,
  declaredSports: string[]
): Promise<ValidationCheckResult> {
  const query = `[out:json][timeout:10];
(
  node(around:200,${lat},${lon})[sport];
  way(around:200,${lat},${lon})[sport];
  node(around:200,${lat},${lon})[leisure~"^(pitch|sports_centre|stadium|swimming_pool|skate_park|fitness_centre|track)$"];
  way(around:200,${lat},${lon})[leisure~"^(pitch|sports_centre|stadium|swimming_pool|skate_park|fitness_centre|track)$"];
);
out center tags;`

  try {
    const res = await fetchOverpass(query)

    if (!res.ok) {
      return { source: 'osm', status: 'error', matches: [], error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    const elements: Record<string, unknown>[] = data.elements || []

    const matches: ValidationMatch[] = elements
      .map((el) => {
        const elLat = el.type === 'node'
          ? (el.lat as number)
          : (el.center as { lat: number; lon: number } | undefined)?.lat
        const elLon = el.type === 'node'
          ? (el.lon as number)
          : (el.center as { lat: number; lon: number } | undefined)?.lon

        if (elLat == null || elLon == null) return null

        const distance = haversineDistance(lat, lon, elLat, elLon)
        if (distance > 200) return null

        const tags = (el.tags as Record<string, string>) || {}
        const sportTag = tags.sport || tags.leisure || null
        const appSports = sportTag
          ? [...new Set(sportTag.split(';').flatMap(s => OSM_SPORT_MAP[s.trim()] ?? []))]
          : []
        const matchesDeclared = appSports.some(s => declaredSports.includes(s))

        return {
          osmId: el.id as number | undefined,
          name: tags.name || sportTag || 'Unnamed',
          sportTag,
          appSports,
          matchesDeclared,
          distance,
        } satisfies ValidationMatch
      })
      .filter((m): m is ValidationMatch => m !== null)
      .sort((a, b) => a.distance - b.distance)

    return { source: 'osm', status: 'ok', matches }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { source: 'osm', status: 'error', matches: [], error: msg }
  }
}

export async function checkGoogle(
  lat: number,
  lon: number,
  declaredSports: string[],
  apiKey: string
): Promise<ValidationCheckResult> {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.types,places.primaryType,places.location',
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: 200,
          },
        },
        maxResultCount: 20,
        includedTypes: GOOGLE_INCLUDED_TYPES,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      return { source: 'google', status: 'error', matches: [], error: errText }
    }

    const data = await res.json()
    const places: Record<string, unknown>[] = data.places || []

    const matches: ValidationMatch[] = places
      .map((p) => {
        const location = p.location as { latitude: number; longitude: number } | undefined
        if (!location) return null

        const distance = haversineDistance(lat, lon, location.latitude, location.longitude)

        const types: string[] = (p.types as string[]) || []
        const primaryType = (p.primaryType as string | null) || null
        const displayName = (p.displayName as { text?: string } | undefined)?.text

        const appSportsSet = new Set<string>()
        for (const t of types) {
          const mapped = GOOGLE_TYPE_MAP[t]
          if (mapped) mapped.forEach(s => appSportsSet.add(s))
        }

        // Always supplement with name keyword matching — catches sport fields inside
        // parks, clubs with sport names, and any type Google doesn't tag specifically
        if (displayName) {
          sportsFromName(displayName).forEach(s => appSportsSet.add(s))
        }

        const appSports = Array.from(appSportsSet)
        const matchesDeclared = appSports.some(s => declaredSports.includes(s))

        return {
          name: displayName || primaryType || 'Unknown',
          sportTag: primaryType,
          appSports,
          matchesDeclared,
          distance,
        } satisfies ValidationMatch
      })
      .filter((m): m is ValidationMatch => m !== null)
      .sort((a, b) => a.distance - b.distance)

    return { source: 'google', status: 'ok', matches }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { source: 'google', status: 'error', matches: [], error: msg }
  }
}

export function computeOverallStatus(
  osm: ValidationCheckResult,
  google: ValidationCheckResult
): ValidationResult['overallStatus'] {
  const anyConfirmed =
    osm.matches.some(m => m.matchesDeclared) ||
    google.matches.some(m => m.matchesDeclared)

  if (anyConfirmed) return 'confirmed'

  const anyMatches = osm.matches.length > 0 || google.matches.length > 0
  if (anyMatches) return 'partial'

  const bothUnavailable = osm.status !== 'ok' && google.status !== 'ok'
  if (bothUnavailable) return 'unavailable'

  return 'not_found'
}
