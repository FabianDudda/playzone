'use client'

import Link from 'next/link'
import { Plus, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { EventWithDetails, EventSchedule, RecurringSlot } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import EventCard from '@/components/events/event-card'
import EventFiltersComponent, { EventFilters, applyEventFilters, deriveCities, deriveSports } from '@/components/events/event-filters'

const DAY_ORDER: RecurringSlot['day'][] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]

function getNextOccurrence(event: EventWithDetails): Date {
  const schedule = event.schedule as EventSchedule
  const now = new Date()
  const far = new Date(8640000000000000)

  if (!schedule) return far

  if (schedule.type === 'recurring') {
    if (schedule.slots.length === 0) return far
    const todayIndex = (now.getDay() + 6) % 7
    let earliest: Date | null = null
    for (const slot of schedule.slots) {
      const dayIndex = DAY_ORDER.indexOf(slot.day)
      const daysUntil = (dayIndex - todayIndex + 7) % 7
      const [h, m] = slot.start_time.split(':').map(Number)
      const occ = new Date()
      occ.setDate(occ.getDate() + daysUntil)
      occ.setHours(h, m, 0, 0)
      if (occ <= now) occ.setDate(occ.getDate() + 7)
      if (!earliest || occ < earliest) earliest = occ
    }
    return earliest ?? far
  }

  const future = (schedule.dates || [])
    .map(d => new Date(`${d.date}T${d.start_time || '00:00'}`))
    .filter(d => d > now)
    .sort((a, b) => a.getTime() - b.getTime())

  return future[0] ?? far
}

export default function EventsPage() {
  const { user, isAdmin } = useAuth()
  const [filters, setFilters] = useState<EventFilters>({ sport: 'all', city: 'all' })

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', user?.id],
    queryFn: () => database.events.getAllEvents(user?.id),
  })

  const sports = deriveSports(events)
  const cities = deriveCities(events)
  const filtered = applyEventFilters(events, filters).sort(
    (a, b) => getNextOccurrence(a).getTime() - getNextOccurrence(b).getTime()
  )

  return (
    <div className="container px-4 py-6 max-w-xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kostenlose Angebote in deiner Nähe
          </p>
        </div>
        {isAdmin && (
          <Link href="/events/new">
            <Button size="sm" className="pr-4">
              <Plus className="h-4 w-4 mr-1" />
              Erstellen <span className="ml-1 text-xs opacity-60">(Admin)</span>
            </Button>
          </Link>
        )}
      </div>

      <EventFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        sports={sports}
        cities={cities}
        className="mb-5"
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">Keine Events gefunden</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filters.sport !== 'all' || filters.city !== 'all'
                ? 'Versuche die Filter anzupassen.'
                : 'Noch keine Events in deiner Gegend.'}
            </p>
            {isAdmin && (
              <Link href="/events/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Event erstellen
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
