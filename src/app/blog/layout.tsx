import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog | OpenSportMap',
  description: 'Tipps, Entdeckungen und Guides rund um Outdoor-Sport – nach Stadt oder Sportart. Kostenlose Sportplätze in Deutschland entdecken.',
  openGraph: {
    title: 'Blog | OpenSportMap',
    description: 'Tipps und Guides zu kostenlosen Outdoor-Sportplätzen in Deutschland – nach Stadt und Sportart.',
    type: 'website',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
