'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { SportType } from '@/lib/supabase/types'
import { database } from '@/lib/supabase/database'
import { useMutation, useQueryClient } from '@tanstack/react-query'
// Dynamic import to prevent SSR issues with Leaflet
const LeafletCourtMap = dynamic(() => import('@/components/map/leaflet-court-map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
})
import { MapPin, Plus, Check, Upload, X, Image } from 'lucide-react'

const SPORTS = [
  { id: 'tennis', label: 'Tennis' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'volleyball', label: 'Volleyball' },
  { id: 'spikeball', label: 'Spikeball' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'squash', label: 'Squash' },
  { id: 'pickleball', label: 'Pickleball' },
] as const

const SURFACE_TYPES = [
  'Hard Court',
  'Clay',
  'Grass',
  'Asphalt',
  'Concrete',
  'Hardwood',
  'Sand',
  'Synthetic/Rubber',
  'Artificial Turf',
  'Other'
] as const

interface CourtDetails {
  sport: SportType
  quantity: number
  surface: string
  notes: string
}

export default function NewCourtPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSports, setSelectedSports] = useState<SportType[]>([])
  const [courtDetails, setCourtDetails] = useState<Record<SportType, CourtDetails>>({})
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Create court mutation
  const createCourtMutation = useMutation({
    mutationFn: async (placeData: {
      name: string
      latitude: number
      longitude: number
      sports: SportType[]
      description?: string
      image_url?: string
      added_by_user: string
      courts: CourtDetails[]
    }) => {
      // First create the place
      const { data: place, error: placeError } = await database.courts.addCourt({
        name: placeData.name,
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        sports: placeData.sports,
        description: placeData.description,
        image_url: placeData.image_url,
        added_by_user: placeData.added_by_user,
        source: 'user_submitted',
        import_date: new Date().toISOString()
      })
      
      if (placeError || !place) {
        throw new Error(placeError?.message || 'Failed to create place')
      }
      
      // Then create individual court records
      if (placeData.courts.length > 0) {
        const courtPromises = placeData.courts.map(court => 
          database.courtDetails.addCourt({
            place_id: place.id,
            sport: court.sport,
            quantity: court.quantity,
            surface: court.surface || null,
            notes: court.notes || null
          })
        )
        
        const courtResults = await Promise.all(courtPromises)
        const courtErrors = courtResults.filter(result => result.error)
        
        if (courtErrors.length > 0) {
          console.error('Some courts failed to create:', courtErrors)
          // Continue anyway - we have the place created
        }
      }
      
      return place
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
    setSelectedSports(prev => {
      const isRemoving = prev.includes(sport)
      
      if (isRemoving) {
        // Remove sport and its details
        const newDetails = { ...courtDetails }
        delete newDetails[sport]
        setCourtDetails(newDetails)
        return prev.filter(s => s !== sport)
      } else {
        // Add sport with default details
        setCourtDetails(prev => ({
          ...prev,
          [sport]: {
            sport,
            quantity: 1,
            surface: 'Hard Court',
            notes: ''
          }
        }))
        return [...prev, sport]
      }
    })
  }
  
  const updateCourtDetails = (sport: SportType, field: keyof CourtDetails, value: string | number) => {
    setCourtDetails(prev => ({
      ...prev,
      [sport]: {
        ...prev[sport],
        [field]: value
      }
    }))
  }
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 5MB.',
          variant: 'destructive',
        })
        return
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file (JPG, PNG, WebP).',
          variant: 'destructive',
        })
        return
      }
      
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
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

    // Validate court details
    for (const sport of selectedSports) {
      const details = courtDetails[sport]
      if (!details || details.quantity < 1) {
        toast({
          title: 'Invalid court details',
          description: `Please specify a valid number of courts for ${sport}.`,
          variant: 'destructive',
        })
        return
      }
    }

    if (!location) {
      toast({
        title: 'Location required',
        description: 'Please click on the map to set the court location.',
        variant: 'destructive',
      })
      return
    }

    // TODO: Handle image upload to storage service
    let imageUrl: string | undefined
    
    if (imageFile) {
      // For now, we'll skip image upload - implement with your preferred storage solution
      console.log('Image upload not yet implemented:', imageFile.name)
    }
    
    const courts = Object.values(courtDetails)
    
    const placeData = {
      name: name.trim(),
      latitude: location.lat,
      longitude: location.lng,
      sports: selectedSports,
      description: description.trim() || undefined,
      image_url: imageUrl,
      added_by_user: user.id,
      courts
    }

    createCourtMutation.mutate(placeData)
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

              {/* Court Details for Each Sport */}
              {selectedSports.length > 0 && (
                <div className="space-y-4">
                  <Label className="text-base font-medium">Court Details</Label>
                  <div className="space-y-4">
                    {selectedSports.map((sport) => (
                      <Card key={sport} className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Check className="h-4 w-4 text-primary" />
                          <h4 className="font-medium">{sport.charAt(0).toUpperCase() + sport.slice(1)}</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`quantity-${sport}`}>Number of Courts</Label>
                            <Input
                              id={`quantity-${sport}`}
                              type="number"
                              min="1"
                              max="20"
                              value={courtDetails[sport]?.quantity || 1}
                              onChange={(e) => updateCourtDetails(sport, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`surface-${sport}`}>Surface Type</Label>
                            <Select
                              value={courtDetails[sport]?.surface || 'Hard Court'}
                              onValueChange={(value) => updateCourtDetails(sport, 'surface', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select surface" />
                              </SelectTrigger>
                              <SelectContent>
                                {SURFACE_TYPES.map((surface) => (
                                  <SelectItem key={surface} value={surface}>
                                    {surface}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor={`notes-${sport}`}>Notes (Optional)</Label>
                            <Textarea
                              id={`notes-${sport}`}
                              placeholder={`Additional details about the ${sport} court(s)...`}
                              value={courtDetails[sport]?.notes || ''}
                              onChange={(e) => updateCourtDetails(sport, 'notes', e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

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

              {/* Image Upload */}
              <div className="space-y-3">
                <Label>Court Image (Optional)</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Court preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        {imageFile?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <Label 
                          htmlFor="image-upload" 
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Image
                        </Label>
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <p className="text-sm text-muted-foreground">
                          Upload a photo of the court (JPG, PNG, WebP up to 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Selection */}
              <div className="space-y-3">
                <Label>Court Location *</Label>
                <p className="text-sm text-muted-foreground">
                  Click on the map to set the exact location of the court. Use "My Location" button to center on your current position if needed.
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <LeafletCourtMap 
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