'use client'

import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const DATA_SOURCES = [
  {
    source: 'Dormagen',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadt Köln',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadt Bonn',
    license: 'Creative Commons CC Zero License',
  },
  {
    source: 'Stadt Dortmund',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Ennepe-Ruhr-Kreis',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadt Gelsenkirchen',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadtverwaltung Norderstedt',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadt Münster',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'OpenStreetMap',
    license: 'Open Database-Lizenz ',
  },
  {
    source: 'Freie und Hansestadt Hamburg, Behörde für Umwelt und Energie',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt München',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt Dusiburg',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt Dresden',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt Wien',
    license: 'Namensnennung 4.0 International',
  },
  {
    source: 'Stadt Essen',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt Bielefeld',
    license: 'Namensnennung 4.0 International',
  },
  {
    source: 'Stadt Freiburg',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt Berlin',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },

]



export default function DatenquellenPage() {
  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Daten</h1>
        </div>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Daten</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {DATA_SOURCES.map(({ source, license }) => (
                <div key={source} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{source}</span>
                  <span className="text-muted-foreground shrink-0">{license}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-sm space-y-4">
            <div>
              <h2 className="font-semibold mb-1">Karten</h2>
              <p className="text-muted-foreground">
                Kartendaten werden von  <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2"
                >OpenStreetMap</a> bereitgestellt.
                OpenStreetMap ist eine freie, bearbeitbare Weltkarte, die von einer Gemeinschaft
                freiwilliger Mitwirkender erstellt wird.
              </p>
         
            </div>

            <div>
              <h2 className="font-semibold mb-1">Nominatim</h2>
              <p className="text-muted-foreground">
                Geocodierung (Umwandlung von Adressen in Koordinaten und umgekehrt) erfolgt
                über den Nominatim-Dienst, der auf OpenStreetMap-Daten basiert.
              </p>
            </div>

            <div>
              <h2 className="font-semibold mb-1">Nutzerbeiträge</h2>
              <p className="text-muted-foreground">
                Sportplätze und Orte werden von der Community eingereicht und von unserem Team
                geprüft. Alle Rechte vorbehalten. Die Inhalte dürfen ohne ausdrückliche Genehmigung nicht verwendet, kopiert oder weiterverbreitet werden.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-sm space-y-4">
      

            <div>
              <h2 className="font-semibold mb-1">© 2026 OpenSportMap</h2>
           
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
