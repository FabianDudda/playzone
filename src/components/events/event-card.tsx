'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EventWithDetails } from '@/lib/supabase/types'
import { getSportBadgeClasses, sportNames, sportIcons } from '@/lib/utils/sport-utils'
import ScheduleDisplay from './schedule-display'
import BookmarkButton from './bookmark-button'

interface EventCardProps {
  event: EventWithDetails
  currentUserId?: string
}

export default function EventCard({ event, currentUserId }: EventCardProps) {
  const addressParts = [event.place_city, event.place_district].filter(Boolean)

  return (
    <Card className="hover:shadow-md transition-shadow">
      {event.image_url && (
        <div className="h-36 overflow-hidden rounded-t-lg">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <Link href={`/events/${event.id}`} className="hover:underline">
              <h3 className="font-semibold text-base line-clamp-2">{event.title}</h3>
            </Link>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge className={`text-xs ${getSportBadgeClasses(event.sport)}`}>
              {sportIcons[event.sport]} {sportNames[event.sport]}
            </Badge>
            <BookmarkButton
              eventId={event.id}
              isBookmarked={event.is_bookmarked}
              userId={currentUserId}
              size="sm"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <ScheduleDisplay schedule={event.schedule} showNextOccurrence />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {event.place_name}
            {addressParts.length > 0 && ` · ${addressParts.join(', ')}`}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={event.creator_avatar || ''} />
              <AvatarFallback className="text-xs">
                {event.creator_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{event.creator_name}</span>
          </div>

          <Link href={`/events/${event.id}`}>
            <Button variant="outline" size="sm">Details</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
