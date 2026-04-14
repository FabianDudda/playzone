'use client'

import { ArrowLeft, Heart, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function PartnerPage() {
  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Unsere Partner</h1>
        </div>  

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start gap-4">
            <img src="/partner/ZOCCER.png"
                 alt="ZOCCER"                                
                 className="h-12 w-12 rounded-lg object-contain shrink-0"
            />            
            <div className="text-sm space-y-1">
                <p className="font-medium">ZOCCER</p>
                <p className="text-muted-foreground leading-relaxed">
                  Die Berliner Fußballschule ZOCCER, gegründet vom ehemaligen Union Berlin Profi Steven Jahn, bietet Einzel- und Gruppentrainings an und veranstaltet regelmäßig Fußballcamps.
                </p>
                <a
                  href="https://www.dubisteinzoccer.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                  https://www.dubisteinzoccer.de/
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
            <img src="/partner/Deutscher_Sportlehrerverband_logo.png"
                 alt="Deutscher Sportlehrerverband e.V."                                
                 className="h-12 w-12 rounded-lg object-contain shrink-0"
            />            
            <div className="text-sm space-y-1">
                <p className="font-medium">Deutscher Sportlehrerverband e.V.</p>
                <p className="text-muted-foreground leading-relaxed">
                Der Deutsche Sportlehrerverband ist der größte Berufsverband in Deutschland für alle Sportlehrkräfte. Er vertritt die Belange des Schulsports und des Sportunterrichts in allen Bereichen des öffentlichen Lebens.
                </p>
                <a
                  href="https://www.dslv.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                  https://www.dslv.de/
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold">OpenSportMap unterstützen</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
            Gemeinsam mit unseren Partnern setzen wir uns dafür ein kostenlose Sportplätze für alle sichtbar und zugänglich zu machen, egal für welche Sportart dein Herz schlägt. 
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
            Egal ob professioneller Athlet, Hobbysportler, Influencer, Verein, Organisation oder Unternehmen. Wenn auch du uns unterstützen möchtest, freuen wir uns jederzeit über deine Nachricht.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              kontakt@opensportmap.de
              </p>
          </CardContent>
        </Card>

      
      </div>
    </div>
  )
}
