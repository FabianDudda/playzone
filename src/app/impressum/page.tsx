'use client'

import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import BackButton from '@/components/layout/back-button'

export default function ImpressumPage() {
  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">Impressum</h1>
        </div>

        <Card>
          <CardContent className="p-4 text-sm space-y-4">
            <div>
              <p>Fabian Dudda<br />
              Schützenhofstraße 2<br />
              51063 Köln</p>
            </div>

            <div>
              <h2 className="font-semibold mb-1">Kontakt</h2>
              <p>Telefon: 01578 2037463<br />
              E-Mail: fabian.dudda@hotmail.de</p>
            </div>

          
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
