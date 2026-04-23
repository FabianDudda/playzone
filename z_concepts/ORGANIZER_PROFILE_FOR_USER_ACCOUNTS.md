# Concept: Organizer Profile as User Account Feature (Option A)

Registered users (not guests) can create a persistent organizer profile linked to their account. This profile represents the organization or person behind their events and is reused across all events they create.

## Profile creation
- One-time setup in a dedicated page (e.g. under profile/settings: "Veranstalter-Profil erstellen")
- Fields: name, slug, description, logo, website, instagram, email, phone, titelbilder
- Each user account can have one organizer profile
- Profile starts with `verified: false` — admin can verify it later (optional badge)

## Linking to events
- When a registered user creates an event and they have an organizer profile, the form shows a toggle: "Als [Veranstalter-Name] einreichen"
- If toggled on, the organizer is automatically linked to the event — no manual selection needed
- If toggled off, the event is submitted without an organizer

## Moderation
- Organizer profiles from non-admins start as pending, similar to events
- Admin can review, edit, verify, or delete them
- Admins can also manually link any organizer to any event afterwards

## Data model change needed
- Add `user_id` (or `owner_id`) FK on the `organizers` table linking to `profiles`
- Or add `organizer_id` FK on `profiles` table

## Guests
- Cannot create organizer profiles
- Submit events without organizer — admin can link one manually if needed

## Key advantage
- Organizer profile is created once and reused across all events — no duplication, clean data
