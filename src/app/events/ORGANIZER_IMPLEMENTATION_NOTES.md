# Organizer-System: Implementierungsnotizen

## Überblick
Organizer sind Gruppen oder Projekte (z.B. "BasKIDball"), die regelmäßig Events an speziellen, nicht-öffentlichen Orten (Schulen, Sporthallen etc.) durchführen. Ein Ort gilt als "Organizer-Venue", wenn er eine `organizer_id` hat — kein eigener `place_type` nötig.

---

## Datenbankstruktur

### Neue Tabelle: `organizers`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | uuid | Primärschlüssel |
| `name` | text | Anzeigename (z.B. "BasKIDball") |
| `slug` | text (unique) | URL-freundlicher Bezeichner (z.B. "baskidball") |
| `description` | text | Kurzbeschreibung |
| `logo_url` | text | URL zum Organizer-Logo |
| `color` | text | Hex-Farbe für Kartenmarker (z.B. "#e63946") |
| `website` | text | Webseite |
| `instagram` | text | Instagram-Handle (z.B. "@baskidball") |
| `created_by` | uuid → profiles | Erstellt von welchem Admin |

### Änderungen an bestehenden Tabellen
- `places.organizer_id` → FK zu `organizers.id` (nullable)
- `events.organizer_id` → FK zu `organizers.id` (nullable, wird beim Erstellen des Events automatisch vom Ort übernommen)

### RLS-Regeln
- Lesen: öffentlich für alle
- Schreiben/Löschen: nur Admins (`user_role = 'admin'`)

---

## Migration
Datei: `supabase/migrations/organizers.sql`
→ Muss einmalig in Supabase ausgeführt werden (SQL-Editor oder Supabase CLI)

---

## Geänderte Dateien

### Typen & Datenbankzugriff
- `src/lib/supabase/types.ts` — `Organizer`-Typ, `organizer_id` in `Place`, `Event`, `PlaceMarker`, `EventWithDetails`
- `src/lib/supabase/database.ts` — `organizers`-CRUD-Sektion, alle Event-Queries joinen jetzt `organizers`, Orts-Lightweight-Query gibt Organizer-Daten zurück

### Admin
- `src/app/admin/organizers/page.tsx` — CRUD-Seite: Organizer anlegen, bearbeiten, löschen
- `src/app/admin/layout.tsx` — "Organizers"-Eintrag in der Admin-Sidebar

### Orte-Formulare
- `src/components/places/place-form.tsx` — Organizer-Dropdown (nur für Admins sichtbar), `organizerId` in `PlaceFormData`
- `src/app/places/[id]/edit/page.tsx` — `isAdmin`-Prop an `PlaceForm`, `organizer_id` im Speichern-Payload
- `src/app/new/page.tsx` — Organizer-Dropdown für Admins, `organizer_id` im Create-Payload

### Karte
- `src/lib/utils/sport-styles.ts` — neue Funktion `createOrganizerIcon()`: rautenförmiger Marker in Organizer-Farbe
- `src/components/map/leaflet-court-map.tsx` — Organizer-Marker statt Sport-Marker wenn `organizer_id` gesetzt
- `src/components/map/marker-cluster-group.tsx` — `getPlaceIcon()`-Hilfsfunktion für konsistentes Marker-Rendering im Cluster

### Events
- `src/components/events/event-card.tsx` — Organizer-Badge (Farbpunkt + Name) über der Ortszeile
- `src/app/events/[id]/page.tsx` — Organizer-Infoblock (Avatar/Initiale, Webseite, Instagram-Link)
- `src/app/events/new/page.tsx` — `organizer_id` wird automatisch vom gewählten Ort übernommen

---

## Ablauf: Neuen Organizer-Venue anlegen

1. Admin öffnet `/admin/organizers` → neuen Organizer anlegen (Name, Farbe, Logo, Links)
2. Admin öffnet Ortserstellung (`/new`) oder Ortsbearbeitung (`/places/[id]/edit`)
3. Im Admin-sichtbaren Feld "Organizer" den Organizer auswählen → Ort wird gespeichert mit `organizer_id`
4. Event an diesem Ort erstellen → `organizer_id` wird automatisch gesetzt
5. Auf der Karte erscheint der Ort mit einem **rautenförmigen** Marker in der Organizer-Farbe
6. Event-Karte zeigt Organizer-Badge, Event-Detailseite zeigt Organizer-Infoblock

---

## Zukünftige Erweiterungen (noch nicht implementiert)

- **Kartenfilter**: Organizer-Venues ein-/ausblenden
- **Organizer-Profilseite**: `/organizers/[slug]` mit allen Events und Orten
- **User-Rolle**: Spezielle Rolle (z.B. "organizer") darf eigene Venues anlegen
- **Events nach Organizer filtern**: Filter-Chip in der Event-Liste
- **Organizer abonnieren**: Benachrichtigungen bei neuen Events
