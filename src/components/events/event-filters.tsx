'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SportType } from '@/lib/supabase/types'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'

export interface EventFilters {
  sport: SportType | 'all'
}

interface EventFiltersProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  className?: string
}

export default function EventFiltersComponent({ 
  filters, 
  onFiltersChange,
  className = ""
}: EventFiltersProps) {
  const allowedSports: SportType[] = ['tennis', 'basketball', 'volleyball', 'hockey', 'fußball', 'tischtennis', 'beachvolleyball', 'boule', 'skatepark']

  const updateFilter = (value: SportType | 'all') => {
    onFiltersChange({ sport: value })
  }

  return (
    <div className={`w-full max-w-xs ${className}`}>
      <Select 
        value={filters.sport} 
        onValueChange={updateFilter}
      >
        <SelectTrigger>
          <SelectValue placeholder="All Sports" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sports</SelectItem>
          {allowedSports.map(sport => (
            <SelectItem key={sport} value={sport}>
              {sportIcons[sport]} {sportNames[sport]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Utility function to apply filters to events array
export function applyEventFilters<T extends { 
  sport: SportType; 
}>(events: T[], filters: EventFilters): T[] {
  return events.filter(event => {
    // Sport filter
    if (filters.sport !== 'all' && event.sport !== filters.sport) {
      return false
    }

    return true
  })
}