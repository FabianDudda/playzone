'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Calendar, Bookmark, ChevronRight } from 'lucide-react'
import BackButton from '@/components/layout/back-button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import EventCard from '@/components/events/event-card'

type Tab = 'erstellt' | 'gespeichert'

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function OrganizerSection({ userId }: { userId: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [pendingId] = useState(() => crypto.randomUUID())
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const { data: organizer, isLoading } = useQuery({
    queryKey: ['my-organizer', userId],
    queryFn: () => database.organizers.getByOwner(userId),
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name ist erforderlich')
      const { error } = await database.organizers.create({
        id: pendingId,
        name: name.trim(),
        slug: slug.trim() || slugify(name.trim()),
        description: null,
        logo_url: null,
        website: null,
        instagram: null,
        email: null,
        phone: null,
        owner_id: userId,
        verified: false,
        created_by: userId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-organizer', userId] })
      queryClient.invalidateQueries({ queryKey: ['organizers'] })
      toast({ title: 'Veranstalter-Profil erstellt!' })
    },
    onError: (err: any) => {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    },
  })

  if (isLoading) {
    return <div className="h-16 rounded-xl bg-muted animate-pulse" />
  }

  if (organizer) {
    return (
      <Link href="/profile/organizer" className="block">
        <Card className="hover:bg-muted/40 transition-colors">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            {organizer.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organizer.logo_url} alt="" className="h-9 w-9 rounded-full object-contain bg-muted flex-shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-semibold text-muted-foreground">
                {organizer.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm truncate">{organizer.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">Veranstalter-Profil</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-4 px-4 space-y-3">
        <div>
          <p className="text-sm font-medium mb-0.5">Veranstalter-Profil einrichten</p>
          <p className="text-xs text-muted-foreground">Erforderlich, um Events zu erstellen.</p>
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input
              value={name}
              onChange={e => { setName(e.target.value); setSlug(slugify(e.target.value)) }}
              placeholder="z.B. BasKIDball e.V."
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button
          size="sm"
          className="w-full h-8"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !name.trim()}
        >
          {createMutation.isPending ? 'Wird erstellt…' : 'Profil erstellen'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          <Link href="/profile/organizer" className="underline underline-offset-2">Weitere Einstellungen</Link> nach dem Erstellen verfügbar.
        </p>
      </CardContent>
    </Card>
  )
}

export default function MyEventsPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('erstellt')

  const { data: organizer } = useQuery({
    queryKey: ['my-organizer', user?.id],
    queryFn: () => database.organizers.getByOwner(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })

  const { data: created = [], isLoading: isLoadingCreated } = useQuery({
    queryKey: ['user-events', user?.id],
    queryFn: () => database.events.getUserEvents(user!.id),
    enabled: !!user,
  })

  const { data: bookmarked = [], isLoading: isLoadingBookmarked } = useQuery({
    queryKey: ['event-bookmarks', user?.id],
    queryFn: () => database.eventBookmarks.getUserBookmarks(user!.id),
    enabled: !!user,
  })

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-xl mx-auto space-y-4">
        <div className="h-9 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
        <div className="h-10 rounded-lg bg-muted animate-pulse" />
        {[1, 2].map(i => <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />)}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container px-4 py-6 max-w-xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">Meine Events</h1>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold mb-1">Anmeldung erforderlich</h3>
              <p className="text-sm text-muted-foreground">Melde dich an, um deine Events zu sehen und zu verwalten.</p>
            </div>
            <Button asChild>
              <Link href="/auth/signin">Anmelden</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const events = tab === 'erstellt' ? created : bookmarked
  const isLoading = tab === 'erstellt' ? isLoadingCreated : isLoadingBookmarked
  const canCreate = !!organizer

  return (
    <div className="container px-4 py-6 max-w-xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-3xl font-bold">Meine Events</h1>
        </div>
        {canCreate && (
          <Link href="/events/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Erstellen
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-5">
        <OrganizerSection userId={user.id} />
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-lg bg-muted p-1 mb-5">
        {(['erstellt', 'gespeichert'] as Tab[]).map(t => (
          <button
            key={t}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors capitalize ${
              tab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'erstellt' ? 'Erstellt' : 'Gespeichert'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            {tab === 'erstellt' ? (
              <>
                <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">Noch keine Events erstellt</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {canCreate
                    ? 'Erstelle dein erstes Event und lade andere ein.'
                    : 'Richte zuerst dein Veranstalter-Profil ein, um Events zu erstellen.'}
                </p>
                {canCreate && (
                  <Link href="/events/new">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Event erstellen
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Bookmark className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">Noch keine Events gespeichert</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Speichere Events, um sie hier wiederzufinden.
                </p>
                <Link href="/events">
                  <Button size="sm" variant="outline">Events entdecken</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      <div className="pt-10 text-center">
        <Link
          href="/events"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Alle Events entdecken →
        </Link>
      </div>
    </div>
  )
}
