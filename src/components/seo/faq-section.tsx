interface FaqItem {
  question: string
  answer: string
}

interface FaqSectionProps {
  items: FaqItem[]
}

export function buildListingFaq({
  plural,
  location,
  count,
}: {
  plural: string
  location: string
  count: number
}): FaqItem[] {
  return [
    {
      question: `Wie viele ${plural} gibt es in ${location}?`,
      answer: `In ${location} gibt es aktuell ${count} ${plural} in der Datenbank von OpenSportMap. Die Daten werden regelmäßig aktualisiert und von der Community gepflegt.`,
    },
    {
      question: `Welche ${plural} in ${location} sind kostenlos nutzbar?`,
      answer: `Viele öffentliche ${plural} in ${location} sind kostenlos zugänglich. Auf OpenSportMap kannst du öffentliche Plätze (gekennzeichnet als "Öffentlich") von Vereins- oder Schulanlagen unterscheiden. Klick auf einen Platz um Details zu sehen.`,
    },
    {
      question: `Kann ich einen fehlenden Platz in ${location} eintragen?`,
      answer: `Ja! OpenSportMap lebt von der Community. Du kannst auf opensportmap.de kostenlos einen neuen Platz eintragen – ohne Anmeldung. Dein Beitrag wird geprüft und dann freigeschaltet.`,
    },
    {
      question: `Wie finde ich ${plural} in meiner Nähe in ${location}?`,
      answer: `Öffne die interaktive Karte auf OpenSportMap und aktiviere deinen Standort. Die Karte zeigt dir dann alle ${plural} in der Nähe deines aktuellen Standorts.`,
    },
  ]
}

export default function FaqSection({ items }: FaqSectionProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Häufige Fragen</h2>
        <div className="space-y-2">
          {items.map((item, i) => (
            <details
              key={i}
              className="border rounded-xl px-4 py-3 group"
            >
              <summary className="cursor-pointer text-sm font-medium list-none flex items-center justify-between gap-2">
                {item.question}
                <span className="text-muted-foreground shrink-0 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-2">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}
