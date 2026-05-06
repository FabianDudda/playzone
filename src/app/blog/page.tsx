import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import BackButton from '@/components/layout/back-button'
import { blogPosts } from './posts'
import BlogFilter from './_components/blog-filter'

interface Props {
  searchParams: Promise<{ city?: string; sport?: string }>
}

export default async function BlogPage({ searchParams }: Props) {
  const { city, sport } = await searchParams
  const activeCity = city ?? ''
  const activeSport = sport ?? ''

  const filtered = blogPosts.filter(p => {
    if (activeCity && activeSport) return p.tag === activeCity && p.sportType === activeSport
    if (activeCity) return p.tag === activeCity
    if (activeSport) return p.sportType === activeSport
    return true
  })

  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">Blog</h1>
        </div>

        <BlogFilter posts={blogPosts} activeCity={activeCity} activeSport={activeSport} />

        <div className="flex flex-col gap-4">
          {filtered.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer">
                {post.coverImage ? (
                  <div className="relative h-32">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 576px"
                    />
                  </div>
                ) : (
                  <div className={`bg-gradient-to-br ${post.coverGradient} h-32 flex items-center justify-center`}>
                    <span className="text-5xl">{post.coverEmoji}</span>
                  </div>
                )}
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{post.author}</span>
                    <span className="ml-auto">{new Date(post.date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <h2 className="text-sm font-semibold leading-snug">{post.title}</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">{post.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
