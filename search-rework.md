# Search Rework Plan


## Result List

### 1. Section headers between places and events (biggest UX problem)
Places and events are concatenated with no separator. With 50 places, events are completely off-screen. Add section headers with counts and a divider:
- `Orte (12)` section
- `Events (3)` section


### 2. Surface content-type toggle as pill tabs
The `showOrte`/`showEvents` toggle is buried inside FilterSheet — most users won't find it. Replace with visible pill tabs at the top of the results list:
`Alle · Orte · Events`

---

## Other Improvements

### 2. Show all sports in PlaceRow
`PlaceRow` only shows the primary sport icon/color. Places with multiple sports only show one. Show all sport tags or a `+N` overflow indicator.



