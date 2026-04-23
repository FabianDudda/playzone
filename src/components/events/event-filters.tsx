'use client'

import { SportType, EventWithDetails } from '@/lib/supabase/types'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'

export interface EventFilters {
  sport: SportType | 'all'
  city: string | 'all'
}

interface EventFiltersProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  sports: SportType[]
  cities: string[]
  className?: string
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-foreground border-border hover:bg-muted'
      }`}
    >
      {children}
    </button>
  )
}

export default function EventFiltersComponent({
  filters,
  onFiltersChange,
  sports,
  cities,
  className = '',
}: EventFiltersProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Sport chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Chip active={filters.sport === 'all'} onClick={() => onFiltersChange({ ...filters, sport: 'all' })}>
          Alle
        </Chip>
        {sports.map(sport => (
          <Chip
            key={sport}
            active={filters.sport === sport}
            onClick={() => onFiltersChange({ ...filters, sport })}
          >
            {sportIcons[sport]} {sportNames[sport]}
          </Chip>
        ))}
      </div>

      {/* City chips */}
      {cities.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Chip active={filters.city === 'all'} onClick={() => onFiltersChange({ ...filters, city: 'all' })}>
            Alle Städte
          </Chip>
          {cities.map(city => (
            <Chip
              key={city}
              active={filters.city === city}
              onClick={() => onFiltersChange({ ...filters, city })}
            >
              {city}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}

export function applyEventFilters(events: EventWithDetails[], filters: EventFilters): EventWithDetails[] {
  return events.filter(event => {
    if (filters.sport !== 'all' && !event.sports.includes(filters.sport)) return false
    if (filters.city !== 'all' && event.place_city !== filters.city) return false
    return true
  })
}

export function deriveSports(events: EventWithDetails[]): SportType[] {
  const seen = new Set<SportType>()
  return events
    .flatMap(e => e.sports)
    .filter((s): s is SportType => !!s && !seen.has(s) && !!seen.add(s))
    .sort((a, b) => (sportNames[a] ?? a).localeCompare(sportNames[b] ?? b, 'de'))
}

export function deriveCities(events: EventWithDetails[]): string[] {
  const seen = new Set<string>()
  return events
    .map(e => e.place_city)
    .filter((c): c is string => !!c && !seen.has(c) && !!seen.add(c))
    .sort()
}
