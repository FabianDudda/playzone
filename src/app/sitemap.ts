import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { blogPosts } from './blog/posts'
import { getCityCombosStatic, getCityListStatic } from '@/lib/supabase/seo-queries'
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

  // City hub pages: /orte/[stadt]
  const cities = await getCityListStatic()
  const cityUrls: MetadataRoute.Sitemap = cities.map(({ city }) => ({
    url: `${BASE_URL}/orte/${toSlug(city)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Sport-filtered city pages: /orte/[stadt]/[sport]
  const combos = await getCityCombosStatic()
  const citySportUrls: MetadataRoute.Sitemap = combos
    .map(c => {
      const sportSlug = sportToSlug[c.sport]
      if (!sportSlug) return null
      return {
        url: `${BASE_URL}/orte/${toSlug(c.city)}/${sportSlug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }
    })
    .filter(Boolean) as MetadataRoute.Sitemap

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
    ...cityUrls,
    ...citySportUrls,
    ...placeUrls,
  ]
}
