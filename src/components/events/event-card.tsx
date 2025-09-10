'use client'

import Link from 'next/link'
import { MapPin, Calendar, Clock, Users, Award, LandPlot } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EventWithDetails } from '@/lib/supabase/types'
import { getSportBadgeClasses, sportNames, sportIcons } from '@/lib/utils/sport-utils'

interface EventCardProps {
  event: EventWithDetails
  currentUserId?: string
  showLocation?: boolean
  compact?: boolean
  onJoin?: (eventId: string) => void
  onLeave?: (eventId: string) => void
  actionLoading?: boolean
}

export default function EventCard({ 
  event, 
  currentUserId, 
  showLocation = true,
  compact = false,
  onJoin,
  onLeave,
  actionLoading = false
}: EventCardProps) {
  const formatAddress = (event: EventWithDetails) => {
    const parts = []
    
    if (event.place_city) {
      parts.push(event.place_city)
    }
    
    if (event.place_district) {
      parts.push(event.place_district)
    }
    
    return parts.join(', ')
  }

  const formatEventDateTime = (date: string, time: string) => {
    const eventDate = new Date(date)
    const [hours, minutes] = time.split(':')
    eventDate.setHours(parseInt(hours), parseInt(minutes))
    
    const now = new Date()
    const isToday = eventDate.toDateString() === now.toDateString()
    const isTomorrow = eventDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()
    
    let dateStr = ''
    if (isToday) {
      dateStr = 'Today'
    } else if (isTomorrow) {
      dateStr = 'Tomorrow'
    } else if (compact) {
      dateStr = eventDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    } else {
      dateStr = eventDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }
    
    const timeStr = eventDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    
    return { dateStr, timeStr }
  }

  const { dateStr, timeStr } = formatEventDateTime(event.event_date, event.event_time)
  const canJoin = currentUserId && !event.user_joined && event.status === 'active' && 
                  event.creator_id !== currentUserId && event.participant_count < event.max_players
  const isCreator = currentUserId && event.creator_id === currentUserId
  const hasJoined = currentUserId && event.user_joined

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
        <div className="flex justify-between items-center mb-2">
          <h3 className={`font-semibold line-clamp-1 ${compact ? 'text-base' : 'text-lg'}`}>
            {event.title}
          </h3>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${getSportBadgeClasses(event.sport)}`}>
              {sportIcons[event.sport]} {sportNames[event.sport]}
            </Badge>
            {event.status === 'full' && (
              <Badge variant="secondary">
                Full
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Location - only show if showLocation is true */}
        {showLocation && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LandPlot className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{event.place_name}</span>
            </div>
            {formatAddress(event) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{formatAddress(event)}</span>
              </div>
            )}
          </>
        )}

        {/* Date & Time */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>{timeStr}</span>
          </div>
        </div>

        {/* Skill Level */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Award className="h-4 w-4 flex-shrink-0" />
          <span className="capitalize">
            {event.skill_level === 'any' ? 'Every Skill Level' : event.skill_level}
          </span>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span>{event.participant_count} / {event.max_players} players</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Link href={`/events/${event.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          
          {!currentUserId && (
            <Link href="/auth/signin" className="flex-1">
              <Button size="sm" className="w-full">
                Sign In
              </Button>
            </Link>
          )}
          
          {canJoin && onJoin && (
            <Button 
              size="sm" 
              onClick={() => onJoin(event.id)}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? 'Joining...' : 'Join'}
            </Button>
          )}
          
          {hasJoined && !isCreator && onLeave && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onLeave(event.id)}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? 'Leaving...' : 'Leave'}
            </Button>
          )}
          
          {isCreator && (
            <Link href={`/events/${event.id}/edit`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">
                {compact ? 'Edit' : 'Manage'}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}