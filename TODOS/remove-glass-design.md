# Remove Glass Design

## Why

Glass design (`backdrop-blur`, raw rgba values) bypasses the shadcn CSS variable token system. Alpha-based surfaces (`bg-white/80`, `bg-black/[.06]`) only look correct when rendered over a known background. Removing glass in favor of solid token-based surfaces makes every future component automatically light/dark correct with zero extra work.

---

## Replacement Decision

**Rule: every surface, border, and button uses a CSS variable token — no raw alpha values.**

| Glass thing | Replace with | Why |
|---|---|---|
| `glass-surface` (frosted panel) | `bg-background border border-border shadow-md` | solid surface, depth via shadow not blur |
| `glass-chip` (sport icon bg) | `bg-muted` | that's what `muted` is for |
| `glass-border` (alpha border) | `border-border` | standard token, adapts to dark mode |
| `glass-secondary` button variant | existing `secondary` variant | `bg-secondary` is already a subtle fill |
| `border-black/[.05]` dividers | `border-border` | token adapts to dark mode |
| `bg-background/80 backdrop-blur` | `bg-background border border-border shadow-sm` | solid, no blur |
| `bg-black/xx` on image overlays | **keep as-is** | image UX, not UI surfaces |

**Elevation model:** depth is expressed via shadow level, not blur/translucency.
- Inline / in-sheet elements: no shadow
- Floating map controls (search bar, FAB, pill): `shadow-md`
- Menus / popovers: `shadow-lg`

All tokens (`bg-background`, `bg-muted`, `bg-secondary`, `border-border`) are already defined in `globals.css` for both light and dark mode. No new CSS needed after removing the glass classes.

---

## Files to Change

### 1. Core definitions (change first)
| File | What to do |
|---|---|
| `src/app/globals.css` | Remove `.glass-chip`, `.glass-border`, `.glass-surface` utility classes |
| `src/components/ui/button.tsx` | Replace `glass-secondary` variant with `secondary` styles |

### 2. Map floating controls (primary glass usage)
| File | What to do |
|---|---|
| `src/components/map/top-search-bar.tsx` | `glass-surface` → `bg-background border border-border shadow-md` |
| `src/components/map/leaflet-court-map.tsx` | Layer/locate pill: same swap; loading overlay: `bg-background/60 backdrop-blur` → `bg-background` |
| `src/app/map-page-client.tsx` | FAB + add-court menu: `glass-surface` → `bg-background border border-border shadow-md`; loading overlay same |
| `src/components/layout/burger-menu-button.tsx` | `bg-background/90 backdrop-blur-xl` → `bg-background border border-border shadow-md` |

### 3. Sheets (use `glass-secondary` buttons + `glass-chip` / `glass-border`)
| File | What to do |
|---|---|
| `src/components/map/search-sheet.tsx` | `glass-secondary` → `secondary`; `glass-chip` → `bg-muted` |
| `src/components/map/filter-sheet.tsx` | `glass-secondary` → `secondary`; alpha borders → `border-border` |
| `src/components/map/place-sheet.tsx` | `glass-secondary` → `secondary`; `glass-chip` → `bg-muted` |
| `src/components/map/favorites-sheet.tsx` | `glass-chip` → `bg-muted`; `glass-secondary` → `secondary` |
| `src/components/map/event-sheet.tsx` | `glass-secondary` → `secondary`; `glass-border` → `border-border` |
| `src/components/layout/menu-sheet.tsx` | `glass-secondary` → `secondary` |
| `src/components/ui/drawer.tsx` | `glass-surface` → `bg-background` (drawer already sits on a solid layer) |

### 4. Other components
| File | What to do |
|---|---|
| `src/components/map/result-rows.tsx` | `glass-chip` → `bg-muted`; alpha dividers → `border-border` |
| `src/components/map/area-banner.tsx` | `bg-background/90 backdrop-blur-sm` → `bg-background border border-border shadow-sm` |
| `src/components/install/install-banner.tsx` | `bg-background/95 backdrop-blur-sm` → `bg-background border border-border shadow-sm` |
| `src/app/events/[id]/page.tsx` | `glass-secondary` → `secondary` |

### Not glass design — leave untouched
`bg-black/xx` on image thumbnails, lightbox overlays, and delete buttons in:
`place-image-gallery.tsx`, `place-form.tsx`, `new/page.tsx`, `event-form.tsx`, `admin/places/page.tsx`, `admin/organizers/page.tsx`, `profile/organizer/page.tsx`, `place-sheet.tsx` image badges, `event-sheet.tsx` image badge, `admin-mini-map.tsx` coordinate label.

---

## Current shadcn Token Reference

Defined in `src/app/globals.css` — all flip automatically in `.dark`:

| Token | Use for |
|---|---|
| `bg-background` | page bg, floating panels, drawers |
| `bg-card` | card surfaces (same value as background in current theme) |
| `bg-muted` / `bg-secondary` | subtle fills, chips, inactive states |
| `border-border` | all borders and dividers |
| `text-foreground` | body text |
| `text-muted-foreground` | secondary / placeholder text |
| `shadow-sm/md/lg` | elevation (replaces blur depth) |
