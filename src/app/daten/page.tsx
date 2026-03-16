'use client'

import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const DATA_SOURCES = [
  {
    source: 'Dormagen',
    url: 'https://opendata.rhein-kreis-neuss.de/explore/dataset/dormagen-spiel-bolzplaetze/information/?disjunctive.art=&sort=art&flg=de-de&disjunctive.ortsteil&disjunctive.art_des_angebotes',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadt Köln',
    url: 'https://www.offenedaten-koeln.de/dataset/spiel-und-sportpl%C3%A4tze-k%C3%B6ln',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadt Bonn',
    url: 'https://opendata.bonn.de/dataset/sportst%C3%A4tten-sportanlagen',
    license: 'Creative Commons CC Zero License',
  },
  {
    source: 'Stadt Dortmund',
    url: 'https://open-data.dortmund.de/explore/dataset/spielplatze/information/?disjunctive.ptl_anschl&disjunctive.p_email&disjunctive.i_zusinfo&disjunctive.i_beschr&disjunctive.ubz&disjunctive.statbezibe&disjunctive.stadtbezbe&disjunctive.sozialrbe&disjunctive.aktionsrbz&disjunctive.aktionsrnr&disjunctive.sozialrnr&disjunctive.stadtbeznr&disjunctive.statbeznr&disjunctive.ubznr&disjunctive.objektname&disjunctive.strasse&disjunctive.ort&disjunctive.objektart&disjunctive.link&disjunctive.objektkate&disjunctive.objektzusa',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Ennepe-Ruhr-Kreis',
    url: 'https://opendata.ruhr/dataset/spiel-und-bolzplatze-des-ennepe-ruhr-kreises',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadt Gelsenkirchen',
    url: 'https://gelsenkirchen.opendata.ruhr/dataset/stadt-gelsenkirchen-infrastrukturdaten-spielflache',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadtverwaltung Norderstedt',
    url: 'https://opendata.schleswig-holstein.de/dataset/bolzplatze',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'Stadt Münster',
    url: 'https://open.nrw/dataset/tischtennisplatten-in-munster-ms',
    license: 'Datenlizenz Deutschland – Zero – Version 2.0',
  },
  {
    source: 'OpenStreetMap',
    url: 'https://www.openstreetmap.org/copyright',
    license: 'Open Database-Lizenz ',
  },
  {
    source: 'Freie und Hansestadt Hamburg, Behörde für Umwelt und Energie',
    url: 'https://suche.transparenz.hamburg.de/dataset/spielplaetze-hamburg',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt München',
    url: 'https://opendata.muenchen.de/dataset/oeffentliche-spielplaetze-muenchen',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt Dusiburg',
    url: 'https://geoportal.duisburg.de/arcgisserver/rest/services/OpenData/OpenData/MapServer/29/query?where=OBJECTID+IS+NOT+NULL&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&resultOffset=&resultRecordCount=&f=pjson',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt Dresden',
    url: 'https://opendata.dresden.de/informationsportal/?open=1&result=289C064F-9263-4E07-9E1E-F9FDC0C643F0#app/mainpage////',
    license: 'Datenlizenz Deutschland Namensnennung 2.0',
  },
  {
    source: 'Stadt Dresden',
    url: 'https://www.data.gv.at/datasets/71084c02-973d-4544-b804-7ed82bd53027?locale=de',
    license: 'Namensnennung 4.0 International',
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
            <CardTitle className="text-base">Importierte Datensätze</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {DATA_SOURCES.map(({ source, url, license }) => (
                <div key={source} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-medium hover:underline underline-offset-2"
                  >
                    {source}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
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
                geprüft. Alle Beiträge stehen unter der Creative Commons Namensnennung 4.0 International Lizenz (CC BY 4.0).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-sm space-y-4">
      

            <div>
              <h2 className="font-semibold mb-1">© 2026 OpenSportMap. Daten verfügbar unter CC BY 4.0.</h2>
           
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
