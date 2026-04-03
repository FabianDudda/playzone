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
    slug: 'basketball-hamburg',
    title: 'Die besten Basketballplätze in Hamburg',
    description: 'Sportpark Außenmühle, Lohmühlenpark, Inselpark, Antonipark, Haus der Jugend   – die besten kostenlosen Basketballplätze in Hamburg',
    category: 'city',
    date: '2026-04-03',
    tag: 'Hamburg',
    sportType: 'Basketball',
    author: 'OpenSportMap',
    coverEmoji: '🏀',
    coverImage: '/blog/hamburg_basketball_sportpark-außenmühle.jpg',
    coverGradient: 'from-blue-500 to-indigo-600',
  },
  {
    slug: 'skatepark-koeln',
    title: 'Die besten Skateparks in Köln',
    description: 'Südstadt, Lohsepark, Zoobrücke, Lentpark, Vorgebirgspark  – die besten kostenlosen Skateparks in Köln',
    category: 'city',
    date: '2026-04-03',
    tag: 'Köln',
    sportType: 'Skatepark',
    author: 'OpenSportMap',
    coverEmoji: '🛹',
    coverImage: '/blog/koeln_skatepark_kap686-am-rhein.jpg',
    coverGradient: 'from-blue-500 to-indigo-600',
  },
  {
    slug: 'basketball-koeln',
    title: 'Die besten Basketballplätze in Köln',
    description: 'Deutzer Werft, Grüngürtel, Zoobrücke, Pionierpark, Lohsepark  – die besten kostenlosen Basketballplätze in Köln',
    category: 'city',
    date: '2026-03-30',
    tag: 'Köln',
    sportType: 'Basketball',
    author: 'OpenSportMap',
    coverEmoji: '🏀',
    coverImage: '/blog/koeln_basketball_deutzer-rheinufer.jpg',
    coverGradient: 'from-blue-500 to-indigo-600',
  },
  {
    slug: 'fussball-muenchen',
    title: 'Die besten Bolzplätze in München',
    description: 'Olypmiastadt München – die besten kostenlosen Bolzplätze in München',
    category: 'city',
    date: '2026-03-27',
    tag: 'München',
    sportType: 'Fußball',
    author: 'OpenSportMap',
    coverEmoji: '⚽',
    coverImage: '/blog/muenchen_fußball_amphionpark.png',
    coverGradient: 'from-blue-500 to-indigo-600',
  },
  {
    slug: 'fussball-koeln',
    title: 'Die besten Bolzplätze in Köln',
    description: 'Nippes, Müngersdorf, Mülheim, Südstadt, Lindenthal – die besten kostenlosen Bolzplätze in Köln',
    category: 'city',
    date: '2026-03-24',
    tag: 'Köln',
    sportType: 'Fußball',
    author: 'OpenSportMap',
    coverEmoji: '⚽',
    coverImage: '/blog/koeln_fußball_agrippinaufer.png',
    coverGradient: 'from-blue-500 to-indigo-600',
  },
  {
    slug: 'fussball-berlin',
    title: 'Die besten Bolzplätze in Berlin',
    description: 'Von Tiergarten bis Heckerdamm – die besten kostenlosen Bolzplätze in Berlin',
    category: 'city',
    date: '2026-03-18',
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
    date: '2026-03-02',
    tag: 'Hamburg',
    sportType: 'Fußball',
    author: 'OpenSportMap',
    coverEmoji: '⚽',
    coverImage: '/blog/hamburg_fußball_sportparkSteinwiesenweg.png',
    coverGradient: 'from-red-500 to-rose-600',
  }
]
