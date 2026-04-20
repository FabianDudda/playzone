'use client'

import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { sportIcons, sportNames } from '@/lib/utils/sport-utils'
import ScheduleDisplay from '@/components/events/schedule-display'
import BookmarkButton from '@/components/events/bookmark-button'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface PlaceEventsSectionProps {
  placeId: string
  userId?: string
}

export default function PlaceEventsSection({ placeId, userId }: PlaceEventsSectionProps) {
  const { data: events = [] } = useQuery({
    queryKey: ['place-events', placeId, userId],
    queryFn: () => database.events.getEventsByPlace(placeId, userId),
    staleTime: 2 * 60 * 1000,
  })

  if (events.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Events hier</p>
      <div className="flex flex-col gap-2">
        {events.map(event => (
          <div key={event.id} className="flex flex-col gap-1.5 border rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm leading-none">{sportIcons[event.sport] || '🏅'}</span>
                  <span className="text-xs text-muted-foreground">{sportNames[event.sport] || event.sport}</span>
                </div>
                <p className="text-sm font-medium truncate">{event.title}</p>
              </div>
              <BookmarkButton
                eventId={event.id}
                isBookmarked={event.is_bookmarked}
                userId={userId}
                size="sm"
              />
            </div>
            <ScheduleDisplay schedule={event.schedule} showNextOccurrence={false} />
            <Link
              href={`/events/${event.id}`}
              className="text-xs text-primary hover:underline self-start"
            >
              Details ansehen
            </Link>
          </div>
        ))}
      </div>
      <Link
        href={`/events?place=${placeId}`}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Alle Events hier ansehen
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
