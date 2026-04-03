'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Area } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, QrCode, Pencil, Trash2, Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://opensportmap.de'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface AreaFormValues {
  slug: string
  name: string
  description: string
  min_lat: string
  max_lat: string
  min_lng: string
  max_lng: string
  is_active: boolean
}

const emptyForm: AreaFormValues = {
  slug: '',
  name: '',
  description: '',
  min_lat: '',
  max_lat: '',
  min_lng: '',
  max_lng: '',
  is_active: true,
}

function areaToForm(area: Area): AreaFormValues {
  return {
    slug: area.slug,
    name: area.name,
    description: area.description ?? '',
    min_lat: String(area.min_lat),
    max_lat: String(area.max_lat),
    min_lng: String(area.min_lng),
    max_lng: String(area.max_lng),
    is_active: area.is_active,
  }
}

// ── QR Modal ──────────────────────────────────────────────────────────────────

function QrModal({ area, onClose }: { area: Area; onClose: () => void }) {
  const url = `${APP_BASE_URL}/?area=${area.slug}`

  function downloadSvg() {
    const svg = document.getElementById('area-qr-svg')
    if (!svg) return
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qr-${area.slug}.svg`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function copyUrl() {
    navigator.clipboard.writeText(url)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code — {area.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <QRCodeSVG id="area-qr-svg" value={url} size={200} />
          <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={copyUrl}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> URL kopieren
          </Button>
          <Button size="sm" onClick={downloadSvg}>
            <QrCode className="mr-1.5 h-3.5 w-3.5" /> SVG herunterladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Area Form Modal ───────────────────────────────────────────────────────────

function AreaFormModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial: AreaFormValues
  onClose: () => void
  onSave: (values: AreaFormValues) => void
  saving: boolean
}) {
  const [values, setValues] = useState<AreaFormValues>(initial)

  function set(key: keyof AreaFormValues, value: string | boolean) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  function handleNameChange(name: string) {
    setValues(prev => ({
      ...prev,
      name,
      // Only auto-generate slug if it's still the auto-generated version
      slug: prev.slug === slugify(prev.name) ? slugify(name) : prev.slug,
    }))
  }

  const coordFields: { key: keyof AreaFormValues; label: string }[] = [
    { key: 'min_lat', label: 'Min Lat (Süd)' },
    { key: 'max_lat', label: 'Max Lat (Nord)' },
    { key: 'min_lng', label: 'Min Lng (West)' },
    { key: 'max_lng', label: 'Max Lng (Ost)' },
  ]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial.name ? 'Area bearbeiten' : 'Neue Area'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={values.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Westpark Bonn"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={values.slug}
              onChange={e => set('slug', e.target.value)}
              placeholder="westpark-bonn"
            />
            <p className="text-xs text-muted-foreground">
              URL: {APP_BASE_URL}/?area=<strong>{values.slug || '…'}</strong>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Beschreibung <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={values.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Wird im Banner angezeigt"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {coordFields.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type="number"
                  step="any"
                  value={values[key] as string}
                  onChange={e => set(key, e.target.value)}
                  placeholder="51.1234"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={values.is_active}
              onCheckedChange={v => set('is_active', v)}
            />
            <Label>Aktiv</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={() => onSave(values)} disabled={saving || !values.slug || !values.name}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminAreasPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Area | null>(null)
  const [qrTarget, setQrTarget] = useState<Area | null>(null)

  const { data: areas = [], isLoading } = useQuery<Area[]>({
    queryKey: ['admin-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Area[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: AreaFormValues }) => {
      const payload = {
        slug: values.slug,
        name: values.name,
        description: values.description || null,
        min_lat: parseFloat(values.min_lat),
        max_lat: parseFloat(values.max_lat),
        min_lng: parseFloat(values.min_lng),
        max_lng: parseFloat(values.max_lng),
        is_active: values.is_active,
      }
      if (id) {
        const { error } = await supabase.from('areas').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('areas').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-areas'] })
      setFormOpen(false)
      setEditTarget(null)
      toast({ title: 'Area gespeichert' })
    },
    onError: (err: Error) => {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('areas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-areas'] })
      toast({ title: 'Area gelöscht' })
    },
    onError: (err: Error) => {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' })
    },
  })

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(area: Area) {
    setEditTarget(area)
    setFormOpen(true)
  }

  function handleSave(values: AreaFormValues) {
    saveMutation.mutate({ id: editTarget?.id, values })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Areas</h1>
          <p className="text-sm text-muted-foreground">QR-Code Kartenbereiche verwalten</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Neue Area
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Laden…</p>}

      {!isLoading && areas.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Noch keine Areas. Erstelle die erste Area über den Button oben.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {areas.map(area => (
          <Card key={area.id}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base">{area.name}</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{area.slug}</p>
                  {area.description && (
                    <p className="text-sm text-muted-foreground mt-1">{area.description}</p>
                  )}
                </div>
                <Badge variant={area.is_active ? 'default' : 'secondary'} className="shrink-0">
                  {area.is_active ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3">
                {area.min_lat.toFixed(4)}, {area.min_lng.toFixed(4)} → {area.max_lat.toFixed(4)}, {area.max_lng.toFixed(4)}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setQrTarget(area)}>
                  <QrCode className="mr-1.5 h-3.5 w-3.5" /> QR Code
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(area)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Bearbeiten
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Area "${area.name}" wirklich löschen?`)) {
                      deleteMutation.mutate(area.id)
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {formOpen && (
        <AreaFormModal
          initial={editTarget ? areaToForm(editTarget) : emptyForm}
          onClose={() => { setFormOpen(false); setEditTarget(null) }}
          onSave={handleSave}
          saving={saveMutation.isPending}
        />
      )}

      {qrTarget && <QrModal area={qrTarget} onClose={() => setQrTarget(null)} />}
    </div>
  )
}
