import { ImageResponse } from 'next/og'
import { resolveCitySlugOnly } from '@/lib/supabase/seo-queries'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ stadt: string }>
}

async function getCityTotalCount(city: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('places')
    .select('id', { count: 'exact', head: true })
    .eq('moderation_status', 'approved')
    .eq('city', city)
  return count ?? 0
}

export default async function Image({ params }: Props) {
  const { stadt: stadtSlug } = await params

  const city = await resolveCitySlugOnly(stadtSlug)
  const displayCity = city ?? stadtSlug
  const count = city ? await getCityTotalCount(city) : 0

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

        {/* Decorative large icon */}
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
          🗺️
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

          {/* Middle: City + count */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                {count} Sportplätze
              </div>
            )}

            <div
              style={{
                fontSize: displayCity.length > 14 ? 72 : 88,
                fontWeight: 800,
                color: '#f8fafc',
                lineHeight: 1,
                letterSpacing: '-2px',
              }}
            >
              {displayCity}
            </div>
          </div>

          {/* Bottom: Category pill */}
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
              <span>📍</span>
              <span>Alle Sportplätze</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
