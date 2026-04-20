'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { useToast } from '@/hooks/use-toast'
import PlaceForm from '@/components/places/place-form'
import Link from 'next/link'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { SportType, PlaceImage } from '@/lib/supabase/types'
import { deleteCourtImage } from '@/lib/supabase/storage'

interface EditPlacePageProps {
  params: Promise<{ id: string }>
}

function EditPlaceContent({ params }: EditPlacePageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const isGuestMode = !user || searchParams.get('guest') === 'true'

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Submit mutation for community edits or direct admin updates
  const submitMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (!user && !isGuestMode) throw new Error('User not authenticated')
      if (!place) throw new Error('Place not found')

      const placeData = {
        name: formData.name,
        description: formData.description,
        place_type: formData.placeType,
        latitude: formData.location.lat,
        longitude: formData.location.lng,
        sports: [...formData.selectedSports, ...((formData.customSports?.length ?? 0) > 0 ? ['other' as SportType] : [])],
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
        // Verein contact & hours
        contact_phone: formData.contactPhone || null,
        contact_email: formData.contactEmail || null,
        contact_website: formData.contactWebsite || null,
        opening_hours: formData.openingHours || null,
        // Organizer (admin only)
        organizer_id: isAdmin ? (formData.organizerId ?? null) : undefined,
      }

      const courts = formData.courts

      if (isAdmin) {
        // Admin can make direct updates
        const { error: placeError } = await database.courts.updateCourt(place.id, placeData)
        if (placeError) throw new Error('Failed to update place')

        // Update courts: delete existing, add new, collect new court IDs by sport
        await Promise.all(
          place.courts?.map(court =>
            database.courtDetails.deleteCourt(court.id)
          ) || []
        )

        const newCourts = await Promise.all(
          courts.map((court: any) =>
            database.courtDetails.addCourt({
              place_id: place.id,
              sport: court.sport,
              quantity: court.quantity,
              surface: court.surface || null,
              notes: court.notes || null,
              custom_sport_name: court.customSportName || null,
            })
          )
        )

        // Save place attributes
        if (formData.placeAttributes) {
          await database.attributes.savePlaceAttributes(place.id, formData.placeAttributes as Record<string, boolean>)
        }

        // Save court attributes per-court (courts[i].attributes maps to newCourts[i])
        await Promise.all(
          courts.map((court: any, i: number) => {
            const courtId = newCourts[i]?.data?.id
            if (courtId && court.attributes) {
              return database.attributes.saveCourtAttributes([courtId], court.attributes)
            }
          }).filter(Boolean)
        )

        return { directUpdate: true }
      } else if (isGuestMode) {
        // Guest users submit via API route (IP rate limiting + guest profile)
        const res = await fetch('/api/guest/submit-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeId: place.id,
            placeData,
            courts,
            placeAttributes: formData.placeAttributes ?? {},
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Fehler beim Einreichen')
        return json.data
      } else {
        // Regular users submit for community review
        // Normalize courts to snake_case for DB storage (attributes embedded)
        const normalizedCourts = courts.map((c: any) => ({
          sport: c.sport,
          quantity: c.quantity,
          surface: c.surface || null,
          notes: c.notes || null,
          custom_sport_name: c.custom_sport_name ?? c.customSportName ?? null,
          attributes: c.attributes ?? {},
        }))
        return await database.community.submitPlaceEdit(
          place.id,
          placeData,
          normalizedCourts,
          user!.id,
          formData.placeAttributes as Record<string, boolean> | undefined,
        )
      }
    },
    onSuccess: (result) => {
      if (result?.directUpdate) {
        toast({
          title: 'Ort erfolgreich aktualisiert!',
          description: 'Deine Änderungen wurden sofort übernommen.',
        })
      } else {
        toast({
          title: 'Ort eingereicht!',
          description: 'Er erscheint auf der Karte, sobald er genehmigt wurde.',
        })
      }
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['place-edit', placeId] })
      queryClient.invalidateQueries({ queryKey: ['courts'] })
      queryClient.invalidateQueries({ queryKey: ['places'] })
      
      // Redirect back to map
      router.push('/map')
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler beim Speichern',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteImageMutation = useMutation({
    mutationFn: async (image: PlaceImage) => {
      if (!isAdmin) throw new Error('Unauthorized')
      const { storagePath } = await database.admin.deletePlaceImage(image.id, image.place_id)
      if (storagePath) await deleteCourtImage(storagePath)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['place-images', placeId] })
      queryClient.invalidateQueries({ queryKey: ['place-edit', placeId] })
      toast({ title: 'Foto gelöscht' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler beim Löschen', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!isAdmin) throw new Error('Unauthorized')
      if (!place) throw new Error('Place not found')

      // Delete courts first
      await Promise.all(
        place.courts?.map(court => database.courtDetails.deleteCourt(court.id)) || []
      )

      // Delete the place
      const { error } = await database.courts.deleteCourt(place.id)
      if (error) throw new Error('Failed to delete place')
    },
    onSuccess: () => {
      toast({ title: 'Ort gelöscht', description: 'Der Ort wurde erfolgreich gelöscht.' })
      queryClient.invalidateQueries({ queryKey: ['courts'] })
      queryClient.invalidateQueries({ queryKey: ['places'] })
      router.push('/map')
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler beim Löschen', description: error.message, variant: 'destructive' })
    },
  })

  // Wait for auth and placeId to resolve
  if (authLoading || !placeId || isLoading) {
    return (
      <div className="container px-4 py-8">
        <div className="max-w-xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Laden...</p>
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
    <div className="container px-4 py-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Zurück"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg></button>
          </Button>
          <h1 className="text-2xl font-bold">Ort bearbeiten</h1>
        </div>
        {isAdmin && (
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Löschen
          </Button>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ort löschen?</DialogTitle>
            <DialogDescription>
              Möchtest du <strong>{place.name}</strong> und alle zugehörigen Courts dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setShowDeleteDialog(false); deleteMutation.mutate() }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Wird gelöscht...' : 'Endgültig löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PlaceForm
        mode="edit"
        initialData={place}
        placeId={placeId}
        onSubmit={(formData) => submitMutation.mutateAsync(formData)}
        isLoading={submitMutation.isPending}
        title={isAdmin ? `${place.name} bearbeiten` : `Änderungen für ${place.name} vorschlagen`}
        description={
          isAdmin
            ? "Nimm Änderungen an diesem Ort vor. Deine Änderungen werden sofort übernommen."
            : "Schlage Verbesserungen für diesen Ort vor. Deine Änderungen werden vor der Veröffentlichung geprüft."
        }
        submitButtonText={isAdmin ? "Änderungen speichern" : "Zur Überprüfung einreichen"}
        onDeleteImage={isAdmin ? (image) => deleteImageMutation.mutate(image) : undefined}
        isAdmin={isAdmin}
      />
    </div>
  )
}

export default function EditPlacePage({ params }: EditPlacePageProps) {
  return (
    <Suspense>
      <EditPlaceContent params={params} />
    </Suspense>
  )
}