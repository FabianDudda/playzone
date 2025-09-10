'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Clock, Users, User, Edit, Trash2, Share2, Award, LandPlot, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { EventWithDetails } from '@/lib/supabase/types'
import { getSportBadgeClasses, sportNames, sportIcons } from '@/lib/utils/sport-utils'
import JoinEventBottomSheet from '@/components/events/join-event-bottom-sheet'
import EventLocationMap from '@/components/events/event-location-map'

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
  const [joinBottomSheetOpen, setJoinBottomSheetOpen] = useState(false)

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

    setJoinBottomSheetOpen(true)
  }

  const handleConfirmJoin = async (eventId: string, extraParticipants: number) => {
    if (!user) return

    setActionLoading(true)
    try {
      const { error } = await database.events.joinEvent(eventId, user.id, extraParticipants)
      if (error) {
        console.error('Error joining event:', error)
        throw new Error('Failed to join event')
      }
      
      // Refresh event data to show updated participant count
      await fetchEvent(eventId)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseJoinBottomSheet = () => {
    setJoinBottomSheetOpen(false)
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

  const formatAddress = (event: EventWithDetails) => {
    const parts = []
    
    // Build street address from street name and house number
    const streetParts = []
    if (event.place_street) {
      streetParts.push(event.place_street)
    }
    if (event.place_house_number) {
      streetParts.push(event.place_house_number)
    }
    if (streetParts.length > 0) {
      parts.push(streetParts.join(' '))
    }
    
    if (event.place_postcode) {
      parts.push(event.place_postcode)
    }
    
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

      <div className="max-w-4xl mx-auto space-y-6">
          {/* Event Details */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center mb-2">
                <h1 className="font-semibold line-clamp-1 text-lg">
                  {event.title}
                </h1>
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
              {isCreator && (
                <div className="flex gap-2 mb-2">
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
            </CardHeader>
            <CardContent className="space-y-3">
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

              {/* Description */}
              {event.description && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>{event.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle>Participants ({(() => {
                // Count actual participants (creator + non-creator joiners)
                const nonCreatorParticipants = event.participants?.filter((p: any) => p.user_id !== event.creator_id) || []
                return nonCreatorParticipants.length + 1 // +1 for creator
              })()})</CardTitle>
              <CardDescription>
                {(() => {
                  const creatorExtraCount = event.extra_participants_count || 0
                  // Only count extra players from non-creator participants to avoid double-counting
                  const nonCreatorParticipants = event.participants?.filter((p: any) => p.user_id !== event.creator_id) || []
                  const joinersExtraCount = nonCreatorParticipants.reduce((sum: number, p: any) => sum + (p.extra_participants_count || 0), 0)
                  const totalExtraPlayers = creatorExtraCount + joinersExtraCount
                  const individualCount = nonCreatorParticipants.length + 1 // +1 for creator
                  const totalCount = individualCount + totalExtraPlayers
                  
                  if (totalExtraPlayers > 0) {
                    return `${individualCount} individual participants bringing ${totalExtraPlayers} extra player${totalExtraPlayers !== 1 ? 's' : ''} (${totalCount} total)`
                  } else {
                    return 'Players participating in this event'
                  }
                })()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Event Creator */}
                {(() => {
                  const creatorExtraCount = event.extra_participants_count || 0
                  const hasExtras = creatorExtraCount > 0
                  const isCurrentUser = event.creator_id === user?.id
                  const displayName = isCurrentUser ? 'You' : event.creator_name || 'Event Creator'
                  
                  return (
                    <div className="flex items-center gap-3 p-2 rounded-lg border bg-blue-50/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={event.creator_avatar || ''} />
                        <AvatarFallback className="text-sm">
                          {event.creator_name?.charAt(0).toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{displayName}</span>
                          <Badge variant="outline" className="text-xs">
                            Creator
                          </Badge>
                          {hasExtras && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              +{creatorExtraCount} extra player{creatorExtraCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Created {new Date(event.created_at).toLocaleDateString()}</span>
                          {hasExtras && (
                            <span>• {creatorExtraCount + 1} total player{creatorExtraCount + 1 !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Other Participants */}
                {event.participants && event.participants
                  .filter((participant: any) => participant.user_id !== event.creator_id) // Filter out creator to avoid duplicate
                  .map((participant: any) => {
                  const extraCount = participant.extra_participants_count || 0
                  const hasExtras = extraCount > 0
                  const isCurrentUser = participant.user_id === user?.id
                  const displayName = isCurrentUser ? 'You' : participant.profiles?.name || 'Anonymous'
                  
                  return (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg border">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.profiles?.avatar || ''} />
                        <AvatarFallback className="text-sm">
                          {participant.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{displayName}</span>
                          {hasExtras && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              +{extraCount} extra player{extraCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Joined {new Date(participant.created_at).toLocaleDateString()}</span>
                          {hasExtras && (
                            <span>• {extraCount + 1} total player{extraCount + 1 !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-0">
            {/* Place Name */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LandPlot className="h-4 w-4 flex-shrink-0" />
              <Link 
                href={`/places/${event.place_id}`}
                className="truncate hover:underline"
              >
                {event.place_name}
              </Link>
            </div>
            {/* Place Address */}
            {formatAddress(event) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{formatAddress(event)}</span>
              </div>
            )}
          </CardContent>
          <CardContent className="p-0 pt-3">
            <EventLocationMap
              latitude={event.place_latitude}
              longitude={event.place_longitude}
              placeName={event.place_name}
              sport={event.sport}
              height="200px"
              className="rounded-b-lg overflow-hidden"
            />
          </CardContent>
        </Card>

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
      </div>

      {/* Join Event Bottom Sheet */}
      <JoinEventBottomSheet
        isOpen={joinBottomSheetOpen}
        onClose={setJoinBottomSheetOpen}
        onExplicitClose={handleCloseJoinBottomSheet}
        event={event}
        onJoin={handleConfirmJoin}
        isLoading={actionLoading}
      />
    </div>
  )
}