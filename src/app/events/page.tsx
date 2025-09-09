'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { EventWithDetails } from '@/lib/supabase/types'
import EventCard from '@/components/events/event-card'
import EventFiltersComponent, { EventFilters, applyEventFilters } from '@/components/events/event-filters'

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    sport: 'all',
    date: 'all',
    status: 'all'
  })

  useEffect(() => {
    fetchEvents()
  }, [user])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const eventsData = await database.events.getAllEvents(user?.id)
      setEvents(eventsData)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = applyEventFilters(events, filters)

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return

    try {
      const { error } = await database.events.joinEvent(eventId, user.id)
      if (error) {
        console.error('Error joining event:', error)
        return
      }
      
      // Refresh events to show updated participant count
      fetchEvents()
    } catch (error) {
      console.error('Error joining event:', error)
    }
  }

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return

    try {
      const { error } = await database.events.leaveEvent(eventId, user.id)
      if (error) {
        console.error('Error leaving event:', error)
        return
      }
      
      // Refresh events to show updated participant count
      fetchEvents()
    } catch (error) {
      console.error('Error leaving event:', error)
    }
  }


  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading events...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">Find players and join games</p>
        </div>
        <Link href="/events/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <EventFiltersComponent 
        filters={filters} 
        onFiltersChange={setFilters}
        className="mb-6"
      />

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.sport !== 'all' || filters.date !== 'all' || filters.status !== 'all'
                ? 'Try adjusting your filters to see more events.'
                : 'Be the first to create an event for other players to join!'
              }
            </p>
            <Link href="/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              currentUserId={user?.id}
              onJoin={handleJoinEvent}
              onLeave={handleLeaveEvent}
            />
          ))}
        </div>
      )}
    </div>
  )
}