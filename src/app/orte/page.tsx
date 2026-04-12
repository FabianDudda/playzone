import Link from 'next/link'
import { Metadata } from 'next'
import { getCityList } from '@/lib/supabase/seo-queries'
import { toSlug } from '@/lib/utils/seo-slugs'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Sportplätze in Deutschland | OpenSportMap',
  description:
    'Finde Sportplätze in deiner Stadt. Basketball, Fußball, Tennis, Volleyball und viele weitere Sportarten in Deutschland, Österreich und der Schweiz.',
  alternates: { canonical: '/orte' },
}

export default async function OrtePage() {
  const cities = await getCityList()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Sportplätze in Deutschland',
    description: 'Übersicht aller Städte mit Sportplätzen auf OpenSportMap',
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
            Wähle eine Stadt, um alle Sportplätze in deiner Region zu finden.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cities.map(({ city, count }) => (
            <Link
              key={city}
              href={`/orte/${toSlug(city)}`}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{city}</p>
                <p className="text-xs text-muted-foreground">{count} Plätze</p>
              </div>
              <span className="text-muted-foreground shrink-0 ml-2">→</span>
            </Link>
          ))}
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
