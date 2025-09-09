'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Clock, Users, User, Edit, Trash2, Share2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { EventWithDetails } from '@/lib/supabase/types'
import { getSportBadgeClasses, sportNames, sportIcons } from '@/lib/utils/sport-utils'

interface EventPageProps {
  params: Promise<{ id: string }>
}

export default function EventPage({ params }: EventPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [event, setEvent] = useState<EventWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [eventId, setEventId] = useState<string>('')

  useEffect(() => {
    params.then(({ id }) => {
      setEventId(id)
      fetchEvent(id)
    })
  }, [params])

  const fetchEvent = async (id: string) => {
    try {
      setLoading(true)
      const eventData = await database.events.getEvent(id, user?.id)
      if (!eventData) {
        router.push('/events')
        return
      }
      setEvent(eventData)
    } catch (error) {
      console.error('Error fetching event:', error)
      router.push('/events')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinEvent = async () => {
    if (!user || !event) return

    setActionLoading(true)
    try {
      const { error } = await database.events.joinEvent(event.id, user.id)
      if (error) {
        console.error('Error joining event:', error)
        return
      }
      
      // Refresh event data to show updated participant count
      await fetchEvent(eventId)
    } catch (error) {
      console.error('Error joining event:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveEvent = async () => {
    if (!user || !event) return

    setActionLoading(true)
    try {
      const { error } = await database.events.leaveEvent(event.id, user.id)
      if (error) {
        console.error('Error leaving event:', error)
        return
      }
      
      // Refresh event data to show updated participant count
      await fetchEvent(eventId)
    } catch (error) {
      console.error('Error leaving event:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!user || !event || event.creator_id !== user.id) return

    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    setActionLoading(true)
    try {
      const { error } = await database.events.deleteEvent(event.id)
      if (error) {
        console.error('Error deleting event:', error)
        return
      }
      
      router.push('/events')
    } catch (error) {
      console.error('Error deleting event:', error)
      setActionLoading(false)
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
        weekday: 'long', 
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      })
    }
    
    const timeStr = eventDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    
    return { dateStr, timeStr, fullDate: eventDate }
  }

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading event...</div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Event not found</h3>
            <p className="text-muted-foreground mb-4">
              The event you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/events">
              <Button>Back to Events</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { dateStr, timeStr, fullDate } = formatEventDateTime(event.event_date, event.event_time)
  const isCreator = user && event.creator_id === user.id
  const canJoin = user && !event.user_joined && event.status === 'active' && 
                !isCreator && event.participant_count < event.max_players
  const hasJoined = user && event.user_joined
  const isPastEvent = fullDate < new Date()

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/events" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getSportBadgeClasses(event.sport)}`}>
                      {sportIcons[event.sport]} {sportNames[event.sport]}
                    </Badge>
                    <Badge variant={event.status === 'active' ? 'default' : 
                                  event.status === 'full' ? 'secondary' : 
                                  event.status === 'completed' ? 'outline' : 'destructive'}>
                      {event.status === 'active' ? 'Open' : 
                       event.status === 'full' ? 'Full' : 
                       event.status === 'completed' ? 'Completed' :
                       'Cancelled'}
                    </Badge>
                    {event.skill_level !== 'any' && (
                      <Badge variant="outline" className="text-xs">
                        {event.skill_level}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold">{event.title}</h1>
                </div>
                
                {isCreator && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/events/${event.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDeleteEvent}
                      disabled={actionLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            
            {event.description && (
              <CardContent>
                <p className="text-muted-foreground">{event.description}</p>
              </CardContent>
            )}
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date & Time */}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{dateStr}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeStr}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Link 
                    href={`/places/${event.place_id}`}
                    className="font-medium hover:underline"
                  >
                    {event.place_name}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {event.place_latitude.toFixed(4)}, {event.place_longitude.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Players */}
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {event.participant_count} / {event.max_players} players
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.min_players > 1 && `Minimum ${event.min_players} players`}
                  </div>
                </div>
              </div>

              {/* Creator */}
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={event.creator_avatar || ''} />
                    <AvatarFallback className="text-xs">
                      {event.creator_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {isCreator ? 'You' : event.creator_name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    (Organizer)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          {event.participants && event.participants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Participants ({event.participants.length})</CardTitle>
                <CardDescription>
                  Players who have joined this event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.participants.map((participant: any) => (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg border">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.profiles?.avatar || ''} />
                        <AvatarFallback className="text-sm">
                          {participant.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {participant.user_id === user?.id ? 'You' : participant.profiles?.name || 'Anonymous'}
                      </span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        Joined {new Date(participant.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {!isPastEvent && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!user && (
                  <Link href="/auth/signin" className="block">
                    <Button className="w-full">
                      Sign In to Join
                    </Button>
                  </Link>
                )}

                {canJoin && (
                  <Button 
                    onClick={handleJoinEvent}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    {actionLoading ? 'Joining...' : 'Join Event'}
                  </Button>
                )}

                {hasJoined && !isCreator && (
                  <Button 
                    variant="outline"
                    onClick={handleLeaveEvent}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    {actionLoading ? 'Leaving...' : 'Leave Event'}
                  </Button>
                )}

                {isCreator && (
                  <>
                    <Button variant="secondary" asChild className="w-full">
                      <Link href={`/events/${event.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Event
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleDeleteEvent}
                      disabled={actionLoading}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {actionLoading ? 'Deleting...' : 'Delete Event'}
                    </Button>
                  </>
                )}

                <Button variant="outline" className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Event
                </Button>
              </CardContent>
            </Card>
          )}

          {isPastEvent && (
            <Card>
              <CardContent className="p-4">
                <div className="text-center text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">This event has ended</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-48 bg-gray-100 rounded-b-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Map view coming soon</p>
                  <p className="text-xs mt-1">
                    {event.place_latitude.toFixed(4)}, {event.place_longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sport:</span>
                <span>{sportNames[event.sport]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Skill Level:</span>
                <span className="capitalize">{event.skill_level}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Players:</span>
                <span>{event.participant_count} / {event.max_players}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="capitalize">{event.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(event.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}