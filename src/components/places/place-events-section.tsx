'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Plus, Users, Clock, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { EventWithDetails } from '@/lib/supabase/types'
import { getSportBadgeClasses, sportNames, sportIcons } from '@/lib/utils/sport-utils'

interface PlaceEventsSectionProps {
  placeId: string
  placeName: string
}

export default function PlaceEventsSection({ placeId, placeName }: PlaceEventsSectionProps) {
  const { user } = useAuth()
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlaceEvents()
  }, [placeId, user])

  const fetchPlaceEvents = async () => {
    try {
      setLoading(true)
      const eventsData = await database.events.getEventsByPlace(placeId, user?.id)
      // Only show upcoming events, sorted by date
      const upcomingEvents = eventsData
        .filter(event => new Date(event.event_date) >= new Date())
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      setEvents(upcomingEvents)
    } catch (error) {
      console.error('Error fetching place events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return

    try {
      const { error } = await database.events.joinEvent(eventId, user.id)
      if (error) {
        console.error('Error joining event:', error)
        return
      }
      
      // Refresh events to show updated participant count
      fetchPlaceEvents()
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
      fetchPlaceEvents()
    } catch (error) {
      console.error('Error leaving event:', error)
    }
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Games and activities at this location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Loading events...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Games and activities at this location</CardDescription>
          </div>
          <Link href={`/events/new?place=${placeId}&name=${encodeURIComponent(placeName)}`}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-medium mb-1">No upcoming events</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Be the first to organize a game at this location
            </p>
            <Link href={`/events/new?place=${placeId}&name=${encodeURIComponent(placeName)}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create First Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(event => {
              const { dateStr, timeStr } = formatEventDateTime(event.event_date, event.event_time)
              const canJoin = user && !event.user_joined && event.status === 'active' && 
                            event.creator_id !== user.id && event.participant_count < event.max_players
              const isCreator = user && event.creator_id === user.id
              const hasJoined = user && event.user_joined

              return (
                <div key={event.id} className="p-4 border rounded-lg space-y-3">
                  {/* Event Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getSportBadgeClasses(event.sport)}`}>
                          {sportIcons[event.sport]} {sportNames[event.sport]}
                        </Badge>
                        <Badge variant={event.status === 'active' ? 'default' : 
                                      event.status === 'full' ? 'secondary' : 'outline'}>
                          {event.status === 'active' ? 'Open' : 
                           event.status === 'full' ? 'Full' : 
                           event.status}
                        </Badge>
                      </div>
                      <h4 className="font-medium">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    {/* Date & Time */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{timeStr}</span>
                    </div>
                    
                    {/* Participants */}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{event.participant_count} / {event.max_players} players</span>
                    </div>
                  </div>

                  {/* Creator and Skill Level */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={event.creator_avatar || ''} />
                        <AvatarFallback className="text-xs">
                          {event.creator_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {isCreator ? 'You' : event.creator_name}
                      </span>
                    </div>
                    
                    {event.skill_level !== 'any' && (
                      <Badge variant="outline" className="text-xs">
                        {event.skill_level}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/events/${event.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    
                    {!user && (
                      <Link href="/auth/signin" className="flex-1">
                        <Button size="sm" className="w-full">
                          Sign In to Join
                        </Button>
                      </Link>
                    )}
                    
                    {canJoin && (
                      <Button 
                        size="sm" 
                        onClick={() => handleJoinEvent(event.id)}
                        className="flex-1"
                      >
                        Join
                      </Button>
                    )}
                    
                    {hasJoined && !isCreator && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleLeaveEvent(event.id)}
                        className="flex-1"
                      >
                        Leave
                      </Button>
                    )}
                    
                    {isCreator && (
                      <Link href={`/events/${event.id}`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">
                          Manage
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
            
            {events.length > 0 && (
              <div className="text-center pt-4">
                <Link href="/events">
                  <Button variant="outline" size="sm">
                    View All Events
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}