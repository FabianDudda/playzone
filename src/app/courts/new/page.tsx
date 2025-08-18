'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { SportType } from '@/lib/supabase/types'
import { database } from '@/lib/supabase/database'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import CourtMap from '@/components/map/court-map'
import { MapPin, Plus, Check } from 'lucide-react'

const SPORTS = [
  { id: 'tennis', label: 'Tennis' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'volleyball', label: 'Volleyball' },
  { id: 'spikeball', label: 'Spikeball' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'squash', label: 'Squash' },
  { id: 'pickleball', label: 'Pickleball' },
] as const

export default function NewCourtPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSports, setSelectedSports] = useState<SportType[]>([])
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Create court mutation
  const createCourtMutation = useMutation({
    mutationFn: async (courtData: {
      name: string
      latitude: number
      longitude: number
      sports: SportType[]
      description?: string
      added_by_user: string
    }) => {
      const { data, error } = await database.courts.addCourt(courtData)
      if (error) {
        throw new Error(error.message || 'Failed to create court')
      }
      return data
    },
    onSuccess: () => {
      toast({
        title: 'Court added successfully!',
        description: 'Your court has been added to the map.',
      })
      queryClient.invalidateQueries({ queryKey: ['courts'] })
      router.push('/courts')
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding court',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleMapClick = useCallback((lng: number, lat: number) => {
    setLocation({ lat, lng })
  }, [])

  const handleSportToggle = (sport: SportType) => {
    setSelectedSports(prev => 
      prev.includes(sport)
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to add a court.',
        variant: 'destructive',
      })
      return
    }

    if (!name.trim()) {
      toast({
        title: 'Court name required',
        description: 'Please enter a name for the court.',
        variant: 'destructive',
      })
      return
    }

    if (selectedSports.length === 0) {
      toast({
        title: 'Sports required',
        description: 'Please select at least one sport.',
        variant: 'destructive',
      })
      return
    }

    if (!location) {
      toast({
        title: 'Location required',
        description: 'Please click on the map to set the court location.',
        variant: 'destructive',
      })
      return
    }

    const courtData = {
      name: name.trim(),
      latitude: location.lat,
      longitude: location.lng,
      sports: selectedSports,
      description: description.trim() || undefined,
      added_by_user: user.id,
    }

    createCourtMutation.mutate(courtData)
  }

  if (!user) {
    return (
      <div className="container px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to add a court.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Court
            </CardTitle>
            <CardDescription>
              Add a sports court to help others discover great places to play
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Court Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Court Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Central Park Tennis Courts"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Sports Selection */}
              <div className="space-y-3">
                <Label>Sports Available *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SPORTS.map((sport) => (
                    <div key={sport.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={sport.id}
                        checked={selectedSports.includes(sport.id as SportType)}
                        onCheckedChange={() => handleSportToggle(sport.id as SportType)}
                      />
                      <Label 
                        htmlFor={sport.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {sport.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedSports.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedSports.map((sport) => (
                      <div key={sport} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                        <Check className="h-3 w-3" />
                        {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add details about the court (facilities, lighting, surface type, etc.)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Location Selection */}
              <div className="space-y-3">
                <Label>Court Location *</Label>
                <p className="text-sm text-muted-foreground">
                  Click on the map to set the exact location of the court. Use "My Location" button to center on your current position if needed.
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <CourtMap 
                    courts={[]}
                    onMapClick={handleMapClick}
                    height="300px"
                    allowAddCourt={true}
                    selectedLocation={location}
                  />
                </div>
                {location ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Location set:</span> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Click on the map to set court location</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={createCourtMutation.isPending}
              >
                {createCourtMutation.isPending ? 'Adding Court...' : 'Add Court'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}