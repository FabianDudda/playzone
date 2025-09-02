'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { useToast } from '@/hooks/use-toast'
import PlaceForm from '@/components/places/place-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import React from 'react'

interface EditPlacePageProps {
  params: Promise<{ id: string }>
}

export default function EditPlacePage({ params }: EditPlacePageProps) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // Get place ID from params
  const [placeId, setPlaceId] = useState<string>('')
  
  React.useEffect(() => {
    params.then(p => setPlaceId(p.id))
  }, [params])

  // Fetch place data for editing
  const { data: place, isLoading, error } = useQuery({
    queryKey: ['place-edit', placeId],
    queryFn: () => database.community.getPlaceForEdit(placeId),
    enabled: !!placeId,
  })

  const isAdmin = profile?.user_role === 'admin'

  // Submit mutation for community edits or direct admin updates
  const submitMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (!user) throw new Error('User not authenticated')
      if (!place) throw new Error('Place not found')

      const placeData = {
        name: formData.name,
        description: formData.description,
        latitude: formData.location.lat,
        longitude: formData.location.lng,
        sports: formData.selectedSports,
        image_url: formData.imageUrl,
        // Address fields
        street: formData.address.street,
        house_number: formData.address.house_number,
        city: formData.address.city,
        county: formData.address.county,
        state: formData.address.state,
        country: formData.address.country,
        postcode: formData.address.postcode,
        district: formData.address.district,
      }

      const courts = Object.values(formData.courtDetails).map((detail: any) => ({
        sport: detail.sport,
        quantity: detail.quantity,
        surface: detail.surface,
        notes: detail.notes,
      }))

      if (isAdmin) {
        // Admin can make direct updates
        const { error: placeError } = await database.courts.updateCourt(place.id, placeData)
        if (placeError) throw new Error('Failed to update place')

        // Update courts
        // First delete existing courts
        await Promise.all(
          place.courts?.map(court => 
            database.courtDetails.deleteCourt(court.id)
          ) || []
        )

        // Add new courts
        await Promise.all(
          courts.map(court => 
            database.courtDetails.addCourt({
              ...court,
              place_id: place.id
            })
          )
        )

        return { directUpdate: true }
      } else {
        // Regular users submit for community review
        const result = await database.community.submitPlaceEdit(
          place.id,
          placeData,
          courts,
          user.id
        )
        return result
      }
    },
    onSuccess: (result) => {
      if (result?.directUpdate) {
        toast({
          title: 'Place updated successfully!',
          description: 'Your changes have been applied immediately.',
        })
      } else {
        toast({
          title: 'Changes submitted for review!',
          description: 'Your suggested edits will be reviewed by administrators. Thank you for contributing to the community!',
        })
      }
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['place-edit', placeId] })
      queryClient.invalidateQueries({ queryKey: ['courts'] })
      queryClient.invalidateQueries({ queryKey: ['places'] })
      
      // Redirect back to place page
      router.push(`/places/${placeId}`)
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving changes',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Redirect unauthenticated users
  if (!user) {
    return (
      <div className="container px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">
            You must be signed in to edit places.
          </p>
          <Link href="/auth/signin" className="text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading place data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !place) {
    notFound()
  }

  return (
    <div className="container px-4 py-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <Link 
          href={`/places/${placeId}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {place.name}
        </Link>
      </div>

      <PlaceForm
        mode="edit"
        initialData={place}
        onSubmit={(formData) => submitMutation.mutateAsync(formData)}
        isLoading={submitMutation.isPending}
        title={isAdmin ? `Edit ${place.name}` : `Suggest Edits for ${place.name}`}
        description={
          isAdmin 
            ? "Make changes to this place. Your updates will be applied immediately."
            : "Suggest improvements to this place. Your changes will be reviewed before being published."
        }
        showCommunityMessage={!isAdmin}
        submitButtonText={isAdmin ? "Save Changes" : "Submit for Review"}
      />
    </div>
  )
}