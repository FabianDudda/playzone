import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { blogPosts } from '../posts'
import SportPlaceImage from '../_components/sport-place-image'

// Placeholder content per slug
const postContent: Record<string, React.ReactNode> = {
  'fussball-berlin': (
    <div className="space-y-4 [&>h3+p]:!mt-0 [&>p+div]:!mt-2 text-sm text-muted-foreground leading-relaxed">
      <p>Berlin hat eine riesige Auswahl an kostenlosen Bolzplätzen. In diesem Beitrag stellen wir euch fünf der besten Bolzplätze vor.</p>

      <h3 className="font-semibold text-foreground">Bolzplatz Theodor-Wolff-Park</h3>
      <p>Der Bolzplatz in Berlin-Mitte ist ein öffentlicher Treffpunkt für Sport und Freizeit im urbanen Raum. Die zentrale Lage macht den Platz besonders attraktiv, da er gut erreichbar ist.</p>
      <SportPlaceImage name="Theodor-Wolff-Park" location="Berlin-Reinickendorf" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/berlin_fußball_Theodor-Wolff-Park.png" mapUrl="/?place=13495f1b-6946-4a66-a0b8-ac1945f2548c" />

      <h3 className="font-semibold text-foreground">Bolzplatz Heckerdamm</h3>
      <p>Der Kunstrasen Bolzplatz am Heckerdamm in Charlottenburg in Berlin befindet sich direkt am Volkspark Jungfernheide.</p>
      <SportPlaceImage name="Sportplatz Heckerdamm" location="Berlin-Spandau" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Kostenlos" image="/blog/berlin_fußball_Heckerdamm.png" mapUrl="/?place=567c826a-745a-4fff-82bd-8b38f0bb59d5" />

      <h3 className="font-semibold text-foreground">Bolzplatz Schustehruspark</h3>
      <p>Der Bolzplatz Schustehruspark in Berlin-Charlottenburg ist ein beliebter Treffpunkt für Freizeitfußball und spontanes Kicken im Kiez. Eingebettet zwischen Wohnhäusern und Grünflächen bietet der Platz Raum für Bewegung, Begegnung und gemeinsames Spielen.</p>
      <SportPlaceImage name="Schustehruspark" location="Berlin-Spandau" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Familie" image="/blog/berlin_fußball_Schustehruspark.png" mapUrl="/?place=e1c5ce96-910b-47cd-a82e-1e1095adcdc6"/>

      <h3 className="font-semibold text-foreground">Bolzplatz Tiergarten</h3>
      <p>Versteckt zwischen der Spree und dem Kanal liegt dieser Kunstrasenplatz. Er ist größer als die gewöhnlichen Bolzplätze und daher ist hier auch Platz für größere Gruppen. Perfekt für den Sommer wenn viel los ist. Hier ist genug Platz. Ein echter Geheimtipp für Fußball mitten in Berlin.</p>
      <SportPlaceImage name="Fußballfeld Tiergarten" location="Berlin-Mitte" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/berlin_fußball_tiergarten.png" mapUrl="/?place=5ac2326b-c9e4-42af-b0d3-87804bd4a850"/>

      <h3 className="font-semibold text-foreground">Bolzplatz Kaisersteg</h3>
      <p>Der Bolzplatz am Kaisersteg in Berlin-Niederschöneweide ist ein öffentlicher, frei zugänglicher Fußballplatz direkt im Grünen an der Spree. Der Platz ist eingezäunt und mit einfachen Toren ausgestattet.</p>
      <SportPlaceImage name="Platz am Kaisersteg" location="Berlin-Treptow" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Park" image="/blog/berlin_fußball_Kaisersteg.png" mapUrl="/?place=995cdd36-8956-4727-8812-ba091ea8bce8"/>
   
    </div>
  ),
  'fussball-hamburg': (
    <div className="space-y-4 [&>h3+p]:!mt-0 [&>p+div]:!mt-2 text-sm text-muted-foreground leading-relaxed">
      <p>Hamburg hat eine Vielzahl an kostenlosen Fußballfelder verteilt über die ganze Stadt. In diesem Beitrag stellen wir euch fünf der besten Bolzplätze vor.</p>

      <h3 className="font-semibold text-foreground">Bolzplatz im Sportpark Steinwiesenweg</h3>
      <p>Der Bolzplatz im Sportpark Steinwiesenweg wurde 2025 in Eidelstedt eröffnet. Besonders ist die Überdachung und Beleuchtung, sodass ihr auch am Abend oder bei schlechtem Wetter spielen könnt.</p>
      <SportPlaceImage name="Sportpark Steinwiesenweg" location="Hamburg-Eidelstedt" emoji="⚽" gradient="from-red-500 to-rose-600" badge="Überdacht" image="/blog/hamburg_fußball_sportparkSteinwiesenweg.png" mapUrl="/?place=db0517dc-57b6-42d6-b1f0-5794262678a7" />

      <h3 className="font-semibold text-foreground">Bolzplatz Lohsepark</h3>
      <p>Der Bolzplatz Lohsepark gehört zur neu entstandenen HafenCity. Zwischen dem Park und den Bahngleisen befinden sich zwei Kunstrasen-Bolzplätze, ein großer und ein kleiner.</p>
      <SportPlaceImage name="Sportfläche Lohsepark" location="Hamburg-HafenCity" emoji="⚽" gradient="from-red-500 to-rose-600" badge="Kunstrasen" image="/blog/hamburg_fußball_lohsepark.png" mapUrl="/?place=383492c6-20f7-4b52-bbe7-4d7b1c1e9b18" />

      <h3 className="font-semibold text-foreground">Bolzplatz Goethepark</h3>
      <p>Direkt hinter dem Gebäude des Gymnasiums Allee befindet sich der Bolzplatz Goethepark in Altona-Nord und ist besonders bei jüngeren Zockern beliebt.</p>
      <SportPlaceImage name="Fußballfeld Goethepark" location="Hamburg-Altona" emoji="⚽" gradient="from-red-500 to-rose-600" badge="Öffentlich" image="/blog/hamburg_fußball_goethepark.png" mapUrl="/?place=8c9f0750-1d80-44c5-add0-afd55bd74477" />

      <h3 className="font-semibold text-foreground">Bolzplatz Wilhelmsburg</h3>
      <p>Der Kunstrasen-Bolzplatz an der Bahnhofspassage in Wilhelmsburg befindet sich zwischen einem Einkaufszentrum und Wohnhäusern entlang einer Fußgängerzone.</p>
      <SportPlaceImage name="Sportplatz Wilhelmsburg" location="Hamburg-Wilhelmsburg" emoji="⚽" gradient="from-red-500 to-rose-600" badge="Kunstrasen" image="/blog/hamburg_fußball_wilhelmsburg.png" mapUrl="/?place=48e313a4-4c98-463b-aee9-04045a097cad"/>

      <h3 className="font-semibold text-foreground">Volkspark</h3>
      <p>Der Bolzplatz im Altonaer Volkspark steht in der größten Grünanlage Hamburgs und befindet sich nördlich vom Fußballstadion.</p>
      <SportPlaceImage name="Volkspark Hamburg" location="Hamburg-Bahrenfeld" emoji="⚽" gradient="from-red-500 to-rose-600" badge="Park" image="/blog/hamburg_fußball_volkspark.png" mapUrl="/?place=df1e503e-dadd-4b6f-a690-fc9a87613356"/>

    </div>
  )
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = blogPosts.find(p => p.slug === slug)
  if (!post) return {}

  return {
    title: `${post.title} | OpenSportMap Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      tags: [post.tag, post.category === 'city' ? 'Stadt' : 'Sportart'],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = blogPosts.find(p => p.slug === slug)

  if (!post) return notFound()

  const content = postContent[slug]

  const blogPostingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: 'de',
    author: {
      '@type': 'Organization',
      name: 'OpenSportMap',
      url: 'https://opensportmap.de',
    },
    publisher: {
      '@type': 'Organization',
      name: 'OpenSportMap',
      url: 'https://opensportmap.de',
    },
    url: `https://opensportmap.de/blog/${post.slug}`,
    keywords: post.tag,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <div className="container px-4 py-4 overflow-x-hidden">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold leading-tight">{post.title}</h1>
          </div>

<div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{post.author}</span>
            <span>·</span>
            <span>{new Date(post.date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>
          </div>

          {content ?? (
            <p className="text-sm text-muted-foreground">Dieser Beitrag wird bald veröffentlicht.</p>
          )}

          <div className="text-center">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
              ← Alle Beiträge
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
