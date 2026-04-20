'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { Organizer } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface OrganizerForm {
  name: string
  slug: string
  description: string
  logo_url: string
  color: string
  website: string
  instagram: string
}

const emptyForm: OrganizerForm = {
  name: '',
  slug: '',
  description: '',
  logo_url: '',
  color: '#6366F1',
  website: '',
  instagram: '',
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function OrganizersAdminPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<OrganizerForm>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ['organizers'],
    queryFn: () => database.organizers.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: OrganizerForm) =>
      database.organizers.create({ ...data, created_by: user?.id }),
    onSuccess: ({ error }) => {
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
      queryClient.invalidateQueries({ queryKey: ['organizers'] })
      toast({ title: 'Organizer created' })
      setDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrganizerForm }) =>
      database.organizers.update(id, data),
    onSuccess: ({ error }) => {
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
      queryClient.invalidateQueries({ queryKey: ['organizers'] })
      toast({ title: 'Organizer updated' })
      setDialogOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => database.organizers.delete(id),
    onSuccess: ({ error }) => {
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
      queryClient.invalidateQueries({ queryKey: ['organizers'] })
      toast({ title: 'Organizer deleted' })
      setDeleteId(null)
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(org: Organizer) {
    setEditingId(org.id)
    setForm({
      name: org.name,
      slug: org.slug,
      description: org.description || '',
      logo_url: org.logo_url || '',
      color: org.color || '#6366F1',
      website: org.website || '',
      instagram: org.instagram || '',
    })
    setDialogOpen(true)
  }

  function handleNameChange(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: editingId ? f.slug : slugify(name),
    }))
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast({ title: 'Name and slug are required', variant: 'destructive' })
      return
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizers</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage event organizers and their branded venues</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Organizer
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : organizers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No organizers yet. Create one to link branded venues to events.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {organizers.map((org) => (
            <Card key={org.id}>
              <CardContent className="py-4 px-5 flex items-center gap-4">
                <div
                  className="h-8 w-8 rounded-full flex-shrink-0 border-2 border-white shadow"
                  style={{ backgroundColor: org.color || '#6366F1' }}
                />
                {org.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded object-contain flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{org.name}</div>
                  <div className="text-xs text-muted-foreground">/{org.slug}</div>
                  {org.description && (
                    <div className="text-sm text-muted-foreground mt-0.5 truncate">{org.description}</div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(org)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(org.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Organizer' : 'New Organizer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="BasKIDball"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="baskidball"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description of this organizer…"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                    className="h-9 w-12 cursor-pointer rounded border p-0.5"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input
                  value={form.logo_url}
                  onChange={(e) => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input
                  value={form.instagram}
                  onChange={(e) => setForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="@handle"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete organizer?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the organizer. Places and events linked to it will lose the organizer association.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
