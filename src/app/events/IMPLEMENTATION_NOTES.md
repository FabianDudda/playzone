# Events Rework — Implementation Notes

## Steps 1–3 completed (2026-04-18)

---

## Step 1 — DB Foundation

### `src/lib/supabase/types.ts`
- Updated `Database.public.Tables.events` Row/Insert/Update to new schema:
  - **Removed:** `event_date`, `event_time`, `min_players`, `max_players`, `skill_level`, `extra_participants_count`
  - **Added:** `event_type: string`, `schedule: Json`, `contact: Json`, `image_url: string | null`, `status: string`
- Added `event_bookmarks` table to Database type (for type-safe Supabase queries)
- Added new interfaces and types:
  - `EventType = 'session' | 'pickup' | 'tournament'`
  - `ScheduleSlot { date, time }`
  - `RecurringSlot { day, time }`
  - `EventSchedule` (union: `once | dates | recurring`)
  - `EventContact { name?, email?, phone?, instagram?, website? }`
  - `Event` (standalone interface, replaces `Tables<'events'>`)
  - `EventBookmark = Tables<'event_bookmarks'>`
- Rewrote `EventWithDetails` — removed old join/participant fields, added `is_bookmarked`
- Removed type aliases: `EventParticipant`, `EventStatus`, `SkillLevel`

### `src/lib/supabase/database.ts`
- Added `mapToEventWithDetails()` helper (maps raw Supabase join result → `EventWithDetails`)
- Rewrote `database.events` block — direct queries instead of RPC:
  - `getAllEvents(userId?)` — filters `status='active'`, client-side filters past once/dates events, fetches bookmarks
  - `getEvent(eventId, userId?)` — single event with bookmark lookup
  - `getEventsByPlace(placeId, userId?)` — for place bottom sheet (Step 4)
  - `getPlaceIdsWithEvents()` — lightweight, returns `string[]` (for map markers, Step 4)
  - `getUserEvents(userId)` — events created by user
  - `createEvent(data)` — direct insert
  - `updateEvent(eventId, updates)`
  - `deleteEvent(eventId)`
- Added `database.eventBookmarks` block: `bookmarkEvent`, `unbookmarkEvent`, `getUserBookmarks`, `isBookmarked`
- **Removed:** `joinEvent`, `leaveEvent`, `getEventParticipants`, `removeParticipant`, `getEventsBySport`

### Files deleted / stubbed
- **Deleted:** `src/components/events/join-event-bottom-sheet.tsx`
- **Stubbed** (temporary, rewritten in later steps):
  - `src/app/events/page.tsx`
  - `src/app/events/new/page.tsx`
  - `src/app/events/[id]/page.tsx`
  - `src/components/events/event-card.tsx`
  - `src/components/places/place-events-section.tsx`

---

## Step 2 — Shared Event Components

### New components created

**`src/components/events/schedule-editor.tsx`**
- Three-mode button toggle: Einmalig / Mehrere Termine / Wiederkehrend
- Once/Dates: date + time inputs per slot; add/remove rows in multi-date mode
- Recurring: weekday checkboxes (Mo–So), time input appears when day is checked
- Outputs `EventSchedule` object via `onChange`

**`src/components/events/schedule-display.tsx`**
- Renders `EventSchedule` as German text
- Recurring: shows `Mo 18:00 · Mi 19:00 (wöchentlich)` + calculates next occurrence within 7 days
- Once/Dates: formats dates as `Sa, 15. Mär 2025 · 18:00 Uhr`

**`src/components/events/contact-editor.tsx`**
- Five input fields: Name, E-Mail, Telefon, Instagram, Website
- Bound to `EventContact` via `onChange`

**`src/components/events/contact-display.tsx`**
- Read-only display with icons (Mail, Phone, Globe, Instagram, User)
- Email/phone/website render as clickable links; external links open in new tab
- Renders nothing if all fields are empty

**`src/components/events/bookmark-button.tsx`**
- Bookmark icon toggle (filled when bookmarked)
- Guest: redirected to `/auth/signin`
- Logged-in: toggles via `useMutation` → `database.eventBookmarks`; invalidates event queries on success

### Rewritten components

**`src/components/events/event-card.tsx`**
- Optional cover image thumbnail
- Sport badge + bookmark button in header
- `ScheduleDisplay` summary line
- Place name + city
- Creator avatar + name
- "Details" button → `/events/[id]`
- No join/leave/participant logic

**`src/components/events/event-filters.tsx`**
- Two filters: Sportart (Select) + Termintyp (Alle / Einmalig / Wiederkehrend)
- All labels in German
- Extended sport list (14 sports)
- `applyEventFilters` updated to handle `scheduleType` filter

---

## Step 3 — Event Pages

### `src/app/events/page.tsx` (rewrite)
- React Query: `database.events.getAllEvents(user?.id)`
- Dual filters via `EventFiltersComponent`
- Sorted by next occurrence (ascending) using `getNextOccurrence()` helper
- Skeleton loading state (3 pulsing cards)
- Empty state with contextual CTA (create if logged-in, sign-in if guest)
- Create button only shown to logged-in users

### `src/app/events/[id]/page.tsx` (rewrite)
- Fully public; fetched with `database.events.getEvent(eventId, user?.id)`
- Layout: cover image → title + sport badge → schedule card → place card (address + mini map + link to place) → description → contact → creator
- Bookmark button always visible (guests redirected to sign-in)
- Creator-only: Edit button (`/events/[id]/edit`) + Delete with confirm dialog
- Cancelled status shows destructive badge

### `src/app/events/new/page.tsx` (rewrite)
- Auth-gated (shows sign-in prompt if no user)
- Cover image upload with preview (reuses `uploadCourtImage` from storage)
- Fields: Titel, Sportart (Select from SPORT_ORDER), Ort (PlaceMapSelector), Terminplanung (ScheduleEditor), Beschreibung, Kontakt (ContactEditor pre-filled with `profile.name` + `user.email`)
- Client-side validation before submit
- `database.events.createEvent()` → redirects to `/events/[id]`

### `src/app/events/[id]/edit/page.tsx` (new file)
- Creator-only (shows "Keine Berechtigung" for non-creators)
- Pre-fills all form fields from fetched event data
- Same form structure as `/events/new`
- `database.events.updateEvent()` → redirects to `/events/[id]`
- Existing image shown as preview; can be replaced or removed

---

---

## Step 4 — Map Integration (2026-04-20)

### `src/components/map/cluster-styles.css`
- Added `.event-pulse-dot` CSS class with `event-dot-pulse` keyframe animation (green pulsing dot)

### `src/lib/utils/sport-styles.ts`
- Added `hasEvents` parameter to `createSportIcon(sports, isSelected, hasEvents)` (default `false`)
- Updated `getSportsCacheKey` to include `hasEvents` so cached icons are not shared across variants
- When `hasEvents` is true, injects `<div class="event-pulse-dot"></div>` into the icon HTML

### `src/components/map/marker-cluster-group.tsx`
- Added `placeIdsWithEvents?: Set<string>` prop
- All `createSportIcon` calls (initial creation, filter update, selection change) now pass `placeIdsWithEvents.has(courtId)` as `hasEvents`
- Added `useEffect([placeIdsWithEvents])` that updates all existing marker icons when the set loads asynchronously after initial render

### `src/components/map/leaflet-court-map.tsx`
- Added React Query fetch for `database.events.getPlaceIdsWithEvents()` on mount (`staleTime: 5min`)
- Passes resulting `Set<string>` to `MarkerClusterGroup` and individual marker `createSportIcon` calls
- Added `placeIdsWithEvents` to the individual markers `useMemo` dependency array

### `src/components/places/place-events-section.tsx`
- Full implementation (was stub)
- Fetches `database.events.getEventsByPlace(placeId, userId)` via React Query
- Renders compact event cards: sport icon + name, event title, `ScheduleDisplay` (no next-occurrence), `BookmarkButton`, "Details ansehen" link
- "Alle Events hier ansehen" footer link → `/events?place=${placeId}`
- Returns `null` if no events (no empty state)

### `src/components/map/place-bottom-sheet-v2.tsx`
- Imported `PlaceEventsSection`
- Renders `<PlaceEventsSection placeId={selectedCourt.id} userId={user?.id} />` above the action buttons

---

## Step 5 — Profile Entry Point (2026-04-20)

### `src/app/profile/page.tsx`
- Changed `Events` in `NAV_ITEMS` from `adminOnly: true` to `adminOnly: false`; renamed to "Meine Events"
- Added "Events entdecken" → `/events` link to the guest nav list (above Blog)
