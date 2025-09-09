'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Clock, Users, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { PlaceWithCourts, SportType, SkillLevel } from '@/lib/supabase/types'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'
import PlaceMapSelector from '@/components/events/place-map-selector'

interface EventFormData {
  title: string
  description: string
  place_id: string
  sport: SportType | ''
  event_date: string
  event_time: string
  min_players: number
  max_players: number
  skill_level: SkillLevel
}

export default function NewEventPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithCourts | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    place_id: '',
    sport: '',
    event_date: '',
    event_time: '',
    min_players: 2,
    max_players: 8,
    skill_level: 'any'
  })

  // Store pre-selected place ID from URL parameters
  const preSelectedPlaceId = searchParams.get('place') || ''

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
    
    // Set pre-selected place ID in form data if it exists
    if (preSelectedPlaceId && !formData.place_id) {
      setFormData(prev => ({ ...prev, place_id: preSelectedPlaceId }))
    }
  }, [user, preSelectedPlaceId, formData.place_id])

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setFormData(prev => ({
      ...prev,
      event_date: tomorrow.toISOString().split('T')[0]
    }))
  }, [])

  const handlePlaceSelect = (placeId: string, place: PlaceWithCourts) => {
    setSelectedPlace(place)
    setFormData(prev => ({ ...prev, place_id: placeId, sport: '' })) // Reset sport when place changes
    setErrors(prev => ({ ...prev, place_id: '' })) // Clear place error
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required'
    }

    if (!formData.place_id) {
      newErrors.place_id = 'Please select a location'
    }

    if (!formData.sport) {
      newErrors.sport = 'Please select a sport'
    }

    if (!formData.event_date) {
      newErrors.event_date = 'Event date is required'
    } else {
      const eventDate = new Date(formData.event_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (eventDate < today) {
        newErrors.event_date = 'Event date must be today or in the future'
      }
    }

    if (!formData.event_time) {
      newErrors.event_time = 'Event time is required'
    }

    if (formData.min_players < 1) {
      newErrors.min_players = 'Minimum players must be at least 1'
    }

    if (formData.max_players < formData.min_players) {
      newErrors.max_players = 'Maximum players must be greater than or equal to minimum players'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      const eventData = {
        ...formData,
        sport: formData.sport as SportType,
        creator_id: user.id,
        status: 'active' as const
      }

      const { data, error } = await database.events.createEvent(eventData)
      
      if (error) {
        console.error('Error creating event:', error)
        setErrors({ submit: 'Failed to create event. Please try again.' })
        return
      }

      // Redirect to the new event page
      router.push(`/events/${data.id}`)
    } catch (error) {
      console.error('Error creating event:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const availableSports = selectedPlace?.courts?.map(c => c.sport) || []

  if (!user) {
    return null // Will redirect to sign in
  }

  return (
    <div className="container px-4 py-6 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/events" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create New Event</h1>
        <p className="text-muted-foreground">Organize a game and find players to join you</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>
              Fill in the details for your event. Make sure to provide clear information 
              to attract the right players.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Event Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Casual Tennis Match, Weekly Basketball Game"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add any additional details about the game, rules, or what players should bring..."
                rows={3}
              />
            </div>

            {/* Location - Map Selector */}
            <div className="space-y-2">
              <Label>Location *</Label>
              <PlaceMapSelector
                selectedPlaceId={formData.place_id}
                onPlaceSelect={handlePlaceSelect}
                preSelectedPlaceId={preSelectedPlaceId}
                height="350px"
              />
              {errors.place_id && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.place_id}
                </p>
              )}
            </div>

            {/* Sport */}
            <div className="space-y-2">
              <Label htmlFor="sport">Sport *</Label>
              <Select 
                value={formData.sport} 
                onValueChange={(value: SportType) => {
                  setFormData(prev => ({ ...prev, sport: value }))
                  setErrors(prev => ({ ...prev, sport: '' }))
                }}
                disabled={!formData.place_id}
              >
                <SelectTrigger className={errors.sport ? 'border-red-500' : ''}>
                  <SelectValue placeholder={formData.place_id ? "Select a sport" : "Select location first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSports.length > 0 ? (
                    [...new Set(availableSports)].map(sport => (
                      <SelectItem key={sport} value={sport}>
                        <div className="flex items-center gap-2">
                          <span>{sportIcons[sport]}</span>
                          <span>{sportNames[sport]}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {formData.place_id ? 'No sports available at this location' : 'Select a location first'}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {errors.sport && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.sport}
                </p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, event_date: e.target.value }))
                      setErrors(prev => ({ ...prev, event_date: '' }))
                    }}
                    className={`pl-10 ${errors.event_date ? 'border-red-500' : ''}`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {errors.event_date && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.event_date}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, event_time: e.target.value }))
                      setErrors(prev => ({ ...prev, event_time: '' }))
                    }}
                    className={`pl-10 ${errors.event_time ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.event_time && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.event_time}
                  </p>
                )}
              </div>
            </div>

            {/* Players */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_players">Minimum Players</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="min_players"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.min_players}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      setFormData(prev => ({ 
                        ...prev, 
                        min_players: value,
                        max_players: Math.max(value, prev.max_players)
                      }))
                      setErrors(prev => ({ ...prev, min_players: '' }))
                    }}
                    className={`pl-10 ${errors.min_players ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.min_players && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.min_players}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_players">Maximum Players</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="max_players"
                    type="number"
                    min={formData.min_players}
                    max="50"
                    value={formData.max_players}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || formData.min_players
                      setFormData(prev => ({ ...prev, max_players: value }))
                      setErrors(prev => ({ ...prev, max_players: '' }))
                    }}
                    className={`pl-10 ${errors.max_players ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.max_players && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.max_players}
                  </p>
                )}
              </div>
            </div>

            {/* Skill Level */}
            <div className="space-y-2">
              <Label htmlFor="skill_level">Skill Level</Label>
              <Select 
                value={formData.skill_level} 
                onValueChange={(value: SkillLevel) => 
                  setFormData(prev => ({ ...prev, skill_level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select skill level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Level</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Link href="/events" className="flex-1">
                <Button variant="outline" className="w-full" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}