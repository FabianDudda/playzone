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
import { reverseGeocode, AddressComponents } from '@/lib/geocoding'
import { uploadCourtImage, UploadProgress } from '@/lib/supabase/storage'
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
import { MapPin, Plus, Check, Upload, X, Image, Loader2, RefreshCcw } from 'lucide-react'

const SPORTS = [
  { id: 'fußball', label: 'Fußball' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'tischtennis', label: 'Tischtennis' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'volleyball', label: 'Volleyball' },
  { id: 'beachvolleyball', label: 'Beachvolleyball' },
  { id: 'spikeball', label: 'Spikeball' },
  { id: 'boule', label: 'Boule' },
  { id: 'skatepark', label: 'Skatepark' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'squash', label: 'Squash' },
  { id: 'pickleball', label: 'Pickleball' },
] as const

const SURFACE_TYPES = [
  'Rasen',
  'Hartplatz',
  'Asphalt',
  'Kunststoffbelag',
  'Asche',
  'Kunstrasen',
  'Sonstiges',
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
  const [address, setAddress] = useState<AddressComponents>({})
  const [isDetectingAddress, setIsDetectingAddress] = useState(false)
  const [addressAutoDetected, setAddressAutoDetected] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

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
      address?: AddressComponents
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
        import_date: new Date().toISOString(),
        // Include address information if available
        street: placeData.address?.street || null,
        house_number: placeData.address?.house_number || null,
        city: placeData.address?.city || null,
        county: placeData.address?.county || null,
        state: placeData.address?.state || null,
        country: placeData.address?.country || null,
        postcode: placeData.address?.postcode || null,
        district: placeData.address?.district || null
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

  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    setLocation({ lat, lng })
    setIsDetectingAddress(true)
    setAddressAutoDetected(false)
    
    try {
      const addressComponents = await reverseGeocode(lat, lng)
      
      if (addressComponents) {
        setAddress(addressComponents)
        setAddressAutoDetected(true)
        toast({
          title: 'Address detected',
          description: 'Address information has been auto-filled. You can edit it if needed.',
        })
      } else {
        // Clear previous address if detection failed
        setAddress({})
        toast({
          title: 'Address detection failed',
          description: 'Please enter the address manually.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error detecting address:', error)
      setAddress({})
      toast({
        title: 'Address detection error',
        description: 'Failed to detect address. Please enter it manually.',
        variant: 'destructive',
      })
    } finally {
      setIsDetectingAddress(false)
    }
  }, [toast])

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

  const updateAddressField = (field: keyof AddressComponents, value: string) => {
    setAddress(prev => ({
      ...prev,
      [field]: value.trim() || undefined
    }))
    // Mark as manually edited if user changes anything
    if (addressAutoDetected && value.trim()) {
      setAddressAutoDetected(false)
    }
  }

  const clearAddress = () => {
    setAddress({})
    setAddressAutoDetected(false)
  }
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 10MB.',
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
    setUploadProgress(null)
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

    // Handle image upload if present
    let imageUrl: string | undefined
    
    if (imageFile) {
      try {
        setIsUploadingImage(true)
        setUploadProgress({ loaded: 0, total: 100, percentage: 0 })
        
        const uploadResult = await uploadCourtImage(imageFile, (progress) => {
          setUploadProgress(progress)
        })
        
        imageUrl = uploadResult.url
        
        toast({
          title: 'Image uploaded successfully',
          description: 'Your court image has been uploaded.',
        })
      } catch (error) {
        console.error('Image upload failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
        
        toast({
          title: 'Image upload failed',
          description: errorMessage,
          variant: 'destructive',
        })
        
        // Don't prevent form submission if image upload fails
        // User can try again later or submit without image
        imageUrl = undefined
      } finally {
        setIsUploadingImage(false)
        setUploadProgress(null)
      }
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
      courts,
      address: Object.values(address).some(v => v) ? address : undefined
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
                          Upload a photo of the court (JPG, PNG, WebP up to 10MB)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Large images will be automatically compressed for faster loading
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

              {/* Address Information */}
              {location && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Address Information</Label>
                    {address && Object.values(address).some(v => v) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearAddress}
                        className="text-sm"
                      >
                        <RefreshCcw className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  {isDetectingAddress && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Detecting address information...</span>
                    </div>
                  )}
                  
                  {addressAutoDetected && !isDetectingAddress && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                      <Check className="h-4 w-4" />
                      <span>Address auto-detected. You can edit the fields below if needed.</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        placeholder="e.g., 123 Main Street"
                        value={address.street && address.house_number ? 
                          `${address.street} ${address.house_number}` : 
                          address.street || ''
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          // Try to split into street and house number if possible
                          const parts = value.trim().split(' ')
                          const possibleNumber = parts[parts.length - 1]
                          if (parts.length > 1 && /^\d+[a-zA-Z]?$/.test(possibleNumber)) {
                            updateAddressField('street', parts.slice(0, -1).join(' '))
                            updateAddressField('house_number', possibleNumber)
                          } else {
                            updateAddressField('street', value)
                          }
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="e.g., New York"
                        value={address.city || ''}
                        onChange={(e) => updateAddressField('city', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        placeholder="e.g., NY"
                        value={address.state || ''}
                        onChange={(e) => updateAddressField('state', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        placeholder="e.g., United States"
                        value={address.country || ''}
                        onChange={(e) => updateAddressField('country', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postcode">Postal Code</Label>
                      <Input
                        id="postcode"
                        placeholder="e.g., 10001"
                        value={address.postcode || ''}
                        onChange={(e) => updateAddressField('postcode', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {address.district && (
                    <div className="space-y-2">
                      <Label htmlFor="district">District/Neighborhood</Label>
                      <Input
                        id="district"
                        placeholder="e.g., Manhattan"
                        value={address.district || ''}
                        onChange={(e) => updateAddressField('district', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={createCourtMutation.isPending || isUploadingImage}
              >
                {isUploadingImage ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading Image...
                    {uploadProgress && (
                      <span className="text-sm">({uploadProgress.percentage.toFixed(0)}%)</span>
                    )}
                  </div>
                ) : createCourtMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding Court...
                  </div>
                ) : (
                  'Add Court'
                )}
              </Button>

              {/* Upload Progress Bar */}
              {isUploadingImage && uploadProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Uploading image...</span>
                    <span>{uploadProgress.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}