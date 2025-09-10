'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, Clock, MapPin, AlertCircle, X } from 'lucide-react'
import { EventWithDetails } from '@/lib/supabase/types'
import { getSportBadgeClasses, sportNames, sportIcons } from '@/lib/utils/sport-utils'

interface JoinEventBottomSheetProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  onExplicitClose: () => void
  event: EventWithDetails | null
  onJoin: (eventId: string, extraParticipants: number) => Promise<void>
  isLoading?: boolean
}

export default function JoinEventBottomSheet({
  isOpen,
  onClose,
  onExplicitClose,
  event,
  onJoin,
  isLoading = false
}: JoinEventBottomSheetProps) {
  const [extraParticipants, setExtraParticipants] = useState(0)
  const [error, setError] = useState('')

  if (!event) return null

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

  const { dateStr, timeStr } = formatEventDateTime(event.event_date, event.event_time)
  const totalJoiningParticipants = 1 + extraParticipants
  const remainingSlots = event.max_players - event.participant_count
  const wouldExceedCapacity = totalJoiningParticipants > remainingSlots

  const handleJoin = async () => {
    if (wouldExceedCapacity) {
      setError(`You + ${extraParticipants} extra players (${totalJoiningParticipants} total) exceeds remaining slots (${remainingSlots})`)
      return
    }

    setError('')
    try {
      await onJoin(event.id, extraParticipants)
      // Reset form and close on success
      setExtraParticipants(0)
      onExplicitClose()
    } catch (err) {
      setError('Failed to join event. Please try again.')
    }
  }

  const handleExtraParticipantsChange = (value: string) => {
    const numValue = parseInt(value) || 0
    setExtraParticipants(numValue)
    setError('') // Clear error when user changes selection
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose} modal={false}>
      <SheetContent 
        side="bottom" 
        className="max-h-[80vh] overflow-y-auto max-w-2xl mx-auto rounded-t-xl"
        hideOverlay
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Join Event</SheetTitle>
            <button
              onClick={onExplicitClose}
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>
        
        <div className="space-y-6 py-6">
          {/* Event Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${getSportBadgeClasses(event.sport)}`}>
                {sportIcons[event.sport]} {sportNames[event.sport]}
              </Badge>
              <Badge variant={event.status === 'active' ? 'default' : 'outline'}>
                {event.status === 'active' ? 'Open' : event.status}
              </Badge>
            </div>
            
            <h3 className="font-semibold text-lg">{event.title}</h3>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.place_name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{dateStr}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{timeStr}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{event.participant_count} / {event.max_players} players</span>
                <span className="text-green-600">({remainingSlots} slots remaining)</span>
              </div>
            </div>
          </div>

          {/* Extra Players Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="extra_players">Extra Players You're Bringing</Label>
              <Select 
                value={extraParticipants.toString()} 
                onValueChange={handleExtraParticipantsChange}
              >
                <SelectTrigger className={error ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select extra players" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">+0 (Just me)</SelectItem>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      +{num} extra player{num > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select how many additional players you're bringing (friends, family, etc.)
              </p>
            </div>

            {/* Validation Summary */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm">
                <div className="font-medium text-blue-900">Joining Summary:</div>
                <div className="text-blue-700 mt-1">
                  You + {extraParticipants} extra player{extraParticipants !== 1 ? 's' : ''} = {totalJoiningParticipants} total
                </div>
                <div className="text-blue-600 text-xs mt-1">
                  {wouldExceedCapacity 
                    ? `⚠️ This exceeds the ${remainingSlots} remaining slot${remainingSlots !== 1 ? 's' : ''}`
                    : `✓ Fits within the ${remainingSlots} remaining slot${remainingSlots !== 1 ? 's' : ''}`
                  }
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onExplicitClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleJoin}
              disabled={isLoading || wouldExceedCapacity}
            >
              {isLoading ? 'Joining...' : `Join Event${extraParticipants > 0 ? ` (+${extraParticipants})` : ''}`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}