/**
 * Converts any string to a URL-safe slug.
 * Handles German umlauts and special characters.
 */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// DB sport enum value → URL slug (needed because fußball → fussball)
export const sportToSlug: Record<string, string> = {
  basketball:      'basketball',
  volleyball:      'volleyball',
  'fußball':       'fussball',
  tischtennis:     'tischtennis',
  beachvolleyball: 'beachvolleyball',
  tennis:          'tennis',
  badminton:       'badminton',
  squash:          'squash',
  hockey:          'hockey',
  spikeball:       'spikeball',
  boule:           'boule',
  skatepark:       'skatepark',
  calisthenics:    'calisthenics',
  laufen:          'laufen',
  schwimmen:       'schwimmen',
  klettern:        'klettern',
  padel:           'padel',
  schach:          'schach',
}

// URL slug → DB sport enum value
export const slugToSport: Record<string, string> = Object.fromEntries(
  Object.entries(sportToSlug).map(([dbVal, slug]) => [slug, dbVal])
)

// Plural display names used in H1 and titles
export const sportPlural: Record<string, string> = {
  basketball:      'Basketballplätze',
  volleyball:      'Volleyballplätze',
  'fußball':       'Fußballplätze',
  tennis:          'Tennisplätze',
  tischtennis:     'Tischtennisplatten',
  beachvolleyball: 'Beachvolleyballplätze',
  badminton:       'Badmintonhallen',
  squash:          'Squashhallen',
  hockey:          'Hockeyplätze',
  spikeball:       'Spikeballfelder',
  boule:           'Boulebahnen',
  skatepark:       'Skateparks',
  calisthenics:    'Calisthenics-Parks',
  laufen:          'Laufstrecken',
  schwimmen:       'Schwimmbäder',
  klettern:        'Kletterhallen',
  padel:           'Padel-Courts',
  schach:          'Schachplätze',
}

const COUNTRY_DISPLAY: Record<string, string> = {
  deutschland:  'Deutschland',
  oesterreich:  'Österreich',
  schweiz:      'Schweiz',
  germany:      'Deutschland',
  austria:      'Österreich',
  switzerland:  'Schweiz',
  de:           'Deutschland',
  at:           'Österreich',
  ch:           'Schweiz',
}

/** Return a human-readable country name given a raw DB value or slug. */
export function countryLabel(raw: string): string {
  return COUNTRY_DISPLAY[toSlug(raw)] ?? raw
}
