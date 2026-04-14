TO DO:
- DONT LOAD ALL PLACES ON EDIT-PLACE/ADD-PLACE PAGE (MAYBE ONLY THESE IN RADIUS OF 1000m?)


- CHECK OSM VALIDATION: QUICK BUTTON FOR CHANGE PLACE MATCHING OSM CHECK, BUT SHOULD BE POSSIBLE TO MAKE MORE CHANGES MANUALLY BEFORE APPROVING


#########################

 Places & Courts — Structured Attributes System

 Context

 Currently places has a flat features: string[] column that is populated from data imports but not editable via the UI. courts has no attribute/feature fields at all. The goal is a scalable system that  
 supports:
 - Place-level attributes (apply to the whole venue)
 - Court-level attributes (apply to one specific court)
 - Sport-specific attributes (only relevant for certain sports)
 - Typed attributes: boolean flags, select options, numeric values

 ---
 Attribute List

 Place-level — Infrastructure
 ┌───────────────────────┬───────────────────┬─────────┐
 │          Key          │    Label (DE)     │  Type   │
 ├───────────────────────┼───────────────────┼─────────┤
 │ lighting              │ Flutlicht         │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ roof                  │ Überdacht         │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ changing_rooms        │ Umkleidekabinen   │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ showers               │ Duschen           │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ toilets               │ Toiletten         │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ drinking_water        │ Trinkwasser       │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ bike_parking          │ Fahrradstellplatz │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ car_parking           │ Parkplatz         │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ public_transport      │ ÖPNV in der Nähe  │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ wheelchair_accessible │ Rollstuhlgerecht  │ boolean │
 ├───────────────────────┼───────────────────┼─────────┤
 │ lockers               │ Schließfächer     │ boolean │
 └───────────────────────┴───────────────────┴─────────┘

 Place-level — Services

 ┌──────────────────┬─────────────────────────┬─────────┐
 │       Key        │       Label (DE)        │  Type   │
 ├──────────────────┼─────────────────────────┼─────────┤
 │ cafe             │ Café / Kantine          │ boolean │
 ├──────────────────┼─────────────────────────┼─────────┤
 │ equipment_rental │ Geräteausleihe          │ boolean │
 ├──────────────────┼─────────────────────────┼─────────┤
 │ coaching         │ Trainer verfügbar       │ boolean │
 ├──────────────────┼─────────────────────────┼─────────┤
 │ grandstand       │ Zuschauertribüne        │ boolean │
 ├──────────────────┼─────────────────────────┼─────────┤
 │ wifi             │ WLAN                    │ boolean │
 ├──────────────────┼─────────────────────────┼─────────┤
 │ first_aid        │ Erste-Hilfe-Ausstattung │ boolean │
 └──────────────────┴─────────────────────────┴─────────┘

 Place-level — Access

 ┌─────────────────────┬─────────────────────────────┬─────────┐
 │         Key         │         Label (DE)          │  Type   │
 ├─────────────────────┼─────────────────────────────┼─────────┤
 │ paid_access         │ Kostenpflichtig             │ boolean │
 ├─────────────────────┼─────────────────────────────┼─────────┤
 │ membership_required │ Mitgliedschaft erforderlich │ boolean │
 ├─────────────────────┼─────────────────────────────┼─────────┤
 │ booking_required    │ Buchung erforderlich        │ boolean │
 ├─────────────────────┼─────────────────────────────┼─────────┤
 │ open_year_round     │ Ganzjährig geöffnet         │ boolean │
 └─────────────────────┴─────────────────────────────┴─────────┘

 Court-level — General

 ┌───────────────────┬────────────────────────┬──────────────────────────────┬───────────────────────────────────────────────────┐
 │        Key        │       Label (DE)       │             Type             │                      Sports                       │
 ├───────────────────┼────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────┤
 │ lighting          │ Flutlicht              │ boolean                      │ all                                               │
 ├───────────────────┼────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────┤
 │ roof              │ Überdacht              │ boolean                      │ all                                               │
 ├───────────────────┼────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────┤
 │ net_present       │ Netz vorhanden         │ boolean                      │ tennis, volleyball, badminton, tischtennis, padel │
 ├───────────────────┼────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────┤
 │ net_quality       │ Netzqualität           │ select (gut/mittel/schlecht) │ tennis, volleyball, badminton, tischtennis, padel │
 ├───────────────────┼────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────┤
 │ surface_condition │ Zustand der Oberfläche │ select (gut/mittel/schlecht) │ all                                               │
 ├───────────────────┼────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────┤
 │ line_markings     │ Linienmarkierungen     │ boolean                      │ all                                               │
 └───────────────────┴────────────────────────┴──────────────────────────────┴───────────────────────────────────────────────────┘

 Court-level — Sport-specific

 Basketball

 ┌─────────────────┬──────────────────────┬─────────┐
 │       Key       │      Label (DE)      │  Type   │
 ├─────────────────┼──────────────────────┼─────────┤
 │ full_court      │ Vollfeld             │ boolean │
 ├─────────────────┼──────────────────────┼─────────┤
 │ half_court      │ Halbfeld             │ boolean │
 ├─────────────────┼──────────────────────┼─────────┤
 │ hoop_count      │ Anzahl Körbe         │ number  │
 ├─────────────────┼──────────────────────┼─────────┤
 │ adjustable_hoop │ Korbhöhe einstellbar │ boolean │
 └─────────────────┴──────────────────────┴─────────┘

 Volleyball / Beachvolleyball

 ┌────────────────┬───────────────────────┬──────────────────────────────┐
 │      Key       │      Label (DE)       │             Type             │
 ├────────────────┼───────────────────────┼──────────────────────────────┤
 │ sand_quality   │ Sandqualität          │ select (gut/mittel/schlecht) │
 ├────────────────┼───────────────────────┼──────────────────────────────┤
 │ adjustable_net │ Netz höhenverstellbar │ boolean                      │
 ├────────────────┼───────────────────────┼──────────────────────────────┤
 │ court_count    │ Anzahl Felder         │ number                       │
 └────────────────┴───────────────────────┴──────────────────────────────┘

 Fußball

 ┌───────────┬────────────────────┬──────────────────────────────┐
 │    Key    │     Label (DE)     │             Type             │
 ├───────────┼────────────────────┼──────────────────────────────┤
 │ goal_type │ Torpfosten         │ select (fest/tragbar/ohne)   │
 ├───────────┼────────────────────┼──────────────────────────────┤
 │ goal_nets │ Tornetze vorhanden │ boolean                      │
 ├───────────┼────────────────────┼──────────────────────────────┤
 │ turf_type │ Kunstrasen-Typ     │ select (3G/4G/5G/Naturrasen) │
 └───────────┴────────────────────┴──────────────────────────────┘

 Tennis / Padel / Squash

 ┌──────────────┬─────────────┬─────────┐
 │     Key      │ Label (DE)  │  Type   │
 ├──────────────┼─────────────┼─────────┤
 │ ball_machine │ Ballautomat │ boolean │
 ├──────────────┼─────────────┼─────────┤
 │ hitting_wall │ Aufwärmwand │ boolean │
 └──────────────┴─────────────┴─────────┘

 Tischtennis

 ┌─────────────┬───────────────┬─────────┐
 │     Key     │  Label (DE)   │  Type   │
 ├─────────────┼───────────────┼─────────┤
 │ table_count │ Anzahl Tische │ number  │
 ├─────────────┼───────────────┼─────────┤
 │ indoor      │ Drinnen       │ boolean │
 └─────────────┴───────────────┴─────────┘

 Skatepark

 ┌───────────────────┬─────────────────┬─────────┐
 │        Key        │   Label (DE)    │  Type   │
 ├───────────────────┼─────────────────┼─────────┤
 │ beginner_friendly │ Anfängergerecht │ boolean │
 ├───────────────────┼─────────────────┼─────────┤
 │ halfpipe          │ Halfpipe        │ boolean │
 ├───────────────────┼─────────────────┼─────────┤
 │ bowl              │ Bowl            │ boolean │
 ├───────────────────┼─────────────────┼─────────┤
 │ rails             │ Rails / Ledges  │ boolean │
 ├───────────────────┼─────────────────┼─────────┤
 │ ramps             │ Rampen          │ boolean │
 └───────────────────┴─────────────────┴─────────┘

 Schwimmen

 ┌──────────────┬─────────────────┬─────────┐
 │     Key      │   Label (DE)    │  Type   │
 ├──────────────┼─────────────────┼─────────┤
 │ lane_count   │ Anzahl Bahnen   │ number  │
 ├──────────────┼─────────────────┼─────────┤
 │ pool_length  │ Beckenlänge (m) │ number  │
 ├──────────────┼─────────────────┼─────────┤
 │ outdoor_pool │ Freibad         │ boolean │
 └──────────────┴─────────────────┴─────────┘

 Klettern

 ┌───────────────┬────────────┬─────────┐
 │      Key      │ Label (DE) │  Type   │
 ├───────────────┼────────────┼─────────┤
 │ bouldering    │ Bouldern   │ boolean │
 ├───────────────┼────────────┼─────────┤
 │ lead_climbing │ Vorstieg   │ boolean │
 ├───────────────┼────────────┼─────────┤
 │ toprope       │ Toprope    │ boolean │
 └───────────────┴────────────┴─────────┘

 ---
 System Design Concept

 Core decision: code-driven definitions, DB-stored values

 Attribute definitions (key, label, type, icon, scope, applicable sports) live in a TypeScript config file — easy to add/change without DB migrations, type-safe, no admin UI needed for definitions.      

 Attribute values are stored in two relational tables — queryable, indexable, and cleanly separated from the places/courts tables.

 New DB tables

 -- Place-level attribute values
 CREATE TABLE place_attributes (
   place_id  uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
   key       text NOT NULL,
   value     text NOT NULL,           -- "true" | "false" | number | select value
   PRIMARY KEY (place_id, key)
 );

 -- Court-level attribute values
 CREATE TABLE court_attributes (
   court_id  uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
   key       text NOT NULL,
   value     text NOT NULL,
   PRIMARY KEY (court_id, key)
 );

 RLS policies: readable by all, writable by authenticated users (same pattern as courts).

 TypeScript definition format

 // src/lib/attributes/definitions.ts

 export type AttributeScope = 'place' | 'court'
 export type AttributeInputType = 'boolean' | 'select' | 'number'

 export interface AttributeDefinition {
   key: string
   label: string         // German label
   icon?: string         // lucide icon name
   scope: AttributeScope
   inputType: AttributeInputType
   options?: string[]    // for select type
   sports?: SportType[]  // undefined = applies to all sports
   category: string      // 'infrastructure' | 'services' | 'access' | 'court' | 'sport-specific'
 }

 export const ATTRIBUTE_DEFINITIONS: AttributeDefinition[] = [
   { key: 'lighting', label: 'Flutlicht', icon: 'Zap', scope: 'place', inputType: 'boolean', category: 'infrastructure' },
   { key: 'roof',     label: 'Überdacht', icon: 'Home', scope: 'place', inputType: 'boolean', category: 'infrastructure' },
   // ... etc
 ]

 // Helper to get defs relevant for a given scope + sports combo
 export function getRelevantAttributes(scope: AttributeScope, sports?: SportType[]) { ... }

 Migration strategy for existing features array

 The existing features: string[] on places contains imported strings (e.g., "Flutlicht", "Umkleidekabinen"). A one-time migration script maps these to the new keyed format and inserts into
 place_attributes. After migration, features column becomes legacy/ignored.

 ---
 Implementation Plan

 Phase 1 — DB & Types (no UI)

 1. Write migration: create place_attributes and court_attributes tables with RLS
 2. Write attribute definitions config (src/lib/attributes/definitions.ts)
 3. Write migration script to backfill existing features[] into place_attributes
 4. Update Supabase types (types.ts) to include new tables

 Phase 2 — Read-only display

 5. Update place detail page (src/app/places/[id]/page.tsx) to fetch and render place_attributes grouped by category with icons
 6. Update court display to render court_attributes inline under each court
 7. Update place list card (src/components/seo/place-list-card.tsx) to show key boolean icons (lightning bolt, roof, water, etc.)
 8. Update bottom sheet (src/components/map/place-bottom-sheet-vaul.tsx) to show top attributes

 Phase 3 — Edit UI

 9. Add attribute editor to place form (src/components/places/place-form.tsx) — checkboxes grouped by category, conditional sport-specific sections
 10. Add court attribute editor inline in the courts section of the form
 11. Wire up save to place_attributes / court_attributes tables

 Phase 4 — Filtering (optional/future)

 12. Add attribute-based filtering to map sidebar and places list page

 ---
 Files to modify

 - supabase/migrations/ — new migration file
 - src/lib/supabase/types.ts — add new table types
 - src/lib/attributes/definitions.ts — NEW: attribute definitions config
 - src/app/places/[id]/page.tsx — display attributes
 - src/components/places/place-form.tsx — edit attributes
 - src/components/seo/place-list-card.tsx — icon badges
 - src/components/map/place-bottom-sheet-vaul.tsx — quick attribute display

 Verification

 - Create a new place via form → attributes save to place_attributes table
 - Edit attributes on an existing place → changes reflect immediately on detail page
 - Sport-specific attributes only appear when the relevant sport is selected
 - Existing imported places show their migrated attributes (check a few from the import dataset)
 - Bottom sheet and list card show correct attribute icons