'use client'

import { ArrowLeft } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'

type FaqItem = {
  question: string
  answer: string
  bullets?: string[]
  link?: { href: string; label: string }
}

type FaqCategory = {
  title: string
  items: FaqItem[]
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: 'Allgemein',
    items: [
      {
        question: 'Ist OpenSportMap kostenlos?',
        answer: 'Ja, OpenSportMap ist vollständig kostenlos. Du kannst die Karte ohne Registrierung nutzen, Sportplätze suchen und neue Orte eintragen. Auch ein Konto ist kostenlos und bleibt es.',
      },
      {
        question: 'Brauche ich ein Konto?',
        answer: 'Nein. Du kannst die Karte ohne Konto nutzen, Sportplätze anschauen, Sportplätze hinzufügen und Bearbeitungen vorschlagen. Beiträge von Gästen werden jedoch erst nach Prüfung durch ein Admin freigeschaltet. Mit einem Konto werden deine Beiträge direkt deinem Profil zugeordnet und sind unter „Meine Beiträge" einsehbar.',
      },
      {
        question: 'Kann ich OpenSportMap als App installieren?',
        answer: 'Ja! OpenSportMap ist eine Progressive Web App (PWA). Auf Android kannst du sie direkt aus dem Browser installieren – ohne App Store. Tippe in Chrome auf das Menü und dann auf „App installieren" oder „Zum Startbildschirm hinzufügen".',
      },
      {
        question: 'Funktioniert OpenSportMap auch außerhalb von Deutschland?',
        answer: 'Die Karte zeigt grundsätzlich den gesamten Kartenausschnitt – du kannst also auch in anderen Ländern nach Sportplätzen suchen. Allerdings liegen bisher vor allem Daten für deutsche Städte vor. Community-Beiträge aus anderen Ländern sind herzlich willkommen!',
      },
    ],
  },
  {
    title: 'Sportplätze',
    items: [
      {
        question: 'Wie finde ich Sportplätze in meiner Nähe?',
        answer: 'Öffne die Karte und erlaube den Zugriff auf deinen Standort. Die Karte zentriert sich dann automatisch auf deinen aktuellen Ort und zeigt dir die Sportplätze in der Umgebung. Alternativ kannst du die Karte manuell verschieben oder nach einer Stadt suchen.',
        link: { href: '/', label: 'Zur Karte' },
      },
      {
        question: 'Wie füge ich einen Sportplatz hinzu?',
        answer: 'Tippe auf der Karte auf das „+"-Symbol, fülle das Formular aus und bestätige die Position auf der Karte. Bist du eingeloggt, wird dein Beitrag direkt deinem Profil zugeordnet. Als Gast wird er zunächst zur Prüfung eingereicht.',
      },
      {
        question: 'Wie bearbeite ich einen Sportplatz?',
        answer: 'Öffne einen Sportplatz und tippe auf „Bearbeiten". Deine Änderungen werden als Vorschlag eingereicht und nach Prüfung übernommen.',
      },
      {
        question: 'Wie melde ich einen Sportplatz?',
        answer: 'Öffne einen Sportplatz und tippe auf „Platz melden". Du kannst dann angeben, was nicht stimmt – z. B. falsche Informationen, geschlossener Platz oder unangemessene Inhalte. Die Meldung wird von einem Admin geprüft.',
      },
      {
        question: 'Was bedeuten die Platztypen?',
        answer: 'Jeder Sportplatz ist einem von drei Typen zugeordnet:',
        bullets: [
          'Öffentlich – frei zugänglich, kann von jedem genutzt werden.',
          'Verein – gehört einem Verein, Nutzung ggf. nur für Mitglieder.',
          'Schule – auf einem Schulgelände, meist nur außerhalb der Schulzeiten zugänglich.',
        ],
      },
      {
        question: 'Welche Sportarten sind verfügbar?',
        answer: 'Aktuell unterstützt OpenSportMap folgende Sportarten:',
        bullets: [
          'Basketball', 'Badminton', 'Beachvolleyball', 'Boule', 'Calisthenics',
          'Fußball', 'Laufen', 'Schwimmen', 'Skatepark', 'Tennis', 'Tischtennis', 'Volleyball',
        ],
      },
    ],
  },
  {
    title: 'Daten & Feedback',
    items: [
      {
        question: 'Welche Städte sind verfügbar?',
        answer: 'OpenSportMap enthält Sportplätze aus ganz Deutschland – mit besonders guter Abdeckung in folgenden Städten:',
        bullets: [
          'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt am Main',
          'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen',
          'Bremen', 'Dresden', 'Hannover', 'Nürnberg', 'Duisburg',
          'Bonn', 'Dormagen', 'Ennepe-Ruhr-Kreis', 'Gelsenkirchen',
          'Norderstedt', 'Münster', 'Bielefeld', 'Freiburg', 'Wien',
        ],
      },
      {
        question: 'Woher stammen die Daten?',
        answer: 'Die Daten stammen aus offiziellen Open-Data-Quellen verschiedener Städte sowie aus Beiträgen der Community.',
        link: { href: '/daten', label: 'Zur den Datenlizenzen' },
      },
      {
        question: 'Wie aktuell sind die Sportplatzdaten?',
        answer: 'Die Daten aus offiziellen Open-Data-Quellen werden regelmäßig aktualisiert. Community-Beiträge werden nach Prüfung zeitnah freigeschaltet. Wenn du einen veralteten oder falschen Eintrag findest, kannst du ihn direkt bearbeiten oder melden.',
      },
      {
        question: 'Wie kann ich Feedback geben oder einen Fehler melden?',
        answer: 'Über die Feedback-Seite kannst du uns direkt eine Nachricht schicken – ob Verbesserungsvorschlag, Fehlermeldung oder allgemeines Feedback. Für einzelne Sportplätze nutze die „Platz melden"-Funktion auf der Detailseite.',
        link: { href: '/feedback', label: 'Feedback senden' },
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Häufige Fragen</h1>
        </div>

        {FAQ_CATEGORIES.map((category, categoryIndex) => (
          <div key={category.title} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
              {category.title}
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {category.items.map((item, i) => (
                <AccordionItem key={item.question} value={`cat-${categoryIndex}-item-${i}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium text-left hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                    {item.bullets && (
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {item.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.link && (
                      <Link href={item.link.href} className="inline-block text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
                        {item.link.label}
                      </Link>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </div>
  )
}
