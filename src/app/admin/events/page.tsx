'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { EventWithDetails } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { CheckCircle, XCircle, Calendar, MapPin, User, Clock } from 'lucide-react'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'
import Link from 'next/link'

function formatScheduleSummary(event: EventWithDetails): string {
  const s = event.schedule
  if (!s) return '–'
  if (s.type === 'recurring') {
    const days = (s as any).slots?.map((sl: any) => sl.day).join(', ') || '–'
    return `Wiederkehrend: ${days}`
  }
  const dates = (s as any).dates || []
  if (dates.length === 0) return '–'
  const first = dates[0]
  return `${first.date} ${first.start_time}–${first.end_time}${dates.length > 1 ? ` (+${dates.length - 1})` : ''}`
}

function EventCard({
  event,
  onApprove,
  onReject,
}: {
  event: EventWithDetails
  onApprove: (id: string) => void
  onReject: (event: EventWithDetails) => void
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
            </div>
          )}

          {event.moderation_status !== 'pending' && (
            <div className="shrink-0">
              <Link href={`/events/${event.id}`} target="_blank">
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                  Ansehen
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminEventsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [rejectTarget, setRejectTarget] = useState<EventWithDetails | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

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

  const moderateMutation = useMutation({
    mutationFn: ({
      eventId,
      status,
      reason,
    }: {
      eventId: string
      status: 'approved' | 'rejected'
      reason?: string
    }) => database.events.moderate(eventId, status, user!.id, reason),
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
              <EventCard key={e.id} event={e} onApprove={handleApprove} onReject={setRejectTarget} />
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
              <EventCard key={e.id} event={e} onApprove={handleApprove} onReject={setRejectTarget} />
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
              <EventCard key={e.id} event={e} onApprove={handleApprove} onReject={setRejectTarget} />
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
    </div>
  )
}
