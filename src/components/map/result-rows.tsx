import { Heart, ChevronRight } from 'lucide-react'
import { PlaceMarker, EventForSearch } from '@/lib/supabase/types'
import { sportIcons } from '@/lib/utils/sport-utils'
import { formatDistance } from '@/lib/utils/distance'

export function SportIconBox({ sports }: { sports: string[] }) {
  const visible = sports.length <= 3 ? sports : sports.slice(0, 2)
  const overflow = sports.length > 3 ? sports.length - 2 : 0

  return (
    <div className="h-10 w-20 rounded-xl flex items-center justify-center shrink-0 glass-chip">
      {visible.map((s, i) => (
        <span key={i} className="text-base leading-none">{sportIcons[s] ?? '📍'}</span>
      ))}
      {overflow > 0 && (
        <span className="text-[11px] font-bold text-muted-foreground leading-none">+{overflow}</span>
      )}
    </div>
  )
}

export function PlaceRow({ place, distanceKm, isFavorite, onSelect }: {
  place: PlaceMarker
  distanceKm: number | null
  isFavorite: boolean
  onSelect: () => void
}) {
  const dist = distanceKm !== null ? formatDistance(distanceKm) : null

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-black/[.05] dark:border-white/[.06] active:bg-black/[.03] dark:active:bg-white/[.03] transition-colors"
    >
      <SportIconBox sports={place.sports ?? []} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-semibold truncate">{place.name}</span>
        </div>
        <div className="text-[13px] text-muted-foreground truncate">
          {[place.city, dist].filter(Boolean).join(' · ')}
        </div>
      </div>
      {isFavorite && <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0" />}
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </button>
  )
}

export function EventRow({ event, distanceKm, isBookmarked, onSelect, onClose }: {
  event: EventForSearch
  distanceKm: number | null
  isBookmarked: boolean
  onSelect?: (event: EventForSearch) => void
  onClose: () => void
}) {
  const city = event.place_city || event.inline_location?.city || event.place_name || null
  const dist = distanceKm !== null ? formatDistance(distanceKm) : null

  return (
    <button
      onClick={() => { onSelect?.(event); onClose() }}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-black/[.05] dark:border-white/[.06] active:bg-black/[.03] dark:active:bg-white/[.03] transition-colors"
    >
      <SportIconBox sports={(event.sports ?? []) as string[]} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-semibold truncate">{event.title}</span>
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Event</span>
        </div>
        <div className="text-[13px] text-muted-foreground truncate">
          {[city, dist].filter(Boolean).join(' · ')}
        </div>
      </div>
      {isBookmarked && <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0" />}
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </button>
  )
}
