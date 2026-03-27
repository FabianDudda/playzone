import { ImageResponse } from 'next/og'
import { blogPosts } from '../posts'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Gradient stops per post (edge runtime can't use Tailwind)
const gradients: Record<string, [string, string]> = {
  'fussball-berlin':             ['#3b82f6', '#4f46e5'],
  'fussball-hamburg':            ['#ef4444', '#e11d48'],
  'basketball-plaetze-bonn':     ['#fb923c', '#f59e0b'],
  'basketball-fuer-einsteiger':  ['#f97316', '#ef4444'],
  'sportplaetze-koeln':          ['#34d399', '#14b8a6'],
  'tischtennis-outdoor':         ['#60a5fa', '#6366f1'],
}

const fallbackGradient: [string, string] = ['#64748b', '#334155']

interface Props {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const post = blogPosts.find(p => p.slug === slug)

  const title = post?.title ?? 'OpenSportMap Blog'
  const description = post?.description ?? 'Tipps zu kostenlosen Sportplätzen in Deutschland.'
  const emoji = post?.coverEmoji ?? '📍'
  const tag = post?.tag ?? 'Blog'
  const [from, to] = gradients[slug] ?? fallbackGradient

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Gradient background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
          }}
        />

        {/* Subtle dot pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
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
            <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              OpenSportMap Blog
            </span>
          </div>

          {/* Middle: emoji + title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span style={{ fontSize: 80 }}>{emoji}</span>
            <div
              style={{
                fontSize: title.length > 40 ? 44 : 52,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.1,
                letterSpacing: '-0.5px',
                maxWidth: 900,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 22,
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.4,
                maxWidth: 800,
              }}
            >
              {description}
            </div>
          </div>

          {/* Bottom: tag badge */}
          <div style={{ display: 'flex' }}>
            <div
              style={{
                padding: '8px 20px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.25)',
                border: '1.5px solid rgba(255,255,255,0.4)',
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {tag}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
