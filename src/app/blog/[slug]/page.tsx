import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { blogPosts } from '../posts'
import SportPlaceImage from '../_components/sport-place-image'

// Placeholder content per slug
const postContent: Record<string, React.ReactNode> = {
  'fussball-muenchen': (
    <div className="space-y-4 [&>h3+p]:!mt-0 [&>p+div]:!mt-2 text-sm text-muted-foreground leading-relaxed">
      <p>München als ehemaliger Gastgeber der Olympischen Spiele hat viele kostenlosen Bolzplätzen zu bieten. In diesem Beitrag stellen wir euch fünf der besten Bolzplätze vor.</p>

      <h3 className="font-semibold text-foreground">Bolzplatz im Amphionpark</h3>
      <p>Im Amphionpark findest du diesen Bolzplatz im kleinen Feld. Daneben befindet sich noch ein Basketballplatz und ein größeres Fußballfeld. Ein moderner Spot für alle, die Fußball oder Basketball spielen wollen!</p>
      <SportPlaceImage name="Bolzplatz Agrippinaufer in der Kölner Südstadt" location="Köln-Südstadt" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/muenchen_fußball_amphionpark.png" mapUrl="/?place=03d2cb6a-e88f-4d16-b98c-59b0f88a3c1b" />

      <h3 className="font-semibold text-foreground">Bolzplatz Neuhofen</h3>
      <p>Dieser Bolzplatz in Neuhofen ist perfekt für eine spontane Runde Fußball. Außerdem findest du hier ein Volleyballfeld, einen Basketballplatz.</p>
      <SportPlaceImage name="Bolzplatz Heckweg in Köln-Nippes" location="Köln-Nippes" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Kostenlos" image="/blog/muenchen_fußball_neuhofen.png" mapUrl="/?place=0411fc8c-0da0-4bed-8bc5-d3f6403756fa" />

      <h3 className="font-semibold text-foreground">Bolzplatz Keilberthstraße</h3>
      <p>Dieser Bolzplatz am Stadtrand im Grünen bietet neben zwei Fußballtoren auch Platz zum Basketball spielen. </p>
      <SportPlaceImage name="Bolzplatz Bergisch Gladbacher Straße" location="Köln-Mülheim" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Familie" image="/blog/muenchen_fußball_keilberthstraße.png" mapUrl="/?place=d3aa4f72-8ebe-40df-b171-a7a72122607a"/>

      <h3 className="font-semibold text-foreground">Bolzplatz Alter Botanischer Garten</h3>
      <p>Dieser kleine Bolzplatz im Alten Botanischen Garten ist zentral im Stadtzentrum gelegen. 
      </p>
      <SportPlaceImage name="Bolzplatz Manstedter Weg in Köln-Lindenthal" location="Köln-Lindenthal" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/muenchen_fußball_alter-botanischer-garten.png" mapUrl="/?place=0765788c-77b0-49fc-ac36-a19ec3958f2a"/>

      <h3 className="font-semibold text-foreground">Bolzplatz Panzerwiese</h3>
      <p>Dieser Bolzplatz direkt an der Panzerwiese wurde 2025 renoviert. Neben dem Fußballplatz gibt es auch einen Basketballplatz und einen Skatepark.
      </p>
      <SportPlaceImage name="Fußballplatz mit Stadionflair auf den Jahnwiesen" location="Köln-Müngersdorf" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Park" image="/blog/muenchen_fußball_panzerwiese.png" mapUrl="/?place=97a01c1c-356b-4e3b-8e95-04cc75a00b69"/>
   
    </div>
  ),
  'fussball-koeln': (
    <div className="space-y-4 [&>h3+p]:!mt-0 [&>p+div]:!mt-2 text-sm text-muted-foreground leading-relaxed">
      <p>Köln als Heimat des 1. FC Kölns bietet eine große Auswahl an kostenlosen Bolzplätzen. In diesem Beitrag stellen wir euch fünf der besten Bolzplätze vor.</p>

      <h3 className="font-semibold text-foreground">Bolzplatz Agrippinaufer in der Kölner Südstadt</h3>
      <p>Direkt am Agrippinaufer liegt dieser lässige Kunstrasen Bolzplatz. Zwischen Rheinblick und urbaner Atmosphäre ist dieser Platz perfekt für alle, die Sport mitten in Köln mit entspanntem Vibe verbinden wollen!</p>
      <SportPlaceImage name="Bolzplatz Agrippinaufer in der Kölner Südstadt" location="Köln-Südstadt" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/koeln_fußball_agrippinaufer.png" mapUrl="/?place=ce76e69a-45d3-4d91-9aff-3cba594ccb9a" />

      <h3 className="font-semibold text-foreground">Bolzplatz Heckweg in Köln-Nippes</h3>
      <p>Am Heckweg findest du diesen Kunstrasen Bolzplatz direkt neben der S-Bahn. Außerdem gibt es hier auch noch einen Basketballplatz. </p>
      <SportPlaceImage name="Bolzplatz Heckweg in Köln-Nippes" location="Köln-Nippes" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Kostenlos" image="/blog/koeln_fußball_heckweg.png" mapUrl="/?place=6dd8a11a-cf80-44ce-85e5-72c65e50f444" />

      <h3 className="font-semibold text-foreground">Bolzplatz Bergisch Gladbacher Straße</h3>
      <p>Auf diesem Bolzplatz mit Käfig-Flair kannst du deine technischen Tricks zeigen und deine Gegner schwindelig spielen.</p>
      <SportPlaceImage name="Bolzplatz Bergisch Gladbacher Straße" location="Köln-Mülheim" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Familie" image="/blog/koeln_fußball_bergisch-gladbacher-str.png" mapUrl="/?place=24b23cd5-b804-4800-b001-3f3228f25aed"/>

      <h3 className="font-semibold text-foreground">Bolzplatz Manstedter Weg in Köln-Lindenthal</h3>
      <p>Am Manstedter Weg liegt dieser Kunstrasen Bolzplatz an einem Spielplatz mit Bänken zum chillen. Außerdem gibt es hier noch einen Basketballkorb und eine Tischtennisplatte. Ein klassischer Veedel-Spot für alle, die draußen kicken wollen!</p>
      <SportPlaceImage name="Bolzplatz Manstedter Weg in Köln-Lindenthal" location="Köln-Lindenthal" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/koeln_fußball_manstedter-weg.png" mapUrl="/?place=5a06ec06-3fce-4ee2-b9a4-907889b3b11a"/>

      <h3 className="font-semibold text-foreground">Fußballplatz mit Stadionflair auf den Jahnwiesen</h3>
      <p>Direkt am RheinEnergieSTADION liegt die Jahnwiese, einer der bekanntesten Spots für Fußball in Köln. Große Wiesen, viele Tore und immer Leute für ein Match.
      </p>
      <SportPlaceImage name="Fußballplatz mit Stadionflair auf den Jahnwiesen" location="Köln-Müngersdorf" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Park" image="/blog/koeln_fußball_jahnwiesen.png" mapUrl="/?place=8e278151-6096-442d-a587-ff07b40041ca"/>
   
    </div>
  ),
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
