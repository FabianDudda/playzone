'use client'

import { Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import BackButton from '@/components/layout/back-button'

export default function UnterstuetzenPage() {
  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">Unterstützen</h1>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <img
              src="/profil.png"
              alt="Fabian"
              className="w-full rounded-xl object-cover"
            />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hey, ich bin Fabian. Zusammen mit meinem Hund Choupo habe ich OpenSportMap gebaut.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              OpenSportmap entwickle ich in meiner Freizeit weiter und ist komplett werbefrei. Um die Webseite am Laufen zu halten, entstehen monatliche Serverkosten. Wenn dir das Projekt gefällt und du mich unterstützen möchtest, freue ich mich sehr über eine kleine Spende.
            </p>
            <a
              href="https://www.paypal.com/paypalme/fabiandudda"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full mt-2 h-11 bg-primary text-primary-foreground rounded-xl text-[15px] font-semibold transition-opacity hover:opacity-90"
            >
             
              Mit PayPal unterstützen
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
