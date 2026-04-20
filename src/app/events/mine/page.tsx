'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Calendar, Bookmark } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import EventCard from '@/components/events/event-card'

type Tab = 'erstellt' | 'gespeichert'

export default function MyEventsPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('erstellt')

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
              <h3 className="font-semibold mb-1">Anmelden erforderlich</h3>
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

  return (
    <div className="container px-4 py-6 max-w-xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold">Meine Events</h1>
        <Link href="/events/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Erstellen
          </Button>
        </Link>
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
                  Erstelle dein erstes Event und lade andere ein.
                </p>
                <Link href="/events/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Event erstellen
                  </Button>
                </Link>
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
            <EventCard key={event.id} event={event} currentUserId={user.id} />
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
