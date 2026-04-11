import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { blogPosts } from './blog/posts'
import { getCityCombosStatic } from '@/lib/supabase/seo-queries'
import { toSlug, sportToSlug } from '@/lib/utils/seo-slugs'

const BASE_URL = 'https://opensportmap.de'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const { data: places } = await supabase
    .from('places')
    .select('id, updated_at')
    .eq('moderation_status', 'approved')
    .order('updated_at', { ascending: false })

  const placeUrls: MetadataRoute.Sitemap = (places ?? []).map((place) => ({
    url: `${BASE_URL}/places/${place.id}`,
    lastModified: new Date(place.updated_at ?? new Date()),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  // Flat listing pages: /orte/[sport]/[stadt]
  const combos = await getCityCombosStatic()

  const sportKeys = new Set<string>()
  const sportUrls: MetadataRoute.Sitemap = []
  const cityUrls: MetadataRoute.Sitemap = []

  for (const c of combos) {
    const sportSlug = sportToSlug[c.sport]
    if (!sportSlug) continue
    const stadtSlug = toSlug(c.city)

    cityUrls.push({
      url: `${BASE_URL}/orte/${sportSlug}/${stadtSlug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    })

    if (!sportKeys.has(sportSlug)) {
      sportKeys.add(sportSlug)
      sportUrls.push({
        url: `${BASE_URL}/orte/${sportSlug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  }

  const blogUrls: MetadataRoute.Sitemap = blogPosts.map(post => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/orte`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/rankings`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    ...blogUrls,
    ...sportUrls,
    ...cityUrls,
    ...placeUrls,
  ]
}
