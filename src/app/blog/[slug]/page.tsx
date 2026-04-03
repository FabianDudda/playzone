import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { blogPosts } from '../posts'
import SportPlaceImage from '../_components/sport-place-image'

// Placeholder content per slug
const postContent: Record<string, React.ReactNode> = {
  'basketball-hamburg': (
    <div className="space-y-4 [&>h3+p]:!mt-0 [&>p+div]:!mt-2 text-sm text-muted-foreground leading-relaxed">
      <p>Hamburg hat viele kostenlose Basketballplätze in der Stadt. In diesem Beitrag stellen wir euch fünf der besten Basketballplätze vor.</p>

      <h3 className="font-semibold text-foreground">Basketball im Sportpark Außenmühle</h3>
      <p>Der Sportpark Außenmühle im Harburger Stadtpark ist ein großzügiger Freizeit- und Erholungsbereich in Wilstorf. Auf rund 27.000 Quadratmetern bietet die modernisierte Anlage vielseitige Möglichkeiten für Sport und Bewegung – von Basketball über Beachvolleyball bis hin zu Calisthenics. Sie wird sowohl von Schulen und Vereinen als auch von Freizeitsportlern genutzt und lädt Menschen jeden Alters zur aktiven Erholung ein.</p>
      <SportPlaceImage name="Skatepark KAP 686 am Rhein" location="Hamburg-Wilstorf" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/hamburg_basketball_sportpark-außenmühle.jpg" mapUrl="/?place=f4ea9126-5814-4c60-8d1b-ca0f1a3abab8" />

      <h3 className="font-semibold text-foreground">Basketball im Inselpark </h3>
      <p>Mitten im Inselpark findest du die Welt der Bewegung. Einen vielseitigen Outdoor-Bereich für Sport und Bewegung. Egal ob Fußball, Basketball, Skaten oder Klettern. Hier kannst du dich kostenlos austoben und neue Übungen ausprobieren. Perfekt für alle, die draußen trainieren und dabei etwas Abwechslung wollen!</p>
      <SportPlaceImage name="Skatepark Lohserampe im Lohsepark" location="Hamburg-Wilhelmsburg" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Kostenlos" image="/blog/hamburg_basketball_inselpark.jpg" mapUrl="/?place=8f204a5e-407c-4316-b7ba-a676f441eda1" />

      <h3 className="font-semibold text-foreground">Basketball im Antonipark</h3>
      <p>Der Park Fiction im Antonipark verbindet urbanes Lebensgefühl mit kreativem Stadtdesign. Zwischen ikonischen Plastikpalmen und entspannten Holzliegen entsteht eine Atmosphäre, die fast an einen Streetball-Spot wie Venice Beach erinnert – ideal für spontane Basketball-Matches mit Freunden. Gleichzeitig lädt der Ort mit seinem freien Blick auf die Elbe zum Verweilen ein und steht sinnbildlich für bürgerschaftliches Engagement zur Erhaltung von Freiräumen.</p>
      <SportPlaceImage name="Skatepark unter der Zoobrücke" location="Hamburg-Altona Altstadt" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Familie" image="/blog/hamburg_basketball_park-fiction.jpg" mapUrl="/?place=26f88b9b-2c4a-4dd2-9f5f-be3d52af0b6e"/>

      <h3 className="font-semibold text-foreground">Basketball am Haus der Jugend</h3>
      <p>Diesen überdachten Basketballplatz findest du unter dem Haus der Jugend. Abends ist er beleuchtet.</p>
      <SportPlaceImage name="Skatepark im Lentpark" location="Hamburg-Wilhelmsburg" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/hamburg_basketball_haus-der-jugend.jpg" mapUrl="/?place=a2aed8d4-1b0c-4872-8c8f-b1e37c420b8f"/>

      <h3 className="font-semibold text-foreground">Basketball im Lohmühlenpark</h3>
      <p>Der Basketballplatz im Lohmühlenpark ist ein beliebter Treffpunkt für Sportbegeisterte, besonders attraktiv durch die Möglichkeit, dank Flutlicht auch am Abend zu spielen. Der Lohmühlenpark liegt eingebettet zwischen kleinen Läden, Gastronomie und der nahegelegenen Außenalster. </p>
      <SportPlaceImage name="Skatepark im Vorgebirgspark" location="Hamburg-St Georg" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Park" image="/blog/hamburg_basketball_lohmühlenpark.jpg" mapUrl="/?place=decbd142-2574-4182-bf12-5a60fa4843a4"/>
   
    </div>
  ),
  'skatepark-koeln': (
    <div className="space-y-4 [&>h3+p]:!mt-0 [&>p+div]:!mt-2 text-sm text-muted-foreground leading-relaxed">
      <p>Köln hat ein vielfältiges Angebot an Skateparks im ganzen Stadtgebiet. In diesem Beitrag stellen wir euch fünf der besten Skateparks vor.</p>

      <h3 className="font-semibold text-foreground">Skatepark KAP 686 am Rhein</h3>
      <p>Der Skatepark KAP686 ist ein bekannter Spot in Köln, der auch überregional und international viele Skater*innen anzieht. Auf rund 2.000 m² bietet die beleuchtete Anlage ideale Bedingungen für Streetskating mit abwechslungsreichen Elementen wie Curbs, Banks und Manual Pads. Direkt am Rhein gelegen, überzeugt der Platz nicht nur durch seine Architektur, sondern auch durch seine besondere Atmosphäre. Regelmäßige Events und die enge Zusammenarbeit mit der Skate-Community machen ihn zu einem wichtigen Treffpunkt der Szene.</p>
      <SportPlaceImage name="Skatepark KAP 686 am Rhein" location="Köln-Südstadt" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/koeln_skatepark_kap686-am-rhein.jpg" mapUrl="/?place=6d300d83-5a40-44b0-a3af-cfeda8b42bb0" />

      <h3 className="font-semibold text-foreground">Skatepark Lohserampe im Lohsepark</h3>
      <p>Die Lohserampe in Köln befindet sich im Grüngürtel an der Inneren Kanalstraße und liegt eingebettet in einer kleinen, von begrünten Hügeln umgebenen Senke mit amphitheaterartiger Atmosphäre. Die Anlage bietet eine vielseitige Miniramp mit unterschiedlichen Höhen, Transition und Pool-Elementen sowie ergänzende Street-Features wie Quarter und Curb. Als öffentlich zugänglicher Spot ist sie frei nutzbar und gilt als einer der beliebtesten Treffpunkte für Skater in der Stadt. </p>
      <SportPlaceImage name="Skatepark Lohserampe im Lohsepark" location="Köln-Nippes" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Kostenlos" image="/blog/koeln_skatepark_lohserampe.png" mapUrl="/?place=de65c417-c986-4340-96aa-0edc6af71354" />

      <h3 className="font-semibold text-foreground">Skatepark unter der Zoobrücke</h3>
      <p>Unter der Zoobrücke in Köln befindet sich dieser Skatepark direkt am Rhein. Die Anlage bietet vielfältige Obstacles und genug Platz für Skateboarder, BMX-Fahrer, Scooter und Inline-Skater. Dank der Überdachung kann man hier auch bei schlechtem Wetter fahren, ohne dass es schnell zu eng wird. Außerdem befindet sich direkt daneben noch ein Basketballplatz.</p>
      <SportPlaceImage name="Skatepark unter der Zoobrücke" location="Köln-Mülheim" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Familie" image="/blog/koeln_skatepark_zoobruecke.jpg" mapUrl="/?place=73fe1505-8882-4cfb-9976-905659c9dc58"/>

      <h3 className="font-semibold text-foreground">Skatepark im Lentpark</h3>
      <p>Der Skatepark im Lentpark ist ein rund 800 m² großer Betonpark mit vielseitigen Street- und Transition-Elementen. Neben Rails, Curbs und Manual Pads sorgen auch Banks, Quarterpipes und urbane Setups für abwechslungsreiche Lines. Besonders angenehm ist die Lage: Umgeben von vielen Bäumen bietet der Spot selbst an heißen Tagen ausreichend Schatten und lädt zu entspannten Sessions für Skater und BMX-Fahrer ein.</p>
      <SportPlaceImage name="Skatepark im Lentpark" location="Köln-Agnesviertel" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/koeln_skatepark_lentpark.png" mapUrl="/?place=1ccd18bc-0fe3-4cfe-a450-9e619c05c312"/>

      <h3 className="font-semibold text-foreground">Skatepark im Vorgebirgspark</h3>
      <p>Der Skatepark im Vorgebirgspark ist eher kompakt, bietet aber genau die richtigen Features zum Üben. Neben Beton-Curbs und kleineren Street-Elementen sticht vor allem die vertikale Pipe hervor, die sich perfekt für Old-School-Wallrides eignet.</p>
      <SportPlaceImage name="Skatepark im Vorgebirgspark" location="Köln-Raderberg" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Park" image="/blog/koeln_skatepark_vorgebirgspark.png" mapUrl="/?place=4b19f9f6-2a36-4921-94cb-67c5bf86df1b"/>
   
    </div>
  ),
  'basketball-koeln': (
    <div className="space-y-4 [&>h3+p]:!mt-0 [&>p+div]:!mt-2 text-sm text-muted-foreground leading-relaxed">
      <p>Als Austragungsort der Basketball-EM 2022 hat Köln eine Vielzahl an kostenlosen und öffentlichen Basketballplätzen zu bieten. In diesem Beitrag stellen wir euch fünf der besten Basketballplätze vor.</p>

      <h3 className="font-semibold text-foreground">Basketball an der Deutzer Werft direkt am Rhein</h3>
      <p>Dieser Spot ist einer der beliebtesten für alle Kölner Basketballer, daher findet man hier immer Mitspieler. Er bietet ein großes Spielfeld mit zwei Körben sowie einen zusätzlichen Halbfeldbereich.</p>
      <SportPlaceImage name="Basketball an der Deutzer Werft direkt am Rhein" location="Köln-Deutz" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/koeln_basketball_deutzer-rheinufer.jpg" mapUrl="/?place=2061f231-108f-45a0-915d-e83b6b4c79f6" />

      <h3 className="font-semibold text-foreground">Basketballplatz im Pionierpark</h3>
      <p>Der Basketballplatz im Pionierpark wurde erst 2025 eröffnet und ist daher noch in einem sehr guten Zustand. Hier findest du außerdem noch eine Calisthenics-Anlage und eine große Grünfläche. </p>
      <SportPlaceImage name="Basketballplatz im Pionierpark" location="Köln-Südstadt" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Kostenlos" image="/blog/koeln_basketball_calisthenic_pionerpark.jpg" mapUrl="/?place=91ba0f77-3ff6-41b4-8bbd-941532ade48e" />

      <h3 className="font-semibold text-foreground">Basketballplatz im Grüngürtel</h3>
      <p>Dieser Spot mitten im Grüngürtel gilt ebenfalls als einer der beliebtesten Basketballplätze in Köln und überzeugt durch seine zentrale Lage. Mit insgesamt vier Körben, einem Full Court und zwei Half Courts sind verschiedene Spielmöglichkeiten gegeben. In direkter Nähe befindet sich zudem ein kostenloser Tennisplatz, eine Calisthenics-Anlage und mehrere Tischtennisplatten.</p>
      <SportPlaceImage name="Basketballplatz im Grüngürtel" location="Köln-Belgisches Viertel" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Familie" image="/blog/koeln_basketball_gruenguertel.jpeg" mapUrl="/?place=965e02c7-8cf7-4f66-8d01-70387e69f885"/>

      <h3 className="font-semibold text-foreground">Basketball im Lohsepark</h3>
      <p>Der Basketballplatz im Lohsepark bietet ein komplettes Spielfeld. Insgesamt gibt es zwei Bereiche: ein Full Court für Spiele im 5-gegen-5 mit zwei Körben sowie einen Half Court mit drei Körben, darunter auch niedrigere Varianten für Kinder. Die Umgebung mit Fußballplatz, Fitnessbereich und Tischtennis sorgt zusätzlich für eine vielseitige Nutzung des Areals.</p>
      <SportPlaceImage name="Basketball im Lohsepark" location="Köln-Nippes" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/koeln_multisport_lohsepark.png" mapUrl="/?place=f0d88600-a99e-4254-a417-78b020dc78e8 "/>

      <h3 className="font-semibold text-foreground">Basketballplatz unter der Zoobrücke</h3>
      <p>Der Basketballplatz unter der Zoobrücke hat einen Vorteil. Durch die Überdachung kann hier auch bei schlechtem Wetter gespielt werden. Die eingezäunte Anlage erinnert an klassische Streetball-Courts und schafft eine besondere Atmosphäre. Das Spielfeld ist gut gepflegt, mit klaren Markierungen und zwei Metallkörben auf einem Full Court sowie einem zusätzlichen, niedrigeren Korb daneben. Aufgrund der begrenzten Größe eignet sich der Platz eher für kleinere Spiele wie 3-gegen-3 oder höchstens 4-gegen-4.</p>
      <SportPlaceImage name="Basketballplatz unter der Zoobrücke" location="Köln-Mülheim" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Park" image="/blog/koeln_basketball_zoobruecke.jpg" mapUrl="/?place=f409ff25-61d2-4a69-b557-24e6d5fa3897"/>
   
    </div>
  ),
  'fussball-muenchen': (
    <div className="space-y-4 [&>h3+p]:!mt-0 [&>p+div]:!mt-2 text-sm text-muted-foreground leading-relaxed">
      <p>München als ehemaliger Gastgeber der Olympischen Spiele hat viele kostenlosen Bolzplätzen zu bieten. In diesem Beitrag stellen wir euch fünf der besten Bolzplätze vor.</p>

      <h3 className="font-semibold text-foreground">Bolzplatz im Amphionpark</h3>
      <p>Im Amphionpark findest du diesen Bolzplatz im kleinen Feld. Daneben befindet sich noch ein Basketballplatz und ein größeres Fußballfeld. Ein moderner Spot für alle, die Fußball oder Basketball spielen wollen!</p>
      <SportPlaceImage name="Bolzplatz im Amphionpark" location="München-Moosach" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/muenchen_fußball_amphionpark.png" mapUrl="/?place=03d2cb6a-e88f-4d16-b98c-59b0f88a3c1b" />

      <h3 className="font-semibold text-foreground">Bolzplatz Neuhofen</h3>
      <p>Dieser Bolzplatz in Neuhofen ist perfekt für eine spontane Runde Fußball. Außerdem findest du hier ein Volleyballfeld, einen Basketballplatz.</p>
      <SportPlaceImage name="Bolzplatz Neuhofen" location="München-Sendling" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Kostenlos" image="/blog/muenchen_fußball_neuhofen.png" mapUrl="/?place=0411fc8c-0da0-4bed-8bc5-d3f6403756fa" />

      <h3 className="font-semibold text-foreground">Bolzplatz Keilberthstraße</h3>
      <p>Dieser Bolzplatz am Stadtrand im Grünen bietet neben zwei Fußballtoren auch Platz zum Basketball spielen. </p>
      <SportPlaceImage name="Bolzplatz Keilberthstraße" location="München-Teufelshart" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Familie" image="/blog/muenchen_fußball_keilberthstraße.png" mapUrl="/?place=d3aa4f72-8ebe-40df-b171-a7a72122607a"/>

      <h3 className="font-semibold text-foreground">Bolzplatz Alter Botanischer Garten</h3>
      <p>Dieser kleine Bolzplatz im Alten Botanischen Garten ist zentral im Stadtzentrum gelegen. 
      </p>
      <SportPlaceImage name="Bolzplatz Alter Botanischer Garten" location="München-Maxvorstadt" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Öffentlich" image="/blog/muenchen_fußball_alter-botanischer-garten.png" mapUrl="/?place=0765788c-77b0-49fc-ac36-a19ec3958f2a"/>

      <h3 className="font-semibold text-foreground">Bolzplatz Panzerwiese</h3>
      <p>Dieser Bolzplatz direkt an der Panzerwiese wurde 2025 renoviert. Neben dem Fußballplatz gibt es auch einen Basketballplatz und einen Skatepark.
      </p>
      <SportPlaceImage name="Bolzplatz Panzerwiese" location="München-Nordhaide" emoji="⚽" gradient="from-blue-500 to-indigo-600" badge="Park" image="/blog/muenchen_fußball_panzerwiese.png" mapUrl="/?place=97a01c1c-356b-4e3b-8e95-04cc75a00b69"/>
   
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
