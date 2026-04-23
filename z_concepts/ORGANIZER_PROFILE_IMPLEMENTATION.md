# Implementation Concept: Organizer Profile for Users

## 1. DB changes (SQL)

```sql
ALTER TABLE organizers ADD COLUMN owner_id uuid REFERENCES profiles(id);
ALTER TABLE organizers ADD COLUMN verified boolean DEFAULT false;

CREATE POLICY "Users can create their own organizer"
  ON organizers FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own organizer"
  ON organizers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
```

## 2. Types (types.ts)
- Add `owner_id: string | null` and `verified: boolean` to organizers Row/Insert/Update

## 3. Database methods (database.ts)
- Add `getByOwner(userId)` — fetch user's own organizer via `eq('owner_id', userId)`
- Add `createForUser(userId, data)` — sets `owner_id: userId`, `verified: false`

## 4. New page: /profile/organizer
- Single page, create vs edit state based on whether user has an organizer
- Reuses logo upload, cover upload, all existing form components
- Pre-generates UUID for image uploads before first save
- Shows `verified` badge if admin approved

## 5. Profile page nav
- Add "Veranstalter-Profil" nav item (loggedInOnly: true)

## 6. Event form integration
- New prop: `userOrganizer: Organizer | null`
- Toggle in Kontakt section: "Als [Name] einreichen"
- Toggle on → adds organizer to form.organizerIds
- Toggle off → removes it
- Existing admin Veranstalter selector stays unchanged below

## 7. Admin moderation
- "Nicht verifiziert" section in /admin/organizers listing owner_id IS NOT NULL + verified = false
- "Verifizieren" button sets verified: true
- Verified organizers show a checkmark badge in list

## 8. Moderation decision
- Organizer profiles are immediately active (no pending state)
- Admin verifies later — adds a checkmark badge
- Events are already moderated separately

## Implementation order
1. SQL migration
2. types.ts + database.ts
3. /profile/organizer page
4. Profile nav item
5. Event form userOrganizer toggle
6. new/page.tsx + edit/page.tsx pass userOrganizer
7. Admin verification UI
