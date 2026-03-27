export type BlogCategory = 'city' | 'sport'

export interface BlogPost {
  slug: string
  title: string
  description: string
  category: BlogCategory
  date: string
  tag: string
  sportType: string
  author: string
  coverEmoji: string
  coverImage?: string  // first real image in the post, used as preview
  // tailwind gradient — used as fallback cover
  coverGradient: string
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'fussball-berlin',
    title: 'Die besten Bolzplätze in Berlin',
    description: 'Von Tiergarten bis Heckerdamm – die besten kostenlosen Bolzplätze in Berlin',
    category: 'city',
    date: '2026-03-25',
    tag: 'Berlin',
    sportType: 'Fußball',
    author: 'OpenSportMap',
    coverEmoji: '⚽',
    coverImage: '/blog/berlin_fußball_tiergarten.png',
    coverGradient: 'from-blue-500 to-indigo-600',
  },
  {
    slug: 'fussball-hamburg',
    title: 'Die besten Bolzplätze in Hamburg',
    description: 'Goethepark, Volkspark, Wilhelmsburg – die besten kostenlosen Bolzplätze in Hamburg.',
    category: 'city',
    date: '2026-03-22',
    tag: 'Hamburg',
    sportType: 'Fußball',
    author: 'OpenSportMap',
    coverEmoji: '⚽',
    coverImage: '/blog/hamburg_fußball_sportparkSteinwiesenweg.jfif',
    coverGradient: 'from-red-500 to-rose-600',
  }
]
