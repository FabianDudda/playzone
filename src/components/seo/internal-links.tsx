import Link from 'next/link'
import { sportPlural, sportToSlug, toSlug } from '@/lib/utils/seo-slugs'
import { sportIcons } from '@/lib/utils/sport-utils'

interface InternalLinksProps {
  currentSport: string       // DB enum value
  landSlug: string
  bundeslandSlug?: string
  otherCitiesInState?: { city: string; count: number }[]
  otherStates?: { state: string; count: number }[]
  otherSportsInCity?: { sport: string; count: number }[]
  currentLocation: string    // human-readable label for "in X" text
}

export default function InternalLinks({
  currentSport,
  landSlug,
  bundeslandSlug,
  otherCitiesInState = [],
  otherStates = [],
  otherSportsInCity = [],
  currentLocation,
}: InternalLinksProps) {
  const sportSlug = sportToSlug[currentSport]
  const plural = sportPlural[currentSport] ?? currentSport

  const baseSportPath = `/orte/${sportSlug}/${landSlug}`

  return (
    <div className="space-y-5">
      {/* Other cities in same bundesland */}
      {otherCitiesInState.length > 0 && bundeslandSlug && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {plural} in anderen Städten
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherCitiesInState.map(({ city, count }) => (
              <Link
                key={city}
                href={`${baseSportPath}/${bundeslandSlug}/${toSlug(city)}`}
                className="text-sm px-3 py-1.5 rounded-full border hover:bg-accent/50 transition-colors"
              >
                {city}{' '}
                <span className="text-muted-foreground text-xs">({count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Other bundesländer with same sport */}
      {otherStates.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {plural} in anderen Bundesländern
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherStates.map(({ state, count }) => (
              <Link
                key={state}
                href={`${baseSportPath}/${toSlug(state)}`}
                className="text-sm px-3 py-1.5 rounded-full border hover:bg-accent/50 transition-colors"
              >
                {state}{' '}
                <span className="text-muted-foreground text-xs">({count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Other sports in same city */}
      {otherSportsInCity.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Weitere Sportarten in {currentLocation}
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherSportsInCity.map(({ sport, count }) => {
              const slug = sportToSlug[sport]
              if (!slug || !bundeslandSlug) return null
              return (
                <Link
                  key={sport}
                  href={`/orte/${slug}/${landSlug}/${bundeslandSlug}/${toSlug(currentLocation)}`}
                  className="text-sm px-3 py-1.5 rounded-full border hover:bg-accent/50 transition-colors flex items-center gap-1"
                >
                  <span>{sportIcons[sport] ?? ''}</span>
                  {sportPlural[sport] ?? sport}{' '}
                  <span className="text-muted-foreground text-xs">({count})</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Back to parent hubs */}
      <section className="space-y-1 pt-1">
        {bundeslandSlug && (
          <Link
            href={`${baseSportPath}/${bundeslandSlug}`}
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Alle {plural} im Bundesland
          </Link>
        )}
        <Link
          href={baseSportPath}
          className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Alle {plural} in Deutschland
        </Link>
        <Link
          href="/orte"
          className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Alle Sportarten
        </Link>
      </section>
    </div>
  )
}
