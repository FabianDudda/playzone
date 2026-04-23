'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { uploadOrganizerLogo, uploadOrganizerCover, deleteOrganizerFile } from '@/lib/supabase/storage'
import { Organizer, OrganizerImage } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, X, Upload, ImagePlus } from 'lucide-react'
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
  website: string
  instagram: string
  email: string
  phone: string
}

interface PendingCover {
  tempId: string
  url: string
  storagePath: string
}

const emptyForm: OrganizerForm = {
  name: '',
  slug: '',
  description: '',
  logo_url: '',
  website: '',
  instagram: '',
  email: '',
  phone: '',
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
  const [pendingId, setPendingId] = useState<string>('')
  const [form, setForm] = useState<OrganizerForm>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [pendingCovers, setPendingCovers] = useState<PendingCover[]>([])
  const logoFileRef = useRef<HTMLInputElement>(null)
  const coverFileRef = useRef<HTMLInputElement>(null)

  const activeOrgId = editingId || pendingId

  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ['organizers'],
    queryFn: () => database.organizers.getAll(),
  })

  const { data: editImages = [] } = useQuery<OrganizerImage[]>({
    queryKey: ['organizer-images', editingId],
    queryFn: () => database.organizers.getImages(editingId!),
    enabled: !!editingId && dialogOpen,
  })

  const addImageMutation = useMutation({
    mutationFn: ({ url, path }: { url: string; path: string }) =>
      database.organizers.addImage(editingId!, url, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-images', editingId] })
    },
  })

  const deleteImageMutation = useMutation({
    mutationFn: async ({ imageId, storagePath }: { imageId: string; storagePath: string | null }) => {
      if (storagePath) {
        try { await deleteOrganizerFile(storagePath) } catch { /* ignore if already gone */ }
      }
      return database.organizers.deleteImage(imageId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-images', editingId] })
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: OrganizerForm) => {
      const result = await database.organizers.create({ id: pendingId, ...data, created_by: user?.id })
      if (result.error) throw result.error
      for (const cover of pendingCovers) {
        await database.organizers.addImage(pendingId, cover.url, cover.storagePath)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizers'] })
      toast({ title: 'Organizer erstellt' })
      closeDialog()
    },
    onError: (err: any) => {
      toast({ title: 'Fehler', description: err?.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrganizerForm }) =>
      database.organizers.update(id, data),
    onSuccess: ({ error }) => {
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
      queryClient.invalidateQueries({ queryKey: ['organizers'] })
      toast({ title: 'Organizer aktualisiert' })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => database.organizers.delete(id),
    onSuccess: ({ error }) => {
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
      queryClient.invalidateQueries({ queryKey: ['organizers'] })
      toast({ title: 'Organizer gelöscht' })
      setDeleteId(null)
    },
  })

  function closeDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setPendingId('')
    setForm(emptyForm)
    setPendingCovers([])
  }

  function openCreate() {
    setEditingId(null)
    setPendingId(crypto.randomUUID())
    setForm(emptyForm)
    setPendingCovers([])
    setDialogOpen(true)
  }

  function openEdit(org: Organizer) {
    setEditingId(org.id)
    setPendingId('')
    setForm({
      name: org.name,
      slug: org.slug,
      description: org.description || '',
      logo_url: org.logo_url || '',
      website: org.website || '',
      instagram: org.instagram || '',
      email: org.email || '',
      phone: org.phone || '',
    })
    setPendingCovers([])
    setDialogOpen(true)
  }

  function handleNameChange(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: editingId ? f.slug : slugify(name),
    }))
  }

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const result = await uploadOrganizerLogo(activeOrgId, file)
      setForm(f => ({ ...f, logo_url: result.url }))
    } catch {
      toast({ title: 'Logo-Upload fehlgeschlagen', variant: 'destructive' })
    } finally {
      setLogoUploading(false)
      if (logoFileRef.current) logoFileRef.current.value = ''
    }
  }

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    try {
      const result = await uploadOrganizerCover(activeOrgId, file)
      if (editingId) {
        await addImageMutation.mutateAsync({ url: result.url, path: result.path })
      } else {
        setPendingCovers(prev => [...prev, {
          tempId: crypto.randomUUID(),
          url: result.url,
          storagePath: result.path,
        }])
      }
    } catch {
      toast({ title: 'Bild-Upload fehlgeschlagen', variant: 'destructive' })
    } finally {
      setCoverUploading(false)
      if (coverFileRef.current) coverFileRef.current.value = ''
    }
  }

  function removePendingCover(tempId: string) {
    setPendingCovers(prev => prev.filter(c => c.tempId !== tempId))
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast({ title: 'Name und Slug sind erforderlich', variant: 'destructive' })
      return
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const coverImages: (OrganizerImage | PendingCover)[] = editingId
    ? editImages
    : pendingCovers

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
        <div className="space-y-6">
          {/* All organizers */}
          <div className="grid gap-3">
          {organizers.map((org) => (
            <Card key={org.id}>
              <CardContent className="py-4 px-5 flex items-center gap-4">
                {org.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded-full object-contain flex-shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full flex-shrink-0 bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{org.name}</span>
                  </div>
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
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

            {/* Logo */}
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={logoUploading}
                  className="relative h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden text-white bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
                >
                  {form.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logo_url} alt="" className="h-12 w-12 object-contain rounded-full" />
                  ) : logoUploading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-foreground border-t-transparent rounded-full" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                  <Input
                    value={form.logo_url}
                    onChange={(e) => setForm(f => ({ ...f, logo_url: e.target.value }))}
                    placeholder="oder URL eingeben…"
                    className="text-xs"
                  />
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" /> Entfernen
                    </button>
                  )}
                </div>
              </div>
              <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
            </div>

            {/* Titelbilder */}
            <div className="space-y-2">
              <Label>Titelbilder</Label>
              <div className="grid grid-cols-3 gap-2">
                {(coverImages as any[]).map((img) => {
                  const url = 'url' in img ? img.url : img.url
                  const id = 'id' in img && editingId ? img.id : null
                  const tempId = 'tempId' in img ? img.tempId : null
                  return (
                    <div key={id ?? tempId} className="relative aspect-video rounded-md overflow-hidden bg-muted group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          if (id) {
                            deleteImageMutation.mutate({ imageId: id, storagePath: img.storage_path })
                          } else if (tempId) {
                            removePendingCover(tempId)
                          }
                        }}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  disabled={coverUploading}
                  className="aspect-video rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  {coverUploading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-foreground border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Hinzufügen</span>
                    </>
                  )}
                </button>
              </div>
              <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-Mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="info@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+49 123 456789"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>Abbrechen</Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Speichern…' : editingId ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Organizer löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the organizer. Places and events linked to it will lose the organizer association.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Abbrechen</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
