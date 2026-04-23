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
            <div className="flex-shrink-0 flex flex-wrap gap-1 justify-end">
              {event.sports.map(sport => (
                <Badge key={sport} variant="secondary" className="text-xs pl-1.5">
                  {sportIcons[sport]} {sportNames[sport]}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-4 pb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {event.place_id
                ? [event.place_city, event.place_street].filter(Boolean).join(', ')
                : [event.inline_location?.city, event.inline_location?.street].filter(Boolean).join(', ') || event.inline_location?.name || ''}
            </span>
          </div>
          <ScheduleDisplay schedule={event.schedule} />
          {event.event_organizers.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-1.5">Organisiert von</p>
              <div className="flex flex-col gap-1.5">
                {event.event_organizers.map(org => (
                  <div key={org.id} className="flex items-center gap-2">
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded-full object-contain flex-shrink-0" />
                    ) : (
                      <span className="inline-flex h-8 w-8 rounded-full flex-shrink-0 items-center justify-center bg-muted text-muted-foreground text-xs font-bold">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs font-medium text-muted-foreground">{org.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
