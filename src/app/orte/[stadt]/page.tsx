import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { toSlug, sportToSlug, sportPlural } from '@/lib/utils/seo-slugs'
import {
  resolveCitySlugOnly,
  getAllPlacesInCity,
  getAllPlacesInCityForMap,
  getSportsInCity,
  getCityListStatic,
  getCityCenter,
  MIN_PLACES,
  PAGE_SIZE,
} from '@/lib/supabase/seo-queries'
import { sportIcons } from '@/lib/utils/sport-utils'
import Breadcrumb from '@/components/seo/breadcrumb'
import PlaceListCard from '@/components/seo/place-list-card'
import ListingMap from '@/components/seo/listing-map'
import FaqSection from '@/components/seo/faq-section'
import Pagination from '@/components/seo/pagination'

export const revalidate = 86400

interface PageProps {
  params: Promise<{ stadt: string }>
  searchParams: Promise<{ seite?: string }>
}

export async function generateStaticParams() {
  const cities = await getCityListStatic()
  return cities.map(({ city }) => ({ stadt: toSlug(city) }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { stadt: stadtSlug } = await params
  const city = await resolveCitySlugOnly(stadtSlug)
  if (!city) return {}

  const year = new Date().getFullYear()

  const description = `Alle Sportplätze in ${city} – Basketball, Volleyball, Tennis und mehr. Mit interaktiver Karte, Adressen und Details. Kostenlos & aktuell.`

  return {
    title: `Sportplätze in ${city} (${year}) | OpenSportMap`,
    description,
    alternates: { canonical: `/orte/${stadtSlug}` },
    openGraph: {
      title: `Sportplätze in ${city} (${year}) | OpenSportMap`,
      description,
      url: `/orte/${stadtSlug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Sportplätze in ${city} | OpenSportMap`,
      description,
    },
  }
}

export default async function CityHubPage({ params, searchParams }: PageProps) {
  const { stadt: stadtSlug } = await params
  const { seite } = await searchParams
  const page = Math.max(1, Number(seite ?? '1'))

  const city = await resolveCitySlugOnly(stadtSlug)
  if (!city) notFound()

  const year = new Date().getFullYear()
  const basePath = `/orte/${stadtSlug}`

  const [{ places, total }, mapPlaces, sports, cityCenter] = await Promise.all([
    getAllPlacesInCity({ city, page }),
    getAllPlacesInCityForMap(city),
    getSportsInCity(city),
    getCityCenter(city),
  ])

  if (total === 0) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Sportplätze in ${city} (${year})`,
    numberOfItems: total,
    url: `https://opensportmap.de${basePath}`,
    itemListElement: places.map((p, i) => ({
      '@type': 'ListItem',
      position: (page - 1) * PAGE_SIZE + i + 1,
      item: {
        '@type': 'SportsActivityLocation',
        name: p.name,
        url: `https://opensportmap.de/places/${p.id}`,
        geo: {
          '@type': 'GeoCoordinates',
          latitude: p.latitude,
          longitude: p.longitude,
        },
        address: {
          '@type': 'PostalAddress',
          ...(p.street && {
            streetAddress: [p.street, p.house_number].filter(Boolean).join(' '),
          }),
          addressLocality: city,
        },
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Breadcrumb
          items={[
            { label: 'OpenSportMap', href: '/' },
            { label: 'Sportplätze', href: '/orte' },
            { label: city },
          ]}
        />

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Sportplätze in {city} ({year})</h1>
          <p className="text-muted-foreground text-sm">
            {total} Plätze · {sports.length} Sportarten
          </p>
        </div>

        {/* Map with all city places */}
        <ListingMap places={mapPlaces} height="300px" center={cityCenter ?? undefined} />

        {mapPlaces.length > 0 && (() => {
          const lats = mapPlaces.map(p => p.latitude)
          const lngs = mapPlaces.map(p => p.longitude)
          const bbox = `${Math.min(...lats)},${Math.min(...lngs)},${Math.max(...lats)},${Math.max(...lngs)}`
          return (
            <a
              href={`/?bbox=${bbox}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <span>📍</span>
              Entdecke noch mehr Plätze
            </a>
          )
        })()}

        {/* Sport filter */}
        {sports.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nach Sportart filtern
            </p>
            <div className="flex flex-wrap gap-2">
              {sports.map(({ sport, count }) => {
                const slug = sportToSlug[sport]
                if (!slug) return null
                return (
                  <Link
                    key={sport}
                    href={`/orte/${stadtSlug}/${slug}`}
                    className="text-sm px-3 py-1.5 rounded-full border bg-card hover:bg-accent/50 transition-colors flex items-center gap-1"
                  >
                    <span>{sportIcons[sport] ?? ''}</span>
                    {sportPlural[sport] ?? sport}
                    <span className="text-muted-foreground text-xs ml-0.5">({count})</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Place list */}
        <div className="space-y-2">
          {places.map(place => (
            <PlaceListCard key={place.id} place={place} />
          ))}
        </div>

        <Pagination total={total} currentPage={page} basePath={basePath} />

        <p className="text-xs text-muted-foreground text-right">
          Zuletzt aktualisiert:{' '}
          {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </p>

        <hr className="border-border" />

        <FaqSection
          items={[
            {
              question: `Wie viele Sportplätze gibt es in ${city}?`,
              answer: `In ${city} gibt es aktuell ${total} Sportplätze in der Datenbank von OpenSportMap, darunter ${sports.map(s => sportPlural[s.sport] ?? s.sport).slice(0, 3).join(', ')} und mehr.`,
            },
            {
              question: `Welche Sportarten gibt es in ${city}?`,
              answer: `In ${city} findest du ${sports.length} verschiedene Sportarten: ${sports.map(s => sportPlural[s.sport] ?? s.sport).join(', ')}. Nutze die Filter oben, um nach einer bestimmten Sportart zu filtern.`,
            },
            {
              question: `Welche Sportplätze in ${city} sind kostenlos?`,
              answer: `Viele öffentliche Plätze in ${city} sind kostenlos zugänglich. Auf OpenSportMap erkennst du öffentliche Plätze am Badge "Öffentlich". Klick auf einen Platz für alle Details.`,
            },
            {
              question: `Kann ich einen fehlenden Platz in ${city} eintragen?`,
              answer: `Ja! Du kannst auf opensportmap.de kostenlos einen neuen Platz eintragen – ohne Anmeldung. Dein Beitrag wird geprüft und dann freigeschaltet.`,
            },
          ]}
        />

        <hr className="border-border" />

        <Link
          href="/orte"
          className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Alle Städte
        </Link>

        {/* CTA */}
        <div className="rounded-xl border p-4 bg-card space-y-2 text-center">
          <p className="text-sm font-medium">Kennst du einen Platz, der fehlt?</p>
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
