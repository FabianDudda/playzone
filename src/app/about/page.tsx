'use client'

import { Map, Heart, Plus, Trophy, Github } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import BackButton from '@/components/layout/back-button'

export default function AboutPage() {
  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">Was ist OpenSportMap?</h1>
        </div>

        <Card>
          <CardContent className="p-4 text-sm space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              OpenSportMap ist eine Community-App, mit der du Sportplätze in deiner Nähe entdecken, speichern und selbst hinzufügen kannst.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Die Karte zeigt dir Basketballplätze, Fußballfelder, Tischtennisplatten, Skateparks und viele weitere Sportanlagen – alles an einem Ort.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="font-semibold">Was du tun kannst</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Map className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Sportplätze entdecken</p>
                  <p className="text-muted-foreground">Durchsuche die Karte und finde Sportplätze in deiner Umgebung.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Favoriten speichern</p>
                  <p className="text-muted-foreground">Markiere deine Lieblingsplätze und greife schnell darauf zu.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Plus className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Sportplätze hinzufügen</p>
                  <p className="text-muted-foreground">Trage fehlende Sportplätze ein und hilf anderen, sie zu finden.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Community aufbauen</p>
                  <p className="text-muted-foreground">Die App lebt von Beiträgen der Community – jeder kann mitmachen.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-sm space-y-2">
            <h2 className="font-semibold">Open Source & kostenlos</h2>
            <p className="text-muted-foreground leading-relaxed">
              OpenSportMap ist kostenlos und wird ohne kommerzielle Absichten betrieben. Daten werden nicht verkauft.
            </p>
            <a
              href="https://github.com/FabianDudda/opensportmap"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub Repository
            </a>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
            Häufige Fragen →
          </Link>
        </div>
      </div>
    </div>
  )
}
