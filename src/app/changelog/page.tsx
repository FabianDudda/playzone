'use client'

import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'


const CHANGELOG = [
  {
    version: '0.3.5-alpha',
    date: '11.04.2026',
    current: true,
    items: [
      'implement functionality to upload more than 1 image per place',
      'add pages with place list sort by sport type and location',
      'admin dashboard functions: filter and google maps map view',
    ],
  },
  {
    version: '0.3.4-alpha',
    date: '03.04.2026',
    current: false,
    items: [
      'implement zoom to specific area function',
      'implement map widget for external website',
      'use geolocation api to show user current map area',
      'admin dashboard functions',
    ],
  },
  {
    version: '0.3.3-alpha',
    date: '31.03.2026',
    current: false,
    items: [
      'start clustering one zoom level later',
      'added pwa app install for android',
    ],
  },
  {
    version: '0.3.2-alpha',
    date: '30.03.2026',
    current: false,
    items: [
      'admin: fix edit sport types for places in pending places tab',
      'add field for other sport types',
    ],
  },
  {
    version: '0.3.1-alpha',
    date: '27.03.2026',
    current: false,
    items: [
      'added a blog page',
      'change contribution limit for guest to 20 per day',
    ],
  },
  {
    version: '0.3.0-alpha',
    date: '25.03.2026',
    current: false,
    items: [
      'contact details and opening hours added for all place types',
      'fix show password icon in sign-in & sign-up form',
      'fix: guest user now can upload images',
      'fix: if place title is too long, buttons get moved out of screen',
      'change place sheet ux: moved "bearbeiten" and "report" button inline in sheet, so that title has more space',
      'remove bottom sheets that ask for login (add place & edit place), since guest can do these actions too',
      'remove blue outline/shape of cluster',
      'added active state for place pin when selected',
      'added a new page "partner"',
      'admin dashboard: add pagination to tab "pending places", make position editable',
    ],
  },
  {
    version: '0.2.4-alpha',
    date: '19.03.2026',
    current: false,
    items: [
      'Fix website-url input',
      'Rework loading spinner',
      'Rework loading map'
    ],
  },
  {
    version: '0.2.3-alpha',
    date: '16.03.2026',
    current: false,
    items: [
      'Added new sport types: badminton, hockey, klettern and padel',
    ],
  },
  {
    version: '0.2.2-alpha',
    date: '15.03.2026',
    current: false,
    items: [
      'Added contact details, opening hours and description for places',
      'rework add-place and edit-place form for better ux',
    ],
  },
  {
    version: '0.2.1-alpha',
    date: '14.03.2026',
    current: false,
    items: [
      'Added a "About" page',
      'Added "Install app" button for android user',
      'Update "Häufige Fragen" page',
      'Performance fixes',
      'Edit /places/id layout',
      'Url now updates when place-sheet opens',
      'rework admin dashboard',
      'Added contact details and opening hours for places (only for vereine)',
      'rework add-place and edit-place form',
    ],
  },
  {
    version: '0.2.0-alpha',
    date: '13.03.2026',
    current: false,
    items: [
      'Added place type (Public / Club / School) with filter support on the map',
      'Guests can now add places and suggest edits – without an account, subject to admin approval',
    ],
  },
  {
    version: '0.1.4-alpha',
    date: '12.03.2026',
    current: false,
    items: [
      'Increased cluster radius from 50px to 100px for fewer, larger clusters  ',
      'Clusters now persist one zoom level deeper before expanding to individual pins  ',
      'Added place reporting: users (guests & logged in) can flag a place via a "Platz melden" sheet, with reports visible to admins ',
      'Added a "Daten" page listing all imported open data sources with links and licenses',
    ],
  },
  {
    version: '0.1.3-alpha',
    date: '11.03.2026',
    current: false,
    items: [
      'Split marker data from full place details — map now loads ~10× less data',
      'Place details (courts, images, address) fetched on demand when opening a place',
      'Skeleton loader shown while place details load',
      'Sport filter no longer triggers full marker rebuild — only updates icons in place',
      'Map marker data cached in localStorage for 30 min — instant load on revisit',
      'Added DB indexes for approved places query',
    ],
  },
  {
    version: '0.1.2-alpha',
    date: '10.03.2026',
    current: false,
    items: [
      'When user opens the add-place page, use current map section for better user experience',
      'Fix position for place-count, osm-contribution and location-button on map component',
      'Add satellite map layer',
      'Add icon for sport "Calisthenics"',
      'Open place images fullscreen',
      'Add sport types: Running & Swimming',
    ],
  },
  {
    version: '0.1.1-alpha',
    date: '09.03.2026',
    current: false,
    items: [
      'Improved metadata for better SEO',
      'Add robots.txt for better SEO',
      'Add sitemap for better SEO',
      'JSON-LD on place pages for better SEO',
      'Preconnect Supabase for better performance',
    ],
  },
  {
    version: '0.1.0-alpha',
    date: '08.03.2026',
    current: false,
    items: [
      'Initial release',
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Changelog</h1>
        </div>

        {CHANGELOG.map((release) => (
          <Card key={release.version}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base">{release.version}</h2>
                {release.current && (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                    Current
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{release.date}</span>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {release.items.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
