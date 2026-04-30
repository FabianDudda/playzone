'use client'

import { Heart } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { database } from '@/lib/supabase/database'
import { useToast } from '@/hooks/use-toast'

interface BookmarkButtonProps {
  eventId: string
  isBookmarked: boolean
  userId?: string
  size?: 'sm' | 'default'
}

export default function BookmarkButton({
  eventId,
  isBookmarked,
  userId,
  size = 'default',
}: BookmarkButtonProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        router.push('/auth/signin')
        return
      }
      if (isBookmarked) {
        await database.eventBookmarks.unbookmarkEvent(userId, eventId)
      } else {
        await database.eventBookmarks.bookmarkEvent(userId, eventId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-bookmarks'] })
      toast({
        title: isBookmarked ? 'Lesezeichen entfernt' : 'Gespeichert',
        description: isBookmarked ? undefined : 'Event wurde zu deinen Lesezeichen hinzugefügt.',
      })
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Bitte versuche es erneut.', variant: 'destructive' })
    },
  })

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      aria-label={isBookmarked ? 'Gespeichert' : 'Speichern'}
      className={`rounded-full${size === 'sm' ? ' h-8 w-8' : ''}`}
    >
      <Heart
        className={`h-[18px] w-[18px] transition-colors ${isBookmarked ? 'fill-primary text-primary' : ''}`}
      />
    </Button>
  )
}
