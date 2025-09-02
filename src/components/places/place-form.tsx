'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { SportType, PlaceWithCourts } from '@/lib/supabase/types'
import { reverseGeocode, AddressComponents } from '@/lib/geocoding'
import { uploadCourtImage, UploadProgress } from '@/lib/supabase/storage'
import { MapPin, Check, Upload, X, Image, Loader2, RefreshCcw, Save, AlertCircle } from 'lucide-react'

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

interface PlaceFormData {
  name: string
  description: string
  selectedSports: SportType[]
  courtDetails: Partial<Record<SportType, CourtDetails>>
  location: { lat: number; lng: number } | null
  address: AddressComponents
  imageFile: File | null
  imageUrl?: string | null
}

interface PlaceFormProps {
  mode: 'create' | 'edit'
  initialData?: PlaceWithCourts
  onSubmit: (data: PlaceFormData) => Promise<void>
  isLoading: boolean
  submitButtonText?: string
  title: string
  description: string
  showCommunityMessage?: boolean
}

export default function PlaceForm({
  mode,
  initialData,
  onSubmit,
  isLoading,
  submitButtonText,
  title,
  description,
  showCommunityMessage = false
}: PlaceFormProps) {
  const { toast } = useToast()
  
  // Initialize form state from props or defaults
  const [name, setName] = useState(initialData?.name || '')
  const [desc, setDesc] = useState(initialData?.description || '')
  const [selectedSports, setSelectedSports] = useState<SportType[]>(() => {
    if (initialData?.courts?.length > 0) {
      return [...new Set(initialData.courts.map(court => court.sport))]
    }
    return initialData?.sports || []
  })
  const [courtDetails, setCourtDetails] = useState<Partial<Record<SportType, CourtDetails>>>(() => {
    const details: Partial<Record<SportType, CourtDetails>> = {}
    if (initialData?.courts) {
      initialData.courts.forEach(court => {
        details[court.sport] = {
          sport: court.sport,
          quantity: court.quantity,
          surface: court.surface || 'Hard Court',
          notes: court.notes || ''
        }
      })
    }
    return details
  })
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    initialData ? { lat: initialData.latitude, lng: initialData.longitude } : null
  )
  const [address, setAddress] = useState<AddressComponents>(() => ({
    street: initialData?.street || undefined,
    house_number: initialData?.house_number || undefined,
    city: initialData?.city || undefined,
    county: initialData?.county || undefined,
    state: initialData?.state || undefined,
    country: initialData?.country || undefined,
    postcode: initialData?.postcode || undefined,
    district: initialData?.district || undefined
  }))
  const [isDetectingAddress, setIsDetectingAddress] = useState(false)
  const [addressAutoDetected, setAddressAutoDetected] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

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
        const newDetails = { ...courtDetails }
        delete newDetails[sport]
        setCourtDetails(newDetails)
        return prev.filter(s => s !== sport)
      } else {
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
      } as CourtDetails
    }))
  }

  const updateAddressField = (field: keyof AddressComponents, value: string) => {
    setAddress(prev => ({
      ...prev,
      [field]: value.trim() || undefined
    }))
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
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 10MB.',
          variant: 'destructive',
        })
        return
      }
      
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
    setImagePreview(mode === 'edit' ? initialData?.image_url || null : null)
    setUploadProgress(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: 'Place name required',
        description: 'Please enter a name for the place.',
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
        description: 'Please click on the map to set the location.',
        variant: 'destructive',
      })
      return
    }

    // Handle image upload if present
    let finalImageUrl = initialData?.image_url || null
    
    if (imageFile) {
      try {
        setIsUploadingImage(true)
        setUploadProgress({ loaded: 0, total: 100, percentage: 0 })
        
        const uploadResult = await uploadCourtImage(imageFile, (progress) => {
          setUploadProgress(progress)
        })
        
        finalImageUrl = uploadResult.url
        
        toast({
          title: 'Image uploaded successfully',
          description: 'Your image has been uploaded.',
        })
      } catch (error) {
        console.error('Image upload failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
        
        toast({
          title: 'Image upload failed',
          description: errorMessage,
          variant: 'destructive',
        })
        
        finalImageUrl = undefined
      } finally {
        setIsUploadingImage(false)
        setUploadProgress(null)
      }
    }
    
    const formData: PlaceFormData = {
      name: name.trim(),
      description: desc.trim(),
      selectedSports,
      courtDetails,
      location,
      address: Object.values(address).some(v => v) ? address : {},
      imageFile,
      imageUrl: finalImageUrl
    }

    await onSubmit(formData)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
          {showCommunityMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-blue-800">Community Contribution</div>
                  <div className="text-blue-700">Your edits will be reviewed by administrators before being visible to other users. Thank you for helping improve our community data!</div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Place Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Place Name *</Label>
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
                placeholder="Add details about the place (facilities, lighting, surface type, etc.)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <Label>Place Image (Optional)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                {imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Place preview" 
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
                      {imageFile?.name || 'Current image'}
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
                        Upload a photo of the place (JPG, PNG, WebP up to 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Selection */}
            <div className="space-y-3">
              <Label>Location *</Label>
              <p className="text-sm text-muted-foreground">
                Click on the map to set the exact location of the place.
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
                  <span className="font-medium">Click on the map to set location</span>
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
              disabled={isLoading || isUploadingImage}
            >
              {isUploadingImage ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading Image...
                  {uploadProgress && (
                    <span className="text-sm">({uploadProgress.percentage.toFixed(0)}%)</span>
                  )}
                </div>
              ) : isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </div>
              ) : (
                submitButtonText || (mode === 'create' ? 'Create Place' : 'Save Changes')
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
  )
}