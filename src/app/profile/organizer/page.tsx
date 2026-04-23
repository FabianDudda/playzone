'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { uploadOrganizerLogo, uploadOrganizerCover, deleteOrganizerFile } from '@/lib/supabase/storage'
import { OrganizerImage } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Upload, X, ImagePlus } from 'lucide-react'
import Link from 'next/link'

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

export default function OrganizerProfilePage() {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [pendingId] = useState(() => crypto.randomUUID())
  const [form, setForm] = useState<OrganizerForm>(emptyForm)
  const [formInitialized, setFormInitialized] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [pendingCovers, setPendingCovers] = useState<{ tempId: string; url: string; storagePath: string }[]>([])
  const logoFileRef = useRef<HTMLInputElement>(null)
  const coverFileRef = useRef<HTMLInputElement>(null)

  const { data: organizer, isLoading } = useQuery({
    queryKey: ['my-organizer', user?.id],
    queryFn: () => database.organizers.getByOwner(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })

  const { data: coverImages = [] } = useQuery<OrganizerImage[]>({
    queryKey: ['organizer-images', organizer?.id],
    queryFn: () => database.organizers.getImages(organizer!.id),
    enabled: !!organizer,
  })

  // Populate form when organizer loads
  if (organizer && !formInitialized) {
    setForm({
      name: organizer.name,
      slug: organizer.slug,
      description: organizer.description || '',
      logo_url: organizer.logo_url || '',
      website: organizer.website || '',
      instagram: organizer.instagram || '',
      email: organizer.email || '',
      phone: organizer.phone || '',
    })
    setFormInitialized(true)
  }

  const activeId = organizer?.id ?? pendingId

  const addImageMutation = useMutation({
    mutationFn: ({ url, path }: { url: string; path: string }) =>
      database.organizers.addImage(organizer!.id, url, path),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizer-images', organizer?.id] }),
  })

  const deleteImageMutation = useMutation({
    mutationFn: async ({ imageId, storagePath }: { imageId: string; storagePath: string | null }) => {
      if (storagePath) {
        try { await deleteOrganizerFile(storagePath) } catch { /* already gone */ }
      }
      return database.organizers.deleteImage(imageId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizer-images', organizer?.id] }),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.slug.trim()) throw new Error('Name und Slug sind erforderlich')

      if (organizer) {
        const { error } = await database.organizers.update(organizer.id, {
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || null,
          logo_url: form.logo_url || null,
          website: form.website.trim() || null,
          instagram: form.instagram.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await database.organizers.create({
          id: pendingId,
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || null,
          logo_url: form.logo_url || null,
          website: form.website.trim() || null,
          instagram: form.instagram.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          owner_id: user!.id,
          verified: false,
          created_by: user!.id,
        })
        if (error) throw new Error(error.message)
        for (const cover of pendingCovers) {
          await database.organizers.addImage(pendingId, cover.url, cover.storagePath)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-organizer', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['organizers'] })
      toast({ title: organizer ? 'Profil gespeichert' : 'Veranstalter-Profil erstellt!' })
      setFormInitialized(false)
    },
    onError: (err: any) => {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    },
  })

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const result = await uploadOrganizerLogo(activeId, file)
      setForm(f => ({ ...f, logo_url: result.url }))
    } catch {
      toast({ title: 'Logo-Upload fehlgeschlagen', variant: 'destructive' })
    } finally {
      setLogoUploading(false)
      if (logoFileRef.current) logoFileRef.current.value = ''
    }
  }

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    try {
      const result = await uploadOrganizerCover(activeId, file)
      if (organizer) {
        await addImageMutation.mutateAsync({ url: result.url, path: result.path })
      } else {
        setPendingCovers(prev => [...prev, { tempId: crypto.randomUUID(), url: result.url, storagePath: result.path }])
      }
    } catch {
      toast({ title: 'Bild-Upload fehlgeschlagen', variant: 'destructive' })
    } finally {
      setCoverUploading(false)
      if (coverFileRef.current) coverFileRef.current.value = ''
    }
  }

  if (!user) {
    return (
      <div className="container px-4 py-8 max-w-xl mx-auto text-center">
        <p className="text-muted-foreground mb-4">Anmeldung erforderlich</p>
        <Button asChild><Link href="/auth/signin">Anmelden</Link></Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container px-4 py-8 max-w-xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  const displayCovers = organizer ? coverImages : pendingCovers

  return (
    <div className="container px-4 py-4 max-w-xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/events/mine"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Veranstalter-Profil</h1>
        </div>
      </div>

      {!organizer && (
        <Card className="mb-6">
          <CardContent className="px-4 py-3 text-sm text-muted-foreground">
            Erstelle dein Veranstalter-Profil, um Events unter deinem Namen oder deiner Organisation einzureichen.
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Basic info */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: organizer ? f.slug : slugify(e.target.value) }))}
              placeholder="z.B. BasKIDball e.V."
            />
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="baskidball"
              />
              <p className="text-xs text-muted-foreground">Eindeutiger Kurzname, nur Buchstaben, Zahlen und Bindestriche</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Beschreibung</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Wer seid ihr? Was macht ihr?"
              rows={3}
            />
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => logoFileRef.current?.click()}
              disabled={logoUploading}
              className="relative h-14 w-14 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
            >
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="" className="h-14 w-14 object-contain rounded-full" />
              ) : logoUploading ? (
                <div className="animate-spin h-4 w-4 border-2 border-foreground border-t-transparent rounded-full" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <div className="flex-1 min-w-0 space-y-1">
              <Input
                value={form.logo_url}
                onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
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
          <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
        </div>

        {/* Titelbilder */}
        <div className="space-y-2">
          <Label>Titelbilder</Label>
          <p className="text-xs text-muted-foreground">Diese Bilder kannst du beim Erstellen eines Events als Titelbild auswählen.</p>
          <div className="grid grid-cols-3 gap-2">
            {(displayCovers as any[]).map((img) => (
              <div key={img.id ?? img.tempId} className="relative aspect-video rounded-md overflow-hidden bg-muted group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    if (img.id && organizer) {
                      deleteImageMutation.mutate({ imageId: img.id, storagePath: img.storage_path })
                    } else {
                      setPendingCovers(prev => prev.filter(c => c.tempId !== img.tempId))
                    }
                  }}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
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
          <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Kontakt</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@handle" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-Mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@…" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+49…" />
            </div>
          </div>
        </div>

        <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Wird gespeichert…' : organizer ? 'Änderungen speichern' : 'Veranstalter-Profil erstellen'}
        </Button>
      </div>
    </div>
  )
}
