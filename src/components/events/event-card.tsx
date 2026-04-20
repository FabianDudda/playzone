'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EventWithDetails } from '@/lib/supabase/types'
import { getSportBadgeClasses, sportNames, sportIcons } from '@/lib/utils/sport-utils'
import ScheduleDisplay from './schedule-display'

interface EventCardProps {
  event: EventWithDetails
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex justify-between items-center gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base line-clamp-2">{event.title}</h3>
            </div>
            <div className="flex-shrink-0">
              <Badge className={`text-xs pl-1.5 ${getSportBadgeClasses(event.sport)}`}>
                {sportIcons[event.sport]} {sportNames[event.sport]}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-4 pb-4 space-y-2">
          {event.organizer_name && (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: event.organizer_color || '#6366F1' }}
              />
              <span className="text-xs font-medium" style={{ color: event.organizer_color || '#6366F1' }}>
                {event.organizer_name}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {[event.place_city, event.place_street].filter(Boolean).join(', ')}
            </span>
          </div>
          <ScheduleDisplay schedule={event.schedule} />
        </CardContent>
      </Card>
    </Link>
  )
}
