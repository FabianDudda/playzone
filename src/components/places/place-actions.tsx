'use client'

import { Button } from '@/components/ui/button'
import { Edit, Share2, Navigation } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { PlaceWithCourts } from '@/lib/supabase/types'
import Link from 'next/link'

interface PlaceActionsProps {
  place: PlaceWithCourts
}

export default function PlaceActions({ place }: PlaceActionsProps) {
  const { user, profile } = useAuth()
  
  const isAdmin = profile?.user_role === 'admin'
  const canEdit = !!user // Any authenticated user can edit (community-based)

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: place.name,
        text: `Check out ${place.name}`,
        url: `${window.location.origin}/places/${place.id}`
      }).catch(err => console.log('Share failed:', err))
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/places/${place.id}`)
        .then(() => console.log('URL copied to clipboard'))
        .catch(err => console.log('Copy failed:', err))
    }
  }

  const handleDirections = () => {
    const url = `https://maps.google.com/?q=${place.latitude},${place.longitude}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex gap-2">
      {canEdit && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/places/${place.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            {isAdmin ? 'Edit' : 'Suggest Edit'}
          </Link>
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleShare}>
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
      <Button variant="outline" size="sm" onClick={handleDirections}>
        <Navigation className="h-4 w-4 mr-2" />
        Directions
      </Button>
    </div>
  )
}