import Link from 'next/link'
import { Metadata } from 'next'
import { getSportCounts } from '@/lib/supabase/seo-queries'
import { sportToSlug } from '@/lib/utils/seo-slugs'
import { sportIcons, sportNames } from '@/lib/utils/sport-utils'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Sportplätze in Deutschland | OpenSportMap',
  description:
    'Finde Sportplätze für Basketball, Fußball, Tennis, Volleyball und viele weitere Sportarten. Interaktive Karte mit allen Plätzen in Deutschland, Österreich und der Schweiz.',
}

export default async function OrtePage() {
  const sports = await getSportCounts()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Sportplätze in Deutschland',
    description: 'Übersicht aller Sportarten und Sportplätze auf OpenSportMap',
    url: 'https://opensportmap.de/orte',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Sportplätze entdecken</h1>
          <p className="text-muted-foreground">
            Wähle eine Sportart, um alle Plätze in deiner Region zu finden.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {sports.map(({ sport, count }) => {
            const slug = sportToSlug[sport]
            if (!slug) return null
            return (
              <Link
                key={sport}
                href={`/orte/${slug}`}
                className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
              >
                <span className="text-2xl">{sportIcons[sport] ?? '📍'}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{sportNames[sport] ?? sport}</p>
                  <p className="text-xs text-muted-foreground">{count} Plätze</p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* CTA */}
        <div className="rounded-xl border p-4 bg-card space-y-2 text-center">
          <p className="text-sm font-medium">Kennst du einen Platz, der noch fehlt?</p>
          <p className="text-xs text-muted-foreground">
            Trag ihn kostenlos ein – ohne Anmeldung.
          </p>
          <a
            href="/new"
            className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 hover:no-underline"
          >
            Jetzt Platz eintragen →
          </a>
        </div>
      </div>
    </>
  )
}
