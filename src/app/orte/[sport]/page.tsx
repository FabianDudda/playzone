import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { slugToSport, sportPlural, toSlug } from '@/lib/utils/seo-slugs'
import { getAllCitiesForSport } from '@/lib/supabase/seo-queries'
import { sportIcons } from '@/lib/utils/sport-utils'
import Breadcrumb from '@/components/seo/breadcrumb'

export const revalidate = 86400

interface PageProps {
  params: Promise<{ sport: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sport: sportSlug } = await params
  const sport = slugToSport[sportSlug]
  if (!sport) return {}
  const plural = sportPlural[sport] ?? sport

  return {
    title: `${plural} in Deutschland | OpenSportMap`,
    description: `Alle Städte mit ${plural} auf OpenSportMap. Wähle eine Stadt um alle Plätze mit Karte und Details zu sehen.`,
  }
}

export default async function SportHubPage({ params }: PageProps) {
  const { sport: sportSlug } = await params
  const sport = slugToSport[sportSlug]
  if (!sport) notFound()

  const plural = sportPlural[sport] ?? sport
  const icon = sportIcons[sport] ?? '📍'

  const cities = await getAllCitiesForSport(sport)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${plural} in Deutschland`,
    url: `https://opensportmap.de/orte/${sportSlug}`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Breadcrumb
          items={[
            { label: 'OpenSportMap', href: '/' },
            { label: 'Sportplätze', href: '/orte' },
            { label: plural },
          ]}
        />

        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>{icon}</span> {plural}
          </h1>
          <p className="text-muted-foreground text-sm">
            {cities.reduce((s, c) => s + c.count, 0)} Plätze in {cities.length}{' '}
            {cities.length === 1 ? 'Stadt' : 'Städten'}
          </p>
        </div>

        {cities.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Noch keine Plätze mit Standortdaten vorhanden.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {cities.map(({ city, count }) => (
              <Link
                key={city}
                href={`/orte/${sportSlug}/${toSlug(city)}`}
                className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
              >
                <span className="text-sm font-medium">{city}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </Link>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-right">
          Zuletzt aktualisiert:{' '}
          {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </p>

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
