import { ImageResponse } from 'next/og'
import { sportPlural, slugToSport } from '@/lib/utils/seo-slugs'
import { sportIcons } from '@/lib/utils/sport-utils'
import { resolveCitySlug, getCityPlaceCount } from '@/lib/supabase/seo-queries'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ sport: string; stadt: string }>
}

export default async function Image({ params }: Props) {
  const { sport: sportSlug, stadt: stadtSlug } = await params

  const resolved = await resolveCitySlug(sportSlug, stadtSlug)

  const sport = resolved?.sport ?? slugToSport[sportSlug] ?? sportSlug
  const city = resolved?.city ?? stadtSlug
  const count = resolved ? await getCityPlaceCount(resolved.sport, resolved.city) : 0
  const plural = sportPlural[sport] ?? sport
  const icon = sportIcons[sport] ?? '📍'

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          fontFamily: 'sans-serif',
          backgroundColor: '#000000',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #000000 0%, #0f172a 50%, #000000 100%)',
          }}
        />

        {/* Decorative large sport icon — blurred background accent */}
        <div
          style={{
            position: 'absolute',
            right: -20,
            top: -20,
            fontSize: 320,
            opacity: 0.07,
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {icon}
        </div>

        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            right: -100,
            bottom: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.12)',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 72px',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Top: Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              📍
            </div>
            <span style={{ color: '#94a3b8', fontSize: 18, fontWeight: 500 }}>
              OpenSportMap
            </span>
          </div>

          {/* Middle: City + sport */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Count badge */}
            {count > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: 'rgba(59,130,246,0.2)',
                  border: '1px solid rgba(59,130,246,0.4)',
                  color: '#93c5fd',
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {count} {plural}
              </div>
            )}

            <div
              style={{
                fontSize: city.length > 14 ? 72 : 88,
                fontWeight: 800,
                color: '#f8fafc',
                lineHeight: 1,
                letterSpacing: '-2px',
              }}
            >
              {city}
            </div>
          </div>

          {/* Bottom: Sport pill */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e2e8f0',
                fontSize: 22,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span>{icon}</span>
              <span>{plural}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
