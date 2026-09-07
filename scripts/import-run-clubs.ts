#!/usr/bin/env tsx

import { config } from 'dotenv'
import { join } from 'path'
config({ path: join(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/lib/supabase/types'
import type { AddressComponents } from '../src/lib/geocoding'

async function reverseGeocodeScript(lat: number, lon: number): Promise<AddressComponents | null> {
  // Nominatim requires a descriptive User-Agent for non-browser clients
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'json')
  url.searchParams.set('lat', lat.toString())
  url.searchParams.set('lon', lon.toString())
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'de')

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'playzone-import-script/1.0 (fabi.dudda@gmail.com)',
      },
    })
    if (!res.ok) {
      console.log(`  ⚠️  Nominatim ${res.status}: ${res.statusText}`)
      return null
    }
    const data = await res.json()
    const a = data.address ?? {}
    return {
      street: a.road,
      house_number: a.house_number,
      district: a.neighbourhood || a.suburb,
      city: a.city || a.town || a.village,
      county: a.county,
      state: a.state,
      country: a.country,
      postcode: a.postcode,
    }
  } catch (err) {
    console.log(`  ⚠️  Reverse geocode error: ${err}`)
    return null
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase config. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const DRY_RUN = process.argv.includes('--dry-run')

interface RunClubData {
  name: string
  slug: string
  description?: string
  instagram?: string
  website?: string
  color: string
  location?: { latitude: number; longitude: number; name: string }
  event?: {
    title: string
    dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
    time?: string
    scheduleNote?: string
    // For clubs with multiple sessions, additional slots
    extraSlots?: Array<{
      dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
      time?: string
      note?: string
    }>
  }
}

const RUN_CLUBS: RunClubData[] = [
  // --- Full event + GPS ---
  {
    name: 'Aachener Weiher parkrun',
    slug: 'aachener-weiher-parkrun',
    description: 'Kostenloser 5-km-Lauf jeden Samstag – Teil des weltweiten parkrun-Netzwerks.',
    instagram: 'aachenerweiherparkrun',
    website: 'https://www.parkrun.com.de/aachenerweiher',
    color: '#27AE60',
    location: { latitude: 50.934298, longitude: 6.927553, name: 'Aachener Weiher Köln' },
    event: { title: 'Aachener Weiher parkrun', dayOfWeek: 'saturday', time: '09:00' },
  },
  {
    name: 'Cologne Running Crew',
    slug: 'cologne-running-crew',
    description: 'Wöchentlicher 10-km-Mittwochslauf ab Bunert.',
    instagram: 'colognerunningcrew',
    color: '#1A5276',
    location: { latitude: 50.936411, longitude: 6.920288, name: 'Bunert Köln' },
    event: { title: 'Cologne Running Crew', dayOfWeek: 'wednesday', time: '20:00' },
  },
  {
    name: 'Rheinpark parkrun',
    slug: 'rheinpark-parkrun',
    description: 'Kostenloser 5-km-Lauf jeden Samstag im Rheinpark – Teil des weltweiten parkrun-Netzwerks.',
    instagram: 'rheinparkparkrun',
    website: 'https://www.parkrun.com.de/rheinpark',
    color: '#1E8449',
    location: { latitude: 50.945886, longitude: 6.969983, name: 'Rheinpark Köln' },
    event: { title: 'Rheinpark parkrun', dayOfWeek: 'saturday', time: '09:00' },
  },
  {
    name: 'Frontrunners Cologne',
    slug: 'frontrunners-cologne',
    description: 'Zweimal wöchentlicher Lauftreff – montags und mittwochs.',
    instagram: 'frontrunnerscologne',
    website: 'https://www.frontrunners-cologne.de/',
    color: '#E67E22',
    location: { latitude: 50.934199, longitude: 6.919733, name: 'Treffpunkt Frontrunners Cologne' },
    event: {
      title: 'Frontrunners Cologne',
      dayOfWeek: 'monday',
      time: '19:00',
      extraSlots: [{ dayOfWeek: 'wednesday', time: '19:00' }],
    },
  },
  {
    name: 'OFFTRACK',
    slug: 'offtrack',
    description: 'Social Run Club mit zwei wöchentlichen Läufen – mittwochs bei RYZON und sonntags an der Brüssler.',
    instagram: 'offtrack_cologne',
    website: 'https://www.strava.com/clubs/OFFTRACK',
    color: '#2C3E50',
    location: { latitude: 50.938052, longitude: 6.935776, name: 'RYZON Köln' },
    event: {
      title: 'OFFTRACK',
      dayOfWeek: 'wednesday',
      time: '18:30',
      extraSlots: [{ dayOfWeek: 'sunday', time: '10:00' }],
    },
  },
  {
    name: 'Her Run Cologne',
    slug: 'her-run-cologne',
    description: 'Laufgruppe für Frauen am Aachener Weiher – fortgeschritten jeden Sonntag, Einsteiger bi-monatlich.',
    instagram: 'her_run_cologne',
    color: '#E91E8C',
    location: { latitude: 50.934431, longitude: 6.925791, name: 'Aachener Weiher, Japanisches Kulturinstitut Köln' },
    event: {
      title: 'Her Run Cologne',
      dayOfWeek: 'sunday',
      time: '10:00',
      scheduleNote: 'Fortgeschrittene: jeden Sonntag 10:00 Uhr (5 km). Einsteiger: 2. und 4. Sonntag im Monat 13:00 Uhr (3 km).',
      extraSlots: [{ dayOfWeek: 'sunday', time: '13:00' }],
    },
  },
  {
    name: 'Pace & Power CGN',
    slug: 'pace-power-cgn',
    description: 'Wöchentlicher Dienstagslauf entlang der Lindenthaler Kanäle (6–8 km).',
    instagram: 'pace.und.power',
    color: '#8E44AD',
    location: { latitude: 50.933462, longitude: 6.935066, name: 'Kölschbar, Lindenstraße 56 Köln' },
    event: { title: 'Pace & Power CGN', dayOfWeek: 'tuesday', time: '18:30' },
  },
  {
    name: 'unityruncologne',
    slug: 'unityruncologne',
    description: 'Queer-freundlicher Mittwochslauf – 9 km ab dem 21run Store.',
    instagram: 'unityruncologne',
    color: '#FF6B35',
    location: { latitude: 50.940424, longitude: 6.936926, name: '21run Store Köln' },
    event: { title: 'unityruncologne', dayOfWeek: 'wednesday', time: '18:30' },
  },
  {
    name: 'KRAFT Runners Köln',
    slug: 'kraft-runners-koeln',
    description: 'Wöchentlicher Donnerstagslauf ab Das Zappas.',
    instagram: 'kraftrunners',
    website: 'https://kraftrunners.de/koeln',
    color: '#C0392B',
    location: { latitude: 50.933793, longitude: 6.932753, name: 'Das Zappas Köln' },
    event: { title: 'KRAFT Runners Köln', dayOfWeek: 'thursday', time: '19:30' },
  },
  {
    name: 'OACE x TRU 10 AM Running Club',
    slug: 'oace-x-tru-10-am-running-club',
    description: 'Samstäglicher Lauf ab Maora Matcha & Coffee – 5 km oder 6 km.',
    instagram: 'oace_sports',
    color: '#17A589',
    location: { latitude: 50.93674, longitude: 6.942078, name: 'Maora Matcha & Coffee, Mittelstraße 23 Köln' },
    event: { title: 'OACE x TRU 10 AM Running Club', dayOfWeek: 'saturday', time: '10:00' },
  },
  {
    name: 'Morning Miles',
    slug: 'morning-miles',
    description: 'Frühmorgens laufen am Freitag – ab Lindenthaler Kanäle.',
    instagram: 'morningmilescgn',
    color: '#E74C3C',
    location: { latitude: 50.934969, longitude: 6.923942, name: 'Lindenthaler Kanäle, Istituto Italiano Köln' },
    event: { title: 'Morning Miles', dayOfWeek: 'friday', time: '06:45' },
  },
  {
    name: 'SRC | SOCIAL RUN COLOGNE',
    slug: 'src-social-run-cologne',
    description: 'Sonntäglicher Long Run ab Haus am See.',
    instagram: 'socialruncgn',
    color: '#2E86C1',
    location: { latitude: 50.918569, longitude: 6.888089, name: 'Haus am See Köln' },
    event: { title: 'SRC | Social Run Cologne – Long Run', dayOfWeek: 'sunday', time: '10:00' },
  },
  {
    name: 'ømtra',
    slug: 'omtra',
    description: '„One movement to reconnect all" – montäglicher 8-km-Lauf ab Hültzplatz.',
    instagram: 'omtra.community',
    color: '#145A32',
    location: { latitude: 50.934327, longitude: 6.90458, name: 'Hültzplatz, 50933 Köln' },
    event: { title: 'ømtra', dayOfWeek: 'monday', time: '18:00' },
  },
  {
    name: 'PALS coffee & run club',
    slug: 'pals-coffee-run-club',
    description: 'Samstäglicher Lauftreff am Holzmarkt – jeden Samstag um 10:30 Uhr.',
    instagram: 'pals_club_cgn',
    color: '#6E2C0E',
    location: { latitude: 50.931656, longitude: 6.962317, name: 'Holzmarkt 59-65, 50676 Köln' },
    event: { title: 'PALS coffee & run club', dayOfWeek: 'saturday', time: '10:30' },
  },
  {
    name: 'athlx',
    slug: 'athlx',
    description: 'Mittwochsfrühläufe ab GuMo Cafe – 6 km bei 6:00 min/km.',
    instagram: 'athlxclub',
    website: 'https://athlxclub.com',
    color: '#0E86D4',
    location: { latitude: 50.940249, longitude: 6.93819, name: 'GuMo Cafe Köln' },
    event: { title: 'athlx', dayOfWeek: 'wednesday', time: '07:00' },
  },
  {
    name: 'Date with Zone 2',
    slug: 'date-with-zone-2',
    description: '„Self-love through endurance sports" – samstäglicher Lauf ab 21run Store.',
    instagram: 'datewithzone2',
    color: '#48C9B0',
    location: { latitude: 50.940424, longitude: 6.936926, name: '21run, Antwerpener Str. 6-12 Köln' },
    event: { title: 'Date with Zone 2', dayOfWeek: 'saturday', time: '10:00' },
  },
  {
    name: 'w1nnas run club',
    slug: 'w1nnas-run-club',
    description: 'Wöchentlicher Montagslauf ab Händelstraße 25.',
    instagram: 'w1nnas.runclub',
    website: 'https://w1nnas.com/',
    color: '#EC407A',
    location: { latitude: 50.925635, longitude: 6.925474, name: 'Händelstraße 25, Köln' },
    event: { title: 'w1nnas run club', dayOfWeek: 'monday', time: '18:45' },
  },
  // --- Full event, no GPS ---
  {
    name: 'RFL | RUN FOR LOVE',
    slug: 'rfl-run-for-love-koeln',
    description: 'Social Run Club in Köln – montags und samstags an zwei festen Treffpunkten.',
    instagram: 'runforlove.koeln',
    website: 'https://runforlove.de/',
    color: '#B71C1C',
    event: {
      title: 'RFL | Run for Love',
      dayOfWeek: 'monday',
      time: '19:00',
      extraSlots: [{ dayOfWeek: 'saturday', time: '11:00' }],
    },
  },
  {
    name: 'One Move Running Club',
    slug: 'one-move-running-club',
    description: 'Samstäglicher 5-km-Lauf ab St. Maria Königin Südpark.',
    instagram: '1move.de',
    website: 'https://1move.de/',
    color: '#8BC34A',
    event: { title: 'One Move Running Club', dayOfWeek: 'saturday', time: '10:00' },
  },
  {
    name: 'Young Runners Club',
    slug: 'young-runners-club',
    description: '„Crew over competition" – samstäglicher 10-AM-Lauf in Köln.',
    instagram: 'youngrunners_club',
    color: '#3F51B5',
    event: { title: 'Young Runners Club', dayOfWeek: 'saturday', time: '10:00' },
  },
  // --- Partial events (manual follow-up needed) ---
  {
    name: 'Gaffel Lauffreunde',
    slug: 'gaffel-lauffreunde',
    description: 'Zweiwöchentlicher Donnerstagslauf mit anschließendem Kölsch – über 250 Teilnehmer.',
    instagram: 'gaffel_koelsch',
    website: 'https://gaffel.de/erleben/lauffreunde/',
    color: '#F39C12',
    location: { latitude: 50.942195, longitude: 6.971049, name: 'Rheinufer Köln' },
    event: {
      title: 'Gaffel Lauffreunde',
      dayOfWeek: 'thursday',
      scheduleNote: 'Findet alle zwei Wochen statt. Genaue Uhrzeit bitte manuell ergänzen.',
    },
  },
  {
    name: 'We Run This Cologne',
    slug: 'we-run-this-cologne',
    description: 'Zweiwöchentlicher Lauf – montags oder mittwochs um 17:30 Uhr ab Charles-de-Gaulle-Platz.',
    instagram: 'werunthiscologne',
    color: '#7B241C',
    location: { latitude: 50.942195, longitude: 6.971049, name: 'Charles-de-Gaulle-Platz 1, Köln' },
    event: {
      title: 'We Run This Cologne',
      dayOfWeek: 'monday',
      time: '17:30',
      scheduleNote: 'Findet alle zwei Wochen statt (abwechselnd Mo oder Mi um 17:30 Uhr).',
    },
  },
  {
    name: 'EDU RUN CLUB',
    slug: 'edu-run-club-by-deutsche-sportakademie',
    description: '„Education meets running" – zweiwöchentliche Läufe entlang der Poller Wiesen, kostenlos.',
    instagram: 'edurunclub',
    website: 'https://www.deutschesportakademie.de/edu-run-club',
    color: '#2980B9',
    location: { latitude: 50.916524, longitude: 6.985918, name: 'Poller Wiesen Köln' },
    event: {
      title: 'EDU RUN CLUB',
      time: '18:00',
      scheduleNote: 'Findet alle paar Wochen statt. Genauer Wochentag bitte manuell ergänzen.',
    },
  },
  {
    name: 'moment.um | run',
    slug: 'moment-um-run',
    description: '„Let\'s run. Let\'s grow. Let\'s build momentum." – sonntäglicher Lauf ab Radix & Anima.',
    instagram: 'moment.um_run',
    color: '#616A6B',
    location: { latitude: 50.957525, longitude: 6.993906, name: 'Radix & Anima Köln' },
    event: {
      title: 'moment.um | run',
      dayOfWeek: 'sunday',
      scheduleNote: 'Genaue Uhrzeit bitte manuell ergänzen.',
    },
  },
  {
    name: 'Gutenachtlauf Köln',
    slug: 'gutenachtlauf-koeln',
    description: 'Lauf für den Tierschutz – immer bei Vollmond um 20:30 Uhr.',
    instagram: 'gutenachtlauf_koeln',
    website: 'https://laufengegenleiden.de/gutenachtlauf',
    color: '#1B2631',
    location: { latitude: 50.941891, longitude: 6.972939, name: 'Charles-de-Gaulle-Platz/Auenweg, Deutz Köln' },
    event: {
      title: 'Gutenachtlauf Köln',
      time: '20:30',
      scheduleNote: 'Findet immer bei Vollmond statt. Genauer Termin bitte manuell ergänzen.',
    },
  },
  {
    name: 'Milers Colonia',
    slug: 'milers-colonia',
    description: 'Run Club & Community mit fünf verschiedenen Session-Typen pro Woche.',
    instagram: 'milerscolonia',
    website: 'https://milers.run/',
    color: '#1B5E20',
    event: {
      title: 'Milers Colonia',
      scheduleNote: 'Mehrere Sessions pro Woche: Mo (Athletic), Mi (Track), Do (After Work), Sa (Tempo), So (Long Run). Uhrzeiten und Treffpunkte bitte manuell ergänzen.',
    },
  },
  {
    name: '6:30/6:30',
    slug: '6-30-6-30',
    description: '„Early miles. Good vibes." – 6:30-Uhr-Morgenläufe, 6,3 km.',
    instagram: '630runningclub',
    website: 'https://www.strava.com/clubs/1968321',
    color: '#F1C40F',
    event: {
      title: '6:30/6:30',
      time: '06:30',
      scheduleNote: 'Wochentag bitte manuell ergänzen.',
    },
  },
  // --- Organizer only ---
  {
    name: '08/15 RUNCLUB',
    slug: '08-15-runclub',
    description: 'Social Run Club in Köln – Termine über Instagram.',
    instagram: 'koelnistkool.space',
    color: '#607D8B',
  },
  {
    name: 'AI Run Club',
    slug: 'ai-run-club',
    description: 'Run Club für AI-People in Köln – „The only AI meetup where you need running shoes."',
    instagram: 'runningclub.ai',
    color: '#0288D1',
  },
  {
    name: 'Iranian Sport Club',
    slug: 'iranian-sport-club',
    description: 'Iranian Runners Community in Köln und Düsseldorf.',
    instagram: 'runiranclub',
    color: '#2ECC71',
  },
  {
    name: 'NO DAYS OFF',
    slug: 'no-days-off',
    description: 'Social Run Club in Köln, Berlin und Düsseldorf.',
    instagram: 'ndoclub',
    color: '#212121',
  },
  {
    name: 'Rhein Ballern Runners',
    slug: 'rhein-ballern-runners',
    description: '„Running is the new Party" – ambitionierte Laufcrew aus Köln.',
    instagram: 'rheinballernrunners',
    color: '#00C853',
  },
  {
    name: 'Run Squad CGN',
    slug: 'run-squad-cgn',
    description: 'Kölner Laufcrew seit 2015 – „We don\'t stop when we\'re tired, we stop when we\'re done!"',
    instagram: 'runsquadcgn',
    color: '#37474F',
  },
  {
    name: 'SheRun Cologne',
    slug: 'sherun-cologne',
    description: 'Frauenlaufgruppe in Köln-Sülz – zurück ins Laufen ohne Druck.',
    instagram: 'sheruns_cgn',
    color: '#F06292',
  },
  {
    name: 'Trail Running Cologne',
    slug: 'trail-running-cologne',
    description: 'Trailrunning-Community im Raum Köln – Siebengebirge, Rheinhöhen, Ahr und Bergisches.',
    instagram: 'trailrunning_cologne',
    website: 'https://www.strava.com/clubs/184995',
    color: '#795548',
  },
  {
    name: 'OSC - onma sports club',
    slug: 'osc-onma-sports-club',
    description: '„Laufen, quatschen, connecten. Danach ein Wein." – After-Work-Community mit Laufen, Padel und Pilates.',
    instagram: 'onmasportsclub',
    color: '#880E4F',
  },
]

type ImportResult = {
  name: string
  status: 'created' | 'skipped' | 'error'
  hasEvent: boolean
  needsManualFollowUp: boolean
  note?: string
  error?: string
}

async function downloadLogo(slug: string): Promise<ArrayBuffer | null> {
  const url = `https://socialrunclubs.de/koeln/${slug}/img.jpg`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.log(`  ⚠️  Logo not found (${res.status}): ${url}`)
      return null
    }
    return await res.arrayBuffer()
  } catch (err) {
    console.log(`  ⚠️  Logo download failed: ${err}`)
    return null
  }
}

async function uploadLogo(organizerId: string, buffer: ArrayBuffer): Promise<void> {
  const { error } = await supabase.storage
    .from('organizers')
    .upload(`${organizerId}/logo`, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  if (error) {
    console.log(`  ⚠️  Logo upload failed: ${error.message}`)
  } else {
    console.log(`  🖼️  Logo uploaded`)
  }
}

async function importClub(club: RunClubData): Promise<ImportResult> {
  const result: ImportResult = {
    name: club.name,
    status: 'created',
    hasEvent: !!club.event,
    needsManualFollowUp: false,
  }

  // Duplicate check
  const { data: existing } = await supabase
    .from('organizers')
    .select('id')
    .eq('slug', club.slug)
    .maybeSingle()

  if (existing) {
    result.status = 'skipped'
    result.note = 'already exists'
    return result
  }

  if (DRY_RUN) {
    const eventDesc = club.event
      ? `event: ${club.event.dayOfWeek ?? '?'} ${club.event.time ?? 'time TBD'}`
      : 'organizer only'
    console.log(`  [dry-run] Would create organizer + ${eventDesc}`)
    if (club.location) {
      const addr = await reverseGeocodeScript(club.location.latitude, club.location.longitude)
      if (addr) {
        const formatted = [addr.street, addr.house_number].filter(Boolean).join(' ')
        console.log(`  [dry-run] Address: ${formatted}, ${addr.postcode} ${addr.city}`)
      } else {
        console.log(`  [dry-run] Address: reverse geocode returned nothing`)
      }
    }
    if (club.event && (!club.event.time || club.event.scheduleNote)) {
      result.needsManualFollowUp = true
    }
    return result
  }

  // Create organizer
  const { data: organizer, error: orgError } = await supabase
    .from('organizers')
    .insert({
      name: club.name,
      slug: club.slug,
      description: club.description ?? null,
      instagram: club.instagram ?? null,
      website: club.website ?? null,
      color: club.color,
    })
    .select('id')
    .single()

  if (orgError || !organizer) {
    result.status = 'error'
    result.error = orgError?.message ?? 'unknown error'
    return result
  }

  console.log(`  ✅ Organizer created: ${organizer.id}`)

  // Logo download + upload
  const logoBuffer = await downloadLogo(club.slug)
  if (logoBuffer) {
    await uploadLogo(organizer.id, logoBuffer)
  }

  // Create event
  if (club.event) {
    const { event } = club

    let description = event.scheduleNote ?? null
    if (event.scheduleNote) {
      result.needsManualFollowUp = true
    }
    if (!event.time) {
      result.needsManualFollowUp = true
    }

    // Build recurring slots – primary slot only if day is known
    const slots: Array<{ day: string; start_time: string }> = []
    if (event.dayOfWeek && event.time) {
      slots.push({ day: event.dayOfWeek, start_time: event.time })
    } else if (event.dayOfWeek) {
      // Day known, time unknown – use placeholder so slot is still present
      slots.push({ day: event.dayOfWeek, start_time: '00:00' })
    }

    // Extra slots (e.g. running.fast.and.far weekend runs are only noted in description)
    if (event.extraSlots) {
      for (const s of event.extraSlots) {
        if (s.dayOfWeek && s.time) {
          slots.push({ day: s.dayOfWeek, start_time: s.time })
        }
      }
    }

    const schedule =
      slots.length > 0
        ? { type: 'recurring', slots }
        : { type: 'recurring', slots: [] }

    let inlineLocation: Record<string, unknown> | null = null
    if (club.location) {
      const addr = await reverseGeocodeScript(club.location.latitude, club.location.longitude)
      if (addr) {
        console.log(`  📍 Reverse geocoded: ${[addr.street, addr.house_number].filter(Boolean).join(' ')}, ${addr.postcode} ${addr.city}`)
      } else {
        console.log(`  ⚠️  Reverse geocoding returned nothing, using coords only`)
      }
      inlineLocation = {
        name: club.location.name,
        latitude: club.location.latitude,
        longitude: club.location.longitude,
        ...(addr?.street && { street: addr.street }),
        ...(addr?.house_number && { house_number: addr.house_number }),
        ...(addr?.postcode && { postcode: addr.postcode }),
        ...(addr?.city && { city: addr.city }),
        ...(addr?.district && { district: addr.district }),
        ...(addr?.county && { county: addr.county }),
        ...(addr?.state && { state: addr.state }),
        ...(addr?.country && { country: addr.country }),
      }
    }

    const { error: eventError } = await supabase.from('events').insert({
      title: event.title,
      description,
      sports: ['laufen'],
      event_type: 'session',
      status: 'active',
      moderation_status: 'pending',
      organizer_id: organizer.id,
      organizer_ids: [organizer.id],
      schedule,
      inline_location: inlineLocation,
      contact: {},
    })

    if (eventError) {
      console.log(`  ⚠️  Event creation failed: ${eventError.message}`)
      result.note = `organizer created, event failed: ${eventError.message}`
    } else {
      console.log(`  📅 Event created`)
    }
  }

  return result
}

async function main() {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no database writes\n')
  }

  const results: ImportResult[] = []

  for (const club of RUN_CLUBS) {
    console.log(`\n[${RUN_CLUBS.indexOf(club) + 1}/${RUN_CLUBS.length}] ${club.name}`)
    const result = await importClub(club)
    results.push(result)

    if (result.status === 'skipped') {
      console.log(`  ⏭️  Skipped — ${result.note}`)
    } else if (result.status === 'error') {
      console.log(`  ❌ Error — ${result.error}`)
    }
  }

  // Summary table
  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary\n')
  console.log('Club'.padEnd(35) + 'Status'.padEnd(10) + 'Event'.padEnd(8) + 'Follow-up')
  console.log('-'.repeat(60))
  for (const r of results) {
    const status = r.status === 'created' ? '✅' : r.status === 'skipped' ? '⏭️ ' : '❌'
    const event = r.hasEvent ? '✅' : '—'
    const followUp = r.needsManualFollowUp ? '⚠️ ' : ''
    console.log(r.name.padEnd(35) + status.padEnd(10) + event.padEnd(8) + followUp)
  }

  const manualFollowUp = results.filter(r => r.needsManualFollowUp || !r.hasEvent)
  if (manualFollowUp.length > 0) {
    console.log('\n⚠️  Needs manual follow-up:')
    for (const r of manualFollowUp) {
      const reason = !r.hasEvent ? 'no schedule data' : 'time/day incomplete'
      console.log(`  • ${r.name} — ${reason}`)
    }
  }

  const created = results.filter(r => r.status === 'created').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error').length
  console.log(`\nCreated: ${created}  Skipped: ${skipped}  Errors: ${errors}`)
}

main().catch(err => {
  console.error('💥 Fatal:', err)
  process.exit(1)
})
