'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SportType } from '@/lib/supabase/types'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'
import { Constants } from '@/lib/supabase/types'

export interface EventFilters {
  search: string
  sport: SportType | 'all'
  date: 'all' | 'today' | 'this_week' | 'this_month'
  status: 'all' | 'available' | 'full'
}

interface EventFiltersProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  showSearch?: boolean
  showSport?: boolean
  showDate?: boolean
  showStatus?: boolean
  className?: string
}

export default function EventFiltersComponent({ 
  filters, 
  onFiltersChange,
  showSearch = true,
  showSport = true, 
  showDate = true,
  showStatus = true,
  className = ""
}: EventFiltersProps) {
  const updateFilter = (key: keyof EventFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const filterComponents = []

  if (showSearch) {
    filterComponents.push(
      <Input
        key="search"
        placeholder="Search events or places..."
        value={filters.search}
        onChange={(e) => updateFilter('search', e.target.value)}
      />
    )
  }

  if (showSport) {
    filterComponents.push(
      <Select 
        key="sport"
        value={filters.sport} 
        onValueChange={(value: SportType | 'all') => updateFilter('sport', value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="All Sports" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sports</SelectItem>
          {Constants.public.Enums.sport_type.map(sport => (
            <SelectItem key={sport} value={sport}>
              {sportIcons[sport]} {sportNames[sport]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (showDate) {
    filterComponents.push(
      <Select 
        key="date"
        value={filters.date} 
        onValueChange={(value: string) => updateFilter('date', value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="All Dates" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Dates</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="this_week">This Week</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (showStatus) {
    filterComponents.push(
      <Select 
        key="status"
        value={filters.status} 
        onValueChange={(value: string) => updateFilter('status', value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="All Events" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Events</SelectItem>
          <SelectItem value="available">Available</SelectItem>
          <SelectItem value="full">Full</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  // Determine grid columns based on number of components
  const gridCols = filterComponents.length === 1 ? 'grid-cols-1' :
                   filterComponents.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                   filterComponents.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
                   'grid-cols-1 md:grid-cols-4'

  return (
    <div className={`grid ${gridCols} gap-4 ${className}`}>
      {filterComponents}
    </div>
  )
}

// Utility function to apply filters to events array
export function applyEventFilters<T extends { 
  title: string; 
  place_name?: string; 
  sport: SportType; 
  event_date: string; 
  status: string;
  participant_count: number;
  max_players: number;
}>(events: T[], filters: EventFilters): T[] {
  return events.filter(event => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesTitle = event.title.toLowerCase().includes(searchLower)
      const matchesPlace = event.place_name?.toLowerCase().includes(searchLower) || false
      if (!matchesTitle && !matchesPlace) {
        return false
      }
    }

    // Sport filter
    if (filters.sport !== 'all' && event.sport !== filters.sport) {
      return false
    }

    // Date filter
    const eventDate = new Date(event.event_date)
    const today = new Date()
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    if (filters.date === 'today' && eventDate.toDateString() !== today.toDateString()) {
      return false
    }
    if (filters.date === 'this_week' && eventDate > thisWeek) {
      return false
    }
    if (filters.date === 'this_month' && eventDate > thisMonth) {
      return false
    }

    // Status filter
    if (filters.status === 'available' && (event.status === 'full' || event.status === 'completed')) {
      return false
    }
    if (filters.status === 'full' && event.status !== 'full') {
      return false
    }

    return true
  })
}