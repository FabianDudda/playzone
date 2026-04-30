# Import: Bonn Run Clubs → Organizers + Events

## Context

Bootstrap the app with real run club data from https://socialrunclubs.de/bonn/.  
One organizer profile per club, one recurring event where schedule data exists.  
Incomplete data is flagged for manual follow-up rather than blocking the import.

---

## Data Extracted (9 clubs)

| Club | Schedule | GPS | Instagram | Website |
|------|----------|-----|-----------|---------|
| Absolute Run | **Wed 19:00** | 50.736264, 7.100944 | @laufladen_bonn | laufladen-bonn.de/community-run/ |
| DAV Trailtreff | ❌ unknown | ❌ none | @dav.bonn | dav-bonn.de/gruppen/trailrunning-neu/ |
| Mikkeller Running Club Bonn | **1st Sat/month** (no time) | ❌ none | @mrc_bonn | — |
| Rheinaue parkrun | **Sat 09:00** | 50.709057, 7.148883 | @rheinaue_parkrun | parkrun.com.de/rheinaue |
| Run together Bonn | ❌ Instagram only | ❌ none | @run_together_bonn | — |
| running.fast.and.far | **Thu 19:00** (+ weekends) | 50.737615, 7.113202 | @running.fast.and.far | strava.com/clubs/1835287 |
| selfcare.runclub | **Tue 18:00** | ❌ none | @selfcare.runclub | — |
| socialrunbonn | ❌ Instagram only | 50.735262, 7.102463 | @socialrunbonn | — |
| Trail Lovers Bonn | ❌ "weekly" (vague) | ❌ none | @trailloversbonn | — |

**What gets created:**
- ✅ Organizer + event (1 event, multiple slots where applicable): Absolute Run, Rheinaue parkrun, running.fast.and.far, selfcare.runclub
- ⚠️ Organizer + partial event (time TBD, edit manually): Mikkeller Running Club Bonn
- ❌ Organizer only (no schedule): DAV Trailtreff, Run together Bonn, socialrunbonn, Trail Lovers Bonn

---

## Implementation

**New file:** `scripts/import-run-clubs.ts`  
**Pattern:** mirrors `scripts/import-places.ts` (tsx, dotenv, service-role Supabase client)

### Data shape

```typescript
interface RunClubData {
  name: string
  slug: string            // matches socialrunclubs.de URL slug for logo download + dedup
  description?: string
  instagram?: string
  website?: string
  color: string           // distinct hex color per club
  location?: { latitude: number; longitude: number; name: string }
  event?: {
    title: string
    dayOfWeek?: string    // 'monday' | 'tuesday' | ... | 'saturday' | 'sunday'
    time?: string         // 'HH:MM', omit if unknown
    scheduleNote?: string // freetext note added to event description
  }
}
```

### Per-club loop

1. **Duplicate check** — query `organizers` by `slug`; skip entirely if row exists
2. **Create organizer** — insert `name`, `slug`, `description`, `instagram`, `website`, `color` via service-role client
3. **Download + upload logo** — `fetch('https://socialrunclubs.de/bonn/{slug}/img.jpg')` → `ArrayBuffer` → upload to Supabase Storage at `organizers/{id}/logo` with `upsert: true`; on failure: log warning, continue without logo
4. **Create event** (only when `event` field present):
   - `sports: ['laufen']`, `event_type: 'session'`, `status: 'active'`, `moderation_status: 'approved'`
   - `organizer_id`: newly created organizer ID
   - `schedule: { type: 'recurring', slots: [{ day_of_week, time }] }`
   - `inline_location` with GPS coords when available; omit otherwise
   - Append `scheduleNote` to `description` when time/day is unknown
   - Multiple sessions → one event, multiple entries in `slots[]`; split only when session type differs fundamentally

### Dry-run mode

`--dry-run` flag: log all intended actions, no DB writes.

### Output

After loop, print a summary table: created / skipped / errors per club, plus a list of clubs needing manual follow-up.

---

## Edge Cases

| Scenario | Strategy |
|----------|----------|
| No schedule data | Create organizer only; log `⚠️ no event created — add manually` |
| Schedule but no time (Mikkeller) | Create event with note in description: `"Zeit TBD – bitte manuell ergänzen"` |
| No GPS coords | Omit `inline_location`; user adds location via admin UI later |
| Logo download fails (404 / network) | Log error, create organizer without logo |
| Slug already in DB | Skip entirely, log `⏭ already exists` |
| Recurring events becoming stale | Not applicable — recurring schedule type has no end date |
| Club has multiple sessions per week | Merge into **one event** with multiple slots in `schedule.slots[]` — same club, same community, one place to find all their runs. Only split into separate events if the sessions differ fundamentally in type (e.g. a speedwork track session vs a social trail run could justify two events with different titles). |
| running.fast.and.far (Thu 19:00 + weekends) | One event, two slots: `{ day_of_week: 'thursday', time: '19:00' }` + `{ day_of_week: null, time: null, note: 'Weekend long/trail run — see Instagram for exact date' }`. The unknown-time slot is stored as a description note since `RecurringSlot` requires a day. Flag for manual completion. |

---

## Storage note

`uploadOrganizerLogo()` in `src/lib/supabase/storage.ts` uses browser Canvas APIs.  
The script must use `supabase.storage.from('organizers').upload(path, buffer, { upsert: true })` directly with a Node.js `Buffer` / `ArrayBuffer` instead.

---

## Run

```bash
npx tsx scripts/import-run-clubs.ts --dry-run   # preview
npx tsx scripts/import-run-clubs.ts              # real import
```

---

## Verification Checklist

- [ ] `--dry-run` shows 9 clubs, 5 with events, 4 organizer-only
- [ ] Real run: `organizers` table has 9 new rows, `events` table has +5 rows
- [ ] `/admin/organizers` — logos visible, Instagram/website links correct
- [ ] Map view — recurring events show at correct GPS pins
- [ ] Manually set time for Mikkeller Running Club event
- [ ] Manually add schedule/location for: DAV Trailtreff, Run together Bonn, socialrunbonn, Trail Lovers Bonn
