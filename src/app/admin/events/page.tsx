'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { EventWithDetails } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, XCircle, Calendar, MapPin, User, Clock, ChevronRight, Trash2, Pencil, Building2 } from 'lucide-react'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'
import Link from 'next/link'

const DAY_NAMES: Record<string, string> = {
  monday: 'Mo', tuesday: 'Di', wednesday: 'Mi', thursday: 'Do',
  friday: 'Fr', saturday: 'Sa', sunday: 'So',
}

function formatTime(t: string | null | undefined) {
  return t ? t.slice(0, 5) : null
}

function formatScheduleSummary(event: EventWithDetails): string {
  const s = event.schedule
  if (!s) return '–'
  if (s.type === 'recurring') {
    const slots = s.slots ?? []
    if (slots.length === 0) return 'Wiederkehrend'
    const days = slots.map(sl => DAY_NAMES[sl.day] ?? sl.day).join(', ')
    const first = slots[0]
    const time = formatTime(first.start_time)
    const end = formatTime(first.end_time)
    const timeStr = time ? (end ? ` · ${time}–${end}` : ` · ${time}`) : ''
    return `Wiederkehrend: ${days}${timeStr}`
  }
  const dates = s.dates ?? []
  if (dates.length === 0) return '–'
  const first = dates[0]
  const start = formatTime(first.start_time)
  const end = formatTime(first.end_time)
  const timeStr = start ? (end ? ` ${start}–${end}` : ` ${start}`) : ''
  return `${first.date}${timeStr}${dates.length > 1 ? ` (+${dates.length - 1})` : ''}`
}

function EventCard({
  event,
  onApprove,
  onReject,
  onDelete,
}: {
  event: EventWithDetails
  onApprove: (id: string) => void
  onReject: (event: EventWithDetails) => void
  onDelete: (event: EventWithDetails) => void
}) {
  return (
    <Card className="mb-3">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-base font-semibold truncate">{event.title}</span>
              {event.sports.map(sport => (
                <Badge key={sport} variant="outline" className="text-xs shrink-0">
                  {sportIcons[sport] || '🏆'} {sportNames[sport] || sport}
                </Badge>
              ))}
              <Badge
                variant={
                  event.moderation_status === 'approved'
                    ? 'default'
                    : event.moderation_status === 'rejected'
                    ? 'destructive'
                    : 'secondary'
                }
                className="text-xs shrink-0"
              >
                {event.moderation_status === 'approved'
                  ? 'Freigegeben'
                  : event.moderation_status === 'rejected'
                  ? 'Abgelehnt'
                  : 'Ausstehend'}
              </Badge>
            </div>

            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {event.place_id ? event.place_name : (event.inline_location?.name || '–')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>{formatScheduleSummary(event)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 shrink-0" />
                <span>{event.creator_name || '–'}</span>
                {event.creator_email && <span className="text-muted-foreground/70">({event.creator_email})</span>}
              </div>
              {event.organizer_name && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span>{event.organizer_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{new Date(event.created_at).toLocaleDateString('de-DE')}</span>
              </div>
            </div>

            {event.rejection_reason && (
              <p className="mt-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                Ablehnungsgrund: {event.rejection_reason}
              </p>
            )}
          </div>

          {event.moderation_status === 'pending' && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => onApprove(event.id)}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Freigeben
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 px-3 text-xs"
                onClick={() => onReject(event)}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Ablehnen
              </Button>
              <Link href={`/events/${event.id}/edit`} target="_blank">
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs w-full">
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Bearbeiten
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete(event)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Löschen
              </Button>
            </div>
          )}

          {event.moderation_status !== 'pending' && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <Link href={`/events/${event.id}`} target="_blank">
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs w-full">
                  Ansehen
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete(event)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Löschen
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Titel',
  description: 'Beschreibung',
  sports: 'Sportarten',
  place_id: 'Ort',
  inline_location: 'Ort (manuell)',
  schedule: 'Termine',
  contact: 'Kontakt',
  image_url: 'Titelbild',
  location_type: 'Hallentyp',
  age_restriction: 'Altersgruppe',
  gender_restriction: 'Zielgruppe',
  organizer_ids: 'Veranstalter',
}

function renderValue(key: string, value: any): string {
  if (value === null || value === undefined) return '–'
  if (key === 'sports' && Array.isArray(value)) return value.map((s: string) => sportNames[s] || s).join(', ')
  if (key === 'schedule') {
    const s = value as any
    if (s.type === 'recurring') return `Wiederkehrend (${s.slots?.length ?? 0} Slot(s))`
    return `${s.dates?.length ?? 0} Datum/Termine`
  }
  if (key === 'inline_location' && typeof value === 'object') return value.name || JSON.stringify(value)
  if (key === 'contact' && typeof value === 'object') return Object.values(value).filter(Boolean).join(', ') || '–'
  if (key === 'image_url') return value ? 'Bild gesetzt' : '–'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function UpdateCard({
  event,
  onApply,
  onReject,
  isPending,
}: {
  event: EventWithDetails
  onApply: (id: string) => void
  onReject: (id: string) => void
  isPending: boolean
}) {
  const changes = (event as any).pending_changes as Record<string, any> | null
  if (!changes) return null

  const changedKeys = Object.keys(changes).filter(k => FIELD_LABELS[k])

  return (
    <Card className="mb-3">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-base font-semibold truncate">{event.title}</span>
              <Badge variant="outline" className="text-xs shrink-0 text-amber-600 border-amber-400">
                Aktualisierung ausstehend
              </Badge>
            </div>

            <div className="space-y-0.5 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 shrink-0" />
                <span>{event.creator_name || '–'}</span>
                {event.creator_email && <span className="text-muted-foreground/70">({event.creator_email})</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0" />
                <span>Eingereicht: {new Date(event.updated_at).toLocaleDateString('de-DE')}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border text-xs">
              {changedKeys.map(key => (
                <div key={key} className="px-3 py-2">
                  <span className="font-medium text-foreground">{FIELD_LABELS[key]}</span>
                  <div className="mt-1 flex items-start gap-2">
                    <span className="text-muted-foreground line-through shrink-0 min-w-0 break-words">
                      {renderValue(key, (event as any)[key])}
                    </span>
                    <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-foreground font-medium break-words">
                      {renderValue(key, changes[key])}
                    </span>
                  </div>
                </div>
              ))}
              {changedKeys.length === 0 && (
                <div className="px-3 py-2 text-muted-foreground">Keine erkannten Felder geändert</div>
              )}
            </div>

            <div className="mt-2">
              <Link href={`/events/${event.id}`} target="_blank" className="text-xs text-primary hover:underline">
                Event ansehen →
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onApply(event.id)}
              disabled={isPending}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Übernehmen
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 px-3 text-xs"
              onClick={() => onReject(event.id)}
              disabled={isPending}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Ablehnen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminEventsPage() {

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [rejectTarget, setRejectTarget] = useState<EventWithDetails | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<EventWithDetails | null>(null)

  const { data: pendingEvents = [], isLoading: loadingPending } = useQuery({
    queryKey: ['admin-events', 'pending'],
    queryFn: () => database.events.getForAdmin('pending'),
  })

  const { data: approvedEvents = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['admin-events', 'approved'],
    queryFn: () => database.events.getForAdmin('approved'),
  })

  const { data: rejectedEvents = [], isLoading: loadingRejected } = useQuery({
    queryKey: ['admin-events', 'rejected'],
    queryFn: () => database.events.getForAdmin('rejected'),
  })

  const { data: pendingUpdateEvents = [], isLoading: loadingUpdates } = useQuery({
    queryKey: ['admin-events', 'pending-updates'],
    queryFn: () => database.events.getWithPendingChanges(),
  })

  const moderateMutation = useMutation({
    mutationFn: async ({
      eventId,
      status,
      reason,
    }: {
      eventId: string
      status: 'approved' | 'rejected'
      reason?: string
    }) => {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moderation_status: status, rejection_reason: reason ?? null }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Fehler bei der Moderation')
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast({
        title: vars.status === 'approved' ? 'Event freigegeben' : 'Event abgelehnt',
      })
      setRejectTarget(null)
      setRejectionReason('')
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Aktion konnte nicht ausgeführt werden.', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Fehler beim Löschen')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast({ title: 'Event gelöscht' })
      setDeleteTarget(null)
    },
    onError: () => {
      toast({ title: 'Fehler beim Löschen', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ eventId, action }: { eventId: string; action: 'apply_update' | 'reject_update' }) => {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Fehler')
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast({ title: vars.action === 'apply_update' ? 'Änderungen übernommen' : 'Änderungen abgelehnt' })
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Aktion konnte nicht ausgeführt werden.', variant: 'destructive' })
    },
  })

  const handleApprove = (eventId: string) => {
    moderateMutation.mutate({ eventId, status: 'approved' })
  }

  const handleRejectConfirm = () => {
    if (!rejectTarget) return
    moderateMutation.mutate({
      eventId: rejectTarget.id,
      status: 'rejected',
      reason: rejectionReason.trim() || undefined,
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-muted-foreground text-sm mt-1">Eingereichte Events prüfen und freigeben</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Ausstehend
            {pendingEvents.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs">
                {pendingEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="updates">
            Aktualisierungen
            {pendingUpdateEvents.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs">
                {pendingUpdateEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Freigegeben</TabsTrigger>
          <TabsTrigger value="rejected">Abgelehnt</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loadingPending ? (
            <p className="text-sm text-muted-foreground">Wird geladen…</p>
          ) : pendingEvents.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Keine ausstehenden Events</CardContent></Card>
          ) : (
            pendingEvents.map(e => (
              <EventCard key={e.id} event={e} onApprove={handleApprove} onReject={setRejectTarget} onDelete={setDeleteTarget} />
            ))
          )}
        </TabsContent>

        <TabsContent value="updates">
          {loadingUpdates ? (
            <p className="text-sm text-muted-foreground">Wird geladen…</p>
          ) : pendingUpdateEvents.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Keine ausstehenden Aktualisierungen</CardContent></Card>
          ) : (
            pendingUpdateEvents.map(event => (
              <UpdateCard
                key={event.id}
                event={event}
                onApply={id => updateMutation.mutate({ eventId: id, action: 'apply_update' })}
                onReject={id => updateMutation.mutate({ eventId: id, action: 'reject_update' })}
                isPending={updateMutation.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved">
          {loadingApproved ? (
            <p className="text-sm text-muted-foreground">Wird geladen…</p>
          ) : approvedEvents.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Keine freigegebenen Events</CardContent></Card>
          ) : (
            approvedEvents.map(e => (
              <EventCard key={e.id} event={e} onApprove={handleApprove} onReject={setRejectTarget} onDelete={setDeleteTarget} />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {loadingRejected ? (
            <p className="text-sm text-muted-foreground">Wird geladen…</p>
          ) : rejectedEvents.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Keine abgelehnten Events</CardContent></Card>
          ) : (
            rejectedEvents.map(e => (
              <EventCard key={e.id} event={e} onApprove={handleApprove} onReject={setRejectTarget} onDelete={setDeleteTarget} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={open => { if (!open) { setRejectTarget(null); setRejectionReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event ablehnen</DialogTitle>
            <DialogDescription>
              „{rejectTarget?.title}" ablehnen. Der Ersteller wird nicht automatisch benachrichtigt.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="rejection-reason" className="text-sm">Ablehnungsgrund (optional)</Label>
            <Textarea
              id="rejection-reason"
              placeholder="z.B. Unvollständige Angaben, falscher Ort, …"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectionReason('') }}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={moderateMutation.isPending}
            >
              {moderateMutation.isPending ? 'Wird abgelehnt…' : 'Ablehnen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event löschen?</DialogTitle>
            <DialogDescription>
              „{deleteTarget?.title}" dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Abbrechen</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Wird gelöscht…' : 'Endgültig löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
