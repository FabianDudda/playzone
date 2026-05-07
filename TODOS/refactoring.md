# Refactoring Opportunities

| # | What | Files Affected | Effort | Benefit | Complexity | Priority |
|---|------|---------------|--------|---------|------------|----------|
| 1 | **Extract `formatAddress()` utility** — address assembly is copy-pasted in 3+ page files | `page.tsx`, `places/[id]/page.tsx`, `orte/[stadt]/page.tsx` | XS (30 min) | Medium | Low | High |
| 2 | **Add `is_event_only` to `PlaceMarker` type** — currently cast with `as any` in 3 places | `leaflet-court-map.tsx`, type definitions | XS (20 min) | High | Low | High |
| 3 | **Memoize `allMarkers` in `map-page-client.tsx`** — array recreated every render causing downstream re-renders | `map-page-client.tsx:130` | XS (15 min) | Medium | Low | High |
| 4 | **Centralize query config** (`staleTime`, `refetchInterval`) — currently scattered with inconsistent values | hooks, sheets, admin pages | S (1 hr) | Medium | Low | Medium |
| 5 | **Fix `as any` in `database.ts`** — 9 instances of type coercion hiding real type gaps | `database.ts` | S (2–3 hrs) | High | Low–Med | High |
| 6 | **Extract `use-map-state.ts` hook** — `map-page-client.tsx` has 11 `useState` calls with no structure | `map-page-client.tsx` | S (2 hrs) | Medium | Low | Medium |
| 7 | **Create `use-place.ts` hook** — place fetching done 5 different ways across components | `place-sheet.tsx`, page files, admin | S (1–2 hrs) | High | Low | High |
| 8 | **Extract JSON-LD schema builder** — nearly identical `SportsActivityLocation` schema in 2 pages | `page.tsx`, `places/[id]/page.tsx` | S (30 min) | Low | Low | Low |
| 9 | **Add `React.memo` to heavy sheet components** — `PlaceSheet`, `EventSheet`, `SearchSheet`, `FilterSheet` re-render on every parent state change | `src/components/map/` sheets | S (1 hr) | Medium | Low | Medium |
| 10 | **Replace N+1 organizer fetch** — `enrichEventsWithOrganizers` fetches all orgs then filters in JS instead of using `.in()` | `database.ts:61–78` | S (1 hr) | High | Low | High |
| 11 | **Centralize filtering logic** — event/place filter functions scattered across components | `event-filters.tsx`, map components | M (2–3 hrs) | Medium | Medium | Medium |
| 12 | **Reorganize `/components/map/` into subfolders** — 15+ flat files; sheets, layers, controls are all mixed | `src/components/map/` | M (2–3 hrs) | Medium | Low | Low |
| 13 | **Establish server vs. client fetch convention** — some pages SSR, some useQuery with no clear rule | All `app/` pages | M (3–4 hrs) | High | Medium | Medium |
| 14 | **Split `leaflet-court-map.tsx`** (906 lines) into marker layer, filter control, location handler | `leaflet-court-map.tsx` | L (4–5 hrs) | High | High | Medium |
| 15 | **Split `place-form.tsx`** (840 lines) into location selector, court manager, attribute editor, image uploader | `place-form.tsx` | L (4–5 hrs) | Medium | High | Low |
| 16 | **Create type guards for `EventSchedule`** — recurring/one-time discriminated union cast with `as any` in forms | `event-form.tsx`, `admin/events/page.tsx` | M (2 hrs) | Medium | Medium | Medium |
| 17 | **Create `/src/lib/transformers/`** — `mapToEventWithDetails`, `normalizeSchedule` and similar are in-file helpers | `database.ts`, multiple components | L (4 hrs) | Medium | Medium | Low |
| 18 | **Add lazy loading to image galleries** — no `loading="lazy"` on gallery `<img>` tags | `place-image-gallery.tsx` | XS (20 min) | Medium | Low | Medium |

---

**Legend**: Effort — XS < 30 min · S < 3 hrs · M < 5 hrs · L < 8 hrs

**Top picks** (high benefit, low effort/complexity): #2, #3, #10 — type fix + memoization + N+1 query. #7 (`use-place` hook) is also a strong quick win.
