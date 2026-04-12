import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { sportPlural, toSlug, sportToSlug } from '@/lib/utils/seo-slugs'
import {
  resolveCitySlug,
  getListingPlacesCity,
  getAllCitiesForSport,
  getAllPlacesInCityForMapBySport,
  getOtherSportsInCity,
  getCityCombosStatic,
  getCityPlaceCount,
  getCityCenter,
  MIN_PLACES,
  PAGE_SIZE,
} from '@/lib/supabase/seo-queries'
import { sportIcons } from '@/lib/utils/sport-utils'
import Breadcrumb from '@/components/seo/breadcrumb'
import PlaceListCard from '@/components/seo/place-list-card'
import ListingMap from '@/components/seo/listing-map'
import FaqSection, { buildListingFaq } from '@/components/seo/faq-section'
import Pagination from '@/components/seo/pagination'

export const revalidate = 86400

interface PageProps {
  params: Promise<{ stadt: string; sport: string }>
  searchParams: Promise<{ seite?: string }>
}

export async function generateStaticParams() {
  const combos = await getCityCombosStatic()
  return combos.map(c => ({
    stadt: toSlug(c.city),
    sport: sportToSlug[c.sport] ?? toSlug(c.sport),
  }))
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { stadt: stadtSlug, sport: sportSlug } = await params
  const { seite } = await searchParams
  const page = Math.max(1, Number(seite ?? '1'))

  const resolved = await resolveCitySlug(sportSlug, stadtSlug)
  if (!resolved) return {}

  const total = await getCityPlaceCount(resolved.sport, resolved.city)
  if (total < MIN_PLACES) {
    return { robots: { index: false, follow: false } }
  }

  const plural = sportPlural[resolved.sport] ?? resolved.sport
  const city = resolved.city
  const year = new Date().getFullYear()
  const basePath = `/orte/${stadtSlug}/${sportSlug}`

  return {
    title: `${plural} in ${city} | OpenSportMap`,
    description: `Alle ${plural} in ${city} (${year}). Mit Adresse, Ausstattung und interaktiver Karte. Kostenlos & aktuell.`,
    alternates: {
      canonical: page === 1 ? basePath : `${basePath}?seite=${page}`,
    },
  }
}

export default async function CityListingPage({ params, searchParams }: PageProps) {
  const { stadt: stadtSlug, sport: sportSlug } = await params
  const { seite } = await searchParams
  const page = Math.max(1, Number(seite ?? '1'))

  const resolved = await resolveCitySlug(sportSlug, stadtSlug)
  if (!resolved) notFound()

  const { sport, city } = resolved
  const plural = sportPlural[sport] ?? sport
  const icon = sportIcons[sport] ?? '📍'
  const year = new Date().getFullYear()
  const basePath = `/orte/${stadtSlug}/${sportSlug}`

  const [{ places, total }, mapPlaces, otherCities, otherSports, cityCenter] = await Promise.all([
    getListingPlacesCity({ sport, city, page }),
    getAllPlacesInCityForMapBySport(city, sport),
    getAllCitiesForSport(sport, MIN_PLACES).then(cities =>
      cities.filter(c => c.city !== city).slice(0, 12),
    ),
    getOtherSportsInCity(city, sport),
    getCityCenter(city),
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${total} ${plural} in ${city} (${year})`,
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
            { label: city, href: `/orte/${stadtSlug}` },
            { label: plural },
          ]}
        />

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            {total} {plural} in {city} ({year})
          </h1>
          <p className="text-muted-foreground text-sm">
            Alle Plätze auf einer Karte – mit Adresse und Details.
          </p>
        </div>

        {/* Map */}
        <ListingMap places={mapPlaces} height="280px" center={cityCenter ?? undefined} />

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
              <span>{icon}</span>
              Entdecke noch mehr {plural}
            </a>
          )
        })()}

        {/* Place list */}
        <div className="space-y-2">
          {places.map(place => (
            <PlaceListCard key={place.id} place={place} primarySport={sport} />
          ))}
        </div>

        <Pagination total={total} currentPage={page} basePath={basePath} />

        <p className="text-xs text-muted-foreground text-right">
          Zuletzt aktualisiert:{' '}
          {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </p>

        <hr className="border-border" />

        <FaqSection
          items={buildListingFaq({ plural, location: city, count: total })}
        />

        <hr className="border-border" />

        {/* Internal links */}
        <div className="space-y-5">
          {/* Other sports in same city */}
          {otherSports.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Weitere Sportarten in {city}
              </h2>
              <div className="flex flex-wrap gap-2">
                {otherSports.map(({ sport: s, count }) => {
                  const slug = sportToSlug[s]
                  if (!slug) return null
                  return (
                    <Link
                      key={s}
                      href={`/orte/${stadtSlug}/${slug}`}
                      className="text-sm px-3 py-1.5 rounded-full border hover:bg-accent/50 transition-colors flex items-center gap-1"
                    >
                      <span>{sportIcons[s] ?? ''}</span>
                      {sportPlural[s] ?? s}{' '}
                      <span className="text-muted-foreground text-xs">({count})</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Same sport in other cities */}
          {otherCities.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {plural} in anderen Städten
              </h2>
              <div className="flex flex-wrap gap-2">
                {otherCities.map(({ city: c, count }) => (
                  <Link
                    key={c}
                    href={`/orte/${toSlug(c)}/${sportSlug}`}
                    className="text-sm px-3 py-1.5 rounded-full border hover:bg-accent/50 transition-colors"
                  >
                    {c}{' '}
                    <span className="text-muted-foreground text-xs">({count})</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Back links */}
          <section className="space-y-1">
            <Link
              href={`/orte/${stadtSlug}`}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Alle Sportplätze in {city}
            </Link>
            <Link
              href="/orte"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Alle Städte
            </Link>
          </section>
        </div>

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
