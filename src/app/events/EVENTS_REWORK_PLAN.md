 Events Rework — Final Implementation Plan                                                                                                                                                                                                                                                                                                                                                                                  
 Context

 The existing events feature (join-based, max capacity, skill levels) is unused and being replaced with a public session/group notice board. Primary use case: local sport groups (e.g. calisthenics groups)  
 announcing recurring training sessions to attract members; individuals posting one-off games to find players. No joining mechanic for the new session type — events are purely public, guests can view       
 everything, logged-in users can bookmark. The schema is designed to be extensible toward pickup (old join concept) and tournament types in future.

 ---
 Decisions Made

 ┌───────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │       Topic       │                                                Decision                                                 │
 ├───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Recurring display │ One card per event, full schedule shown                                                                 │
 ├───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Contact details   │ Per-event JSONB, pre-filled from profile name + email                                                   │
 ├───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Map integration   │ Pulsing dot on place markers with events + events section in place bottom sheet. Filter option later.   │
 ├───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Navigation        │ Profile page link (visible to guests + logged-in). No bottom nav tab for now.                           │
 ├───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Cover image       │ Yes, optional                                                                                           │
 ├───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Event expiry      │ Auto-archive past once/dates events (query-level filter). Recurring events stay active until cancelled. │
 ├───────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Language          │ German throughout                                                                                       │
 └───────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 ---
 DB Schema

 events table — full redesign

 Keep: id, created_at, updated_at, title, description, place_id, sport, creator_id

 Remove: event_date, event_time, min_players, max_players, skill_level, extra_participants_count

 Add:
 event_type  text  default 'session'   -- 'session' | 'pickup' | 'tournament'
 schedule    jsonb not null            -- see format below
 contact     jsonb not null default '{}' -- name, email, phone, instagram, website
 image_url   text  null
 status      text  default 'active'    -- 'active' | 'cancelled' | 'archived'

 Schedule JSONB format:
 // Once
 { "type": "once", "dates": [{ "date": "2025-12-15", "time": "18:00" }] }

 // Multiple specific dates
 { "type": "dates", "dates": [{ "date": "2025-12-15", "time": "18:00" }, { "date": "2025-12-22", "time": "18:00" }] }

 // Recurring
 { "type": "recurring", "slots": [{ "day": "monday", "time": "18:00" }, { "day": "wednesday", "time": "19:00" }] }

 Contact JSONB format:
 { "name": "Max Mustermann", "email": "max@example.com", "phone": "+49...", "instagram": "@handle", "website": "https://..." }

 event_bookmarks table — new

 id          uuid primary key default gen_random_uuid()
 user_id     uuid references auth.users not null
 event_id    uuid references events not null
 created_at  timestamptz default now()
 unique(user_id, event_id)

 Drop

 - event_participants table
 - RPC create_event_with_creator_participation
 - RPC get_events_with_details — replace with direct query or new RPC

 ---
 TypeScript Types (src/lib/supabase/types.ts)

 export type EventType = 'session' | 'pickup' | 'tournament'

 export interface ScheduleSlot { date: string; time: string }
 export interface RecurringSlot { day: 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday'; time: string }
 export type EventSchedule =
   | { type: 'once'; dates: ScheduleSlot[] }
   | { type: 'dates'; dates: ScheduleSlot[] }
   | { type: 'recurring'; slots: RecurringSlot[] }

 export interface EventContact {
   name?: string; email?: string; phone?: string; instagram?: string; website?: string
 }

 // Replace existing Event type
 export interface Event {
   id: string; created_at: string; updated_at: string
   title: string; description: string | null
   event_type: EventType
   place_id: string; sport: SportType
   schedule: EventSchedule; contact: EventContact
   image_url: string | null; creator_id: string
   status: 'active' | 'cancelled' | 'archived'
 }

 // Replace existing EventWithDetails
 export interface EventWithDetails extends Event {
   creator_name: string; creator_avatar: string | null
   place_name: string; place_latitude: number; place_longitude: number
   place_street: string | null; place_house_number: string | null
   place_city: string | null; place_postcode: string | null; place_district: string | null
   is_bookmarked: boolean
 }

 export interface EventBookmark {
   id: string; user_id: string; event_id: string; created_at: string
 }

 Remove: EventParticipant, SkillLevel, EventStatus (or keep EventStatus narrowed to new values)

 ---
 Database Functions (src/lib/supabase/database.ts)

 Rewrite database.events block

 getAllEvents(userId?: string): Promise<EventWithDetails[]>
 // Filter: status = 'active'. For once/dates: exclude if all dates passed. For recurring: always show.
 // Join: profiles (name, avatar), places (name, lat, lng, address fields)
 // Include is_bookmarked if userId provided

 getEvent(eventId: string, userId?: string): Promise<EventWithDetails | null>

 getEventsByPlace(placeId: string, userId?: string): Promise<EventWithDetails[]>
 // Used by place bottom sheet. Same active filter.

 getPlaceIdsWithEvents(): Promise<string[]>
 // Lightweight: SELECT DISTINCT place_id FROM events WHERE status = 'active'
 // Used by map to decide which markers get pulsing dot

 createEvent(data: Omit<Event, 'id'|'created_at'|'updated_at'>): Promise<{ data: Event; error: null }>
 // Direct insert, no participant table

 updateEvent(eventId: string, updates: Partial<Event>): Promise<{ data: Event; error: any }>

 deleteEvent(eventId: string): Promise<{ error: any }>

 getUserEvents(userId: string): Promise<EventWithDetails[]>
 // Events created by this user

 Add database.eventBookmarks block

 bookmarkEvent(userId: string, eventId: string): Promise<void>
 unbookmarkEvent(userId: string, eventId: string): Promise<void>
 getUserBookmarks(userId: string): Promise<EventWithDetails[]>
 isBookmarked(userId: string, eventId: string): Promise<boolean>

 Remove

 joinEvent, leaveEvent, getEventParticipants, removeParticipant

 ---
 Pages

 /events — src/app/events/page.tsx (full rewrite)

 - Public, no auth required
 - Fetch getAllEvents(user?.id) via React Query
 - Filter chips: sport, schedule type (einmalig / wiederkehrend)
 - Sort: by next occurrence ascending
 - Event cards with bookmark button
 - Empty state with CTA to create (for logged-in users)
 - Use German text throughout

 /events/new — src/app/events/new/page.tsx (full rewrite)

 - Requires auth (redirect to sign-in if not logged-in)
 - Fields:
   a. Titel (required)
   b. Sportart (required) — not tied to place courts this time, free selection from SPORT_ORDER
   c. Ort — PlaceMapSelector (required)
   d. Terminplanung — ScheduleEditor (once / multiple dates / recurring)
   e. Beschreibung (optional)
   f. Kontakt — ContactEditor (pre-filled: name from profile.name, email from user.email)
   g. Titelbild (optional) — reuse uploadCourtImage from storage
 - On submit: database.events.createEvent() → redirect to /events/[id]
 - Use React Query useMutation + useToast pattern

 /events/[id] — src/app/events/[id]/page.tsx (full rewrite)

 - Fully public, shareable URL
 - Sections: cover image (if set), title + sport badge, ScheduleDisplay, place card with mini map, description, ContactDisplay, creator info
 - Bookmark button (auth-gated, shows sign-in prompt if guest)
 - Creator actions: Edit button → /events/[id]/edit, Delete (with confirm dialog)
 - Past event state (for non-recurring events after last date)
 - German text throughout

 /events/[id]/edit — src/app/events/[id]/edit/page.tsx (new — didn't exist)

 - Same form as /events/new but pre-filled
 - Creator-only (redirect if not creator)

 ---
 Components

 New components to create

 src/components/events/schedule-editor.tsx
 - Three-mode toggle: Einmalig / Mehrere Termine / Wiederkehrend
 - Einmalig: single date + time picker
 - Mehrere Termine: add/remove date+time rows
 - Wiederkehrend: weekday checkboxes (Mo–So) each with a time input
 - Outputs EventSchedule object

 src/components/events/schedule-display.tsx
 - Renders EventSchedule as readable summary
 - Einmalig: "Sa, 15. Dez 2025 · 18:00 Uhr"
 - Mehrere Termine: date list
 - Wiederkehrend: "Mo 18:00 · Mi 19:00 (wöchentlich)" + "Nächster Termin: Montag in 3 Tagen"

 src/components/events/contact-editor.tsx
 - Inputs: Name, E-Mail, Telefon, Instagram, Website
 - Pre-filled with profile.name and user.email
 - All fields optional except name

 src/components/events/contact-display.tsx
 - Readonly display of EventContact
 - Only renders fields that have values
 - Icons: Phone, Mail, Globe, Instagram

 src/components/events/bookmark-button.tsx
 - Heart/bookmark icon button
 - If guest: opens sign-in prompt or navigates to sign-in
 - If logged-in: toggles bookmark via useMutation
 - Optimistic update

 Rewrite existing components

 src/components/events/event-card.tsx
 - Remove: join/leave buttons, participant count, skill level, min/max players
 - Add: ScheduleDisplay (summary line), BookmarkButton, cover image thumbnail
 - Keep: sport badge, place name, creator name+avatar
 - Props: event: EventWithDetails, currentUserId?: string

 src/components/events/event-filters.tsx
 - Keep sport filter
 - Add schedule type filter: Alle / Einmalig / Wiederkehrend
 - German labels

 Keep unchanged

 - src/components/events/place-map-selector.tsx
 - src/components/events/simple-location-map.tsx
 - src/components/events/event-location-map.tsx

 Delete

 - src/components/events/join-event-bottom-sheet.tsx

 ---
 Map Changes

 Pulsing dot on markers (src/components/map/leaflet-court-map.tsx)

 - On mount: fetch database.events.getPlaceIdsWithEvents() — returns string[]
 - Pass this set to marker rendering logic
 - For places in the set: add a small pulsing CSS dot to the marker (absolute positioned, green/primary color, CSS animation pulse)
 - CSS animation defined in a <style> tag or global CSS

 Place bottom sheet (src/components/map/place-bottom-sheet-vaul.tsx)

 - Add events section below existing content
 - Fetch database.events.getEventsByPlace(place.id, user?.id) (enabled when sheet opens)
 - If events exist: show compact event cards (title, schedule summary, sport badge, bookmark)
 - "Alle Events hier ansehen" link → /events?place=${place.id}
 - If no events: show nothing (no empty state needed here)

 ---
 Profile Page (src/app/profile/page.tsx)

 - Add "Events" link in the nav items section
 - Visible to both guests and logged-in users (currently only admin-visible)
 - For logged-in: "Meine Events" → /events?mine=true or separate /events/mine — shows events created by user + bookmarked events
 - For guests: "Events entdecken" → /events

 ---
 Files Modified Summary

 ┌────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                      File                      │                                              Change                                               │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/lib/supabase/types.ts                      │ New types: EventSchedule, EventContact, EventType, EventBookmark; rewrite Event, EventWithDetails │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/lib/supabase/database.ts                   │ Rewrite events block; add eventBookmarks block                                                    │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/app/events/page.tsx                        │ Full rewrite                                                                                      │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/app/events/new/page.tsx                    │ Full rewrite                                                                                      │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/app/events/[id]/page.tsx                   │ Full rewrite                                                                                      │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/app/events/[id]/edit/page.tsx              │ New file                                                                                          │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/app/events/layout.tsx                      │ Update metadata to German                                                                         │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/events/event-card.tsx           │ Rewrite                                                                                           │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/events/event-filters.tsx        │ Update filters, German labels                                                                     │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/map/leaflet-court-map.tsx       │ Add getPlaceIdsWithEvents fetch + pulsing dot rendering                                           │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/map/place-bottom-sheet-vaul.tsx │ Add events section                                                                                │
 ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/app/profile/page.tsx                       │ Add Events link visible to all users                                                              │
 └────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────┘

 New files:
 - src/components/events/schedule-editor.tsx
 - src/components/events/schedule-display.tsx
 - src/components/events/contact-editor.tsx
 - src/components/events/contact-display.tsx
 - src/components/events/bookmark-button.tsx
 - src/app/events/[id]/edit/page.tsx

 Deleted:
 - src/components/events/join-event-bottom-sheet.tsx

 ---
 Implementation Steps

 Split into 5 independent sessions. Each step can be started with the plan file as context.

 ---
 Step 1 — DB Foundation

 Scope: Types and database functions only. No UI changes.

 - src/lib/supabase/types.ts — add EventSchedule, EventContact, EventType, EventBookmark; rewrite Event, EventWithDetails; remove EventParticipant, SkillLevel
 - src/lib/supabase/database.ts — rewrite database.events block (remove join/leave/participants functions, add getPlaceIdsWithEvents, rewrite queries for new schema); add database.eventBookmarks block      
 - Delete src/components/events/join-event-bottom-sheet.tsx
 - Run npm run build to verify no TypeScript errors

 Does not touch: any page or component files.

 ---
 Step 2 — Shared Event Components

 Scope: All new reusable components. Depends on Step 1 types being in place.

 - src/components/events/schedule-editor.tsx — three-mode toggle (once / dates / recurring) with date+time pickers
 - src/components/events/schedule-display.tsx — renders EventSchedule as human-readable German text with next-occurrence calculation
 - src/components/events/contact-editor.tsx — editable contact fields, pre-filled with profile name + user email
 - src/components/events/contact-display.tsx — readonly contact display with icons
 - src/components/events/bookmark-button.tsx — auth-gated bookmark toggle with optimistic update
 - src/components/events/event-card.tsx — rewrite (remove join/leave, add bookmark + schedule summary + cover image)
 - src/components/events/event-filters.tsx — add schedule type filter, German labels
 - Run npm run build to verify

 Does not touch: pages, map, profile.

 ---
 Step 3 — Event Pages

 Scope: All event routes. Depends on Steps 1 + 2.

 - src/app/events/page.tsx — full rewrite (list, filters, German)
 - src/app/events/[id]/page.tsx — full rewrite (detail, public, shareable, bookmark, creator actions)
 - src/app/events/[id]/edit/page.tsx — new file (creator-only edit form, reuses components from Step 2)
 - src/app/events/new/page.tsx — full rewrite (creation form with ScheduleEditor, ContactEditor, PlaceMapSelector, image upload)
 - src/app/events/layout.tsx — update metadata to German
 - Run npm run build to verify

 Does not touch: map, profile.

 ---
 Step 4 — Map Integration

 Scope: Pulsing dot on markers + events in place bottom sheet. Depends on Step 1 (DB functions).

 - src/components/map/leaflet-court-map.tsx — fetch getPlaceIdsWithEvents() on mount; add pulsing dot CSS + marker conditional rendering for places in that set
 - src/components/map/place-bottom-sheet-vaul.tsx — add events section using getEventsByPlace(); compact event cards; "Alle Events hier" link
 - Run npm run build to verify; manually test pulsing dot + bottom sheet

 Does not touch: event pages, profile.

 ---
 Step 5 — Profile Entry Point

 Scope: Profile page nav link to events. Small, self-contained.

 - src/app/profile/page.tsx — add "Events" nav item visible to guests and logged-in users; guest sees "Events entdecken" → /events; logged-in sees "Meine Events" → /events (with creator filter or
 bookmarks)
 - Run npm run build to verify

 ---
 Verification

 1. Guest flow: Open /events without auth → see event list, click event → see full detail page, see bookmark button → clicking prompts sign-in
 2. Create flow: Sign in → /events/new → fill all fields including recurring schedule → submit → lands on /events/[id], shareable URL works without auth
 3. Map integration: Open map → places with events show pulsing dot → tap such a place → bottom sheet shows events section with correct events
 4. Profile entry: Open profile page as guest → see Events link → click → lands on /events
 5. Bookmark flow: Sign in → bookmark an event → check /events list shows bookmarked state → unbookmark works
 6. Auto-archive: A once event with a past date does not appear in /events list
 7. Recurring stays active: A recurring event appears regardless of how far in the past slots began
 8. Edit/delete: Creator visits their event → edit → changes saved → delete → confirm dialog → redirected to /events
 9. Build: npm run build passes with no TypeScript errors