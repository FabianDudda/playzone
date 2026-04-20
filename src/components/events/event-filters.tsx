'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SportType, EventWithDetails } from '@/lib/supabase/types'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'

export interface EventFilters {
  sport: SportType | 'all'
  city: string | 'all'
}

interface EventFiltersProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  cities: string[]
  className?: string
}

const ALLOWED_SPORTS: SportType[] = [
  'fußball', 'basketball', 'tischtennis', 'tennis', 'beachvolleyball',
  'volleyball', 'skatepark', 'boule', 'badminton', 'calisthenics',
  'laufen', 'klettern', 'padel', 'hockey',
]

export default function EventFiltersComponent({
  filters,
  onFiltersChange,
  cities,
  className = '',
}: EventFiltersProps) {
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      <Select
        value={filters.sport}
        onValueChange={(v) => onFiltersChange({ ...filters, sport: v as SportType | 'all' })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Alle Sportarten" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Sportarten</SelectItem>
          {ALLOWED_SPORTS.map(sport => (
            <SelectItem key={sport} value={sport}>
              {sportIcons[sport]} {sportNames[sport]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {cities.length > 0 && (
        <Select
          value={filters.city}
          onValueChange={(v) => onFiltersChange({ ...filters, city: v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Alle Städte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Städte</SelectItem>
            {cities.map(city => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

export function applyEventFilters(events: EventWithDetails[], filters: EventFilters): EventWithDetails[] {
  return events.filter(event => {
    if (filters.sport !== 'all' && event.sport !== filters.sport) return false
    if (filters.city !== 'all' && event.place_city !== filters.city) return false
    return true
  })
}

export function deriveCities(events: EventWithDetails[]): string[] {
  const seen = new Set<string>()
  return events
    .map(e => e.place_city)
    .filter((c): c is string => !!c && !seen.has(c) && !!seen.add(c))
    .sort()
}
