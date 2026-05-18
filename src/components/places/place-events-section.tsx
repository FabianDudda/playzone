'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { sportIcons, sportNames } from '@/lib/utils/sport-utils'
import ScheduleDisplay from '@/components/events/schedule-display'
import BookmarkButton from '@/components/events/bookmark-button'
import { Button } from '@/components/ui/button'
import { ChevronDown, ExternalLink, Share2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PlaceEventsSectionProps {
  placeId: string
  userId?: string
}

export default function PlaceEventsSection({ placeId, userId }: PlaceEventsSectionProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const { data: events = [] } = useQuery({
    queryKey: ['place-events', placeId, userId],
    queryFn: () => database.events.getEventsByPlace(placeId, userId),
    staleTime: 2 * 60 * 1000,
  })

  if (events.length === 0) return null

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Events hier</p>
      <div className="flex flex-col gap-2">
        {events.map(event => {
          const isExpanded = expandedIds.has(event.id)
          const showToggle = (event.description?.length ?? 0) > 150 || (event.event_organizers?.length ?? 0) > 0

          return (
            <div key={event.id} className="flex flex-col gap-1.5 border rounded-lg p-3">

              {/* Hero row */}
              <div className="flex gap-2.5 items-start">
                {event.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="shrink-0 w-[56px] h-[56px] rounded-[8px] object-cover mt-0.5"
                  />
                )}
                <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      {event.location_type === 'indoor' && (
                        <span className="text-xs text-muted-foreground">🏠 Indoor</span>
                      )}
                      {event.location_type === 'outdoor' && (
                        <span className="text-xs text-muted-foreground">☀️ Outdoor</span>
                      )}
                      {event.sports.map(sport => (
                        <span key={sport} className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <span className="text-sm leading-none">{sportIcons[sport] || '🏅'}</span>
                          {sportNames[sport] || sport}
                        </span>
                      ))}
                      {event.gender_restriction === 'male' && (
                        <span className="text-xs text-muted-foreground">♂ Nur Männer</span>
                      )}
                      {event.gender_restriction === 'female' && (
                        <span className="text-xs text-muted-foreground">♀ Nur Frauen</span>
                      )}
                      {event.age_restriction?.type === 'min' && event.age_restriction.min && (
                        <span className="text-xs text-muted-foreground">👤 Ab {event.age_restriction.min} Jahren</span>
                      )}
                      {event.age_restriction?.type === 'range' && event.age_restriction.min && event.age_restriction.max && (
                        <span className="text-xs text-muted-foreground">👤 {event.age_restriction.min}–{event.age_restriction.max} Jahre</span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{event.title}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        const url = `${window.location.origin}/?place=${placeId}`
                        if (navigator.share) {
                          navigator.share({ title: event.title, url }).catch(() => {})
                        } else {
                          navigator.clipboard.writeText(url)
                            .then(() => toast({ title: 'Link kopiert!' }))
                            .catch(() => toast({ title: 'Link konnte nicht kopiert werden', variant: 'destructive' }))
                        }
                      }}
                      className="rounded-full h-8 w-8"
                      aria-label="Teilen"
                    >
                      <Share2 className="h-[18px] w-[18px]" />
                    </Button>
                    <BookmarkButton
                      eventId={event.id}
                      isBookmarked={event.is_bookmarked}
                      userId={userId}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <ScheduleDisplay schedule={event.schedule} />

              {/* Description + organizers */}
              {(event.description || (event.event_organizers?.length ?? 0) > 0) && (
                <div className="flex flex-col gap-1.5">
                  {event.description && (
                    <p
                      className={`text-sm text-muted-foreground whitespace-pre-line${isExpanded ? '' : ' line-clamp-3'}`}
                      style={!isExpanded && (event.description.length ?? 0) > 150
                        ? { maskImage: 'linear-gradient(to top, transparent 0%, black 40%)' }
                        : undefined}
                    >
                      {event.description}
                    </p>
                  )}
                  {isExpanded && (event.event_organizers?.length ?? 0) > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Veranstalter</p>
                      {event.event_organizers.map(org => (
                        <div key={org.id} className="flex items-center gap-2">
                          {org.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={org.logo_url} alt={org.name} className="h-7 w-7 rounded-full object-contain flex-shrink-0" />
                          ) : (
                            <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center bg-muted text-muted-foreground font-bold text-xs">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{org.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {org.website && (
                                <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" /> Website
                                </a>
                              )}
                              {org.instagram && (
                                <a href={`https://instagram.com/${org.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                  {org.instagram.startsWith('@') ? org.instagram : `@${org.instagram}`}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showToggle && (
                    <button
                      onClick={() => toggleExpanded(event.id)}
                      className="flex items-center gap-1 text-xs border rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition-colors self-start"
                    >
                      <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      {isExpanded ? 'Weniger' : 'Mehr lesen'}
                    </button>
                  )}
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
