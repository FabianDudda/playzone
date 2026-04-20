'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import React from 'react'
import dynamic from 'next/dynamic'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { PlaceWithCourts, ModerationStatus, PendingPlaceChange, OpeningHours } from '@/lib/supabase/types'
import OpeningHoursEditor from '@/components/places/opening-hours-editor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MapPin,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MoreVertical,
  Calendar,
  Edit,
  Flag,
  Trash2,
  MapIcon,
  Loader2,
  Save,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  Camera,
  ShieldCheck,
} from 'lucide-react'
import ValidationBadge from '@/components/admin/validation-badge'
import type { ValidationResult } from '@/lib/validation/place-validation'
import { getSportBadgeClasses, sportNames, sportIcons, getPlaceTypeBadgeClasses, placeTypeLabels, placeTypeIcons, PlaceType, SPORT_ORDER } from '@/lib/utils/sport-utils'
import { AttributeIconRow } from '@/components/attributes/attribute-icons'
import { ATTRIBUTE_DEFINITIONS } from '@/lib/attributes/definitions'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const AdminMiniMap = dynamic(() => import('@/components/map/admin-mini-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
})

interface CourtEditRow {
  id?: string
  sport: string
  surface: string
  quantity: string
  notes: string
  customSportName?: string
  attributes: Record<string, boolean>
}

interface PlaceEditForm {
  name: string
  description: string
  place_type: string
  street: string
  house_number: string
  city: string
  postcode: string
  district: string
  county: string
  state: string
  country: string
  latitude: string
  longitude: string
  sports: string[]
  courts: CourtEditRow[]
  contact_phone: string
  contact_email: string
  contact_website: string
  opening_hours: OpeningHours | null
  image_url: string | null
  placeAttributes: Record<string, boolean>
}

function getSourceLabel(source: string | null | undefined): string {
  if (!source) return '— Unknown'
  if (source === 'openstreetmap') return '🗺 OpenStreetMap'
  if (source === 'user') return '👤 User submission'
  if (source === 'guest') return '👤 Guest submission'
  if (source.startsWith('import_')) return `📥 Imported (${source.replace('import_', '')})`
  return source
}

function ModerationStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: database.moderation.getModerationStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) return <div>Loading stats...</div>

  return (
    <>
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.pending || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Community Edits</CardTitle>
          <Edit className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.community_edits || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reports</CardTitle>
          <Flag className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.reports || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.approved || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.rejected || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <MapPin className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total || 0}</div>
        </CardContent>
      </Card>
    </div>

    </>
  )
}

function PlaceAttributesPanel({ place }: { place: PlaceWithCourts }) {
  const courtIds = (place.courts ?? []).map(c => c.id)

  const { data: placeAttrRows = [] } = useQuery({
    queryKey: ['place-attributes', place.id],
    queryFn: () => database.attributes.getPlaceAttributes(place.id),
  })
  const { data: courtAttrRows = [] } = useQuery({
    queryKey: ['court-attributes', courtIds],
    queryFn: () => database.attributes.getCourtAttributes(courtIds),
    enabled: courtIds.length > 0,
  })

  const placeAttrKeys = placeAttrRows.filter(r => r.value === 'true').map(r => r.key)

  // Group court attrs by sport (deduped)
  const courtAttrBySport: Record<string, string[]> = {}
  for (const court of place.courts ?? []) {
    const keys = courtAttrRows
      .filter(r => r.court_id === court.id && r.value === 'true')
      .map(r => r.key)
    if (keys.length > 0) {
      const existing = courtAttrBySport[court.sport] ?? []
      courtAttrBySport[court.sport] = [...new Set([...existing, ...keys])]
    }
  }

  const hasAny = placeAttrKeys.length > 0 || Object.keys(courtAttrBySport).length > 0
  if (!hasAny) return null

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">Ausstattung</Label>
      <div className="space-y-1 mt-1">
        {placeAttrKeys.length > 0 && (
          <div className="text-xs bg-muted p-2 rounded">
            <span className="text-muted-foreground mr-1">Anlage:</span>
            <AttributeIconRow activeKeys={placeAttrKeys} size="xs" />
          </div>
        )}
        {Object.entries(courtAttrBySport).map(([sport, keys]) => (
          <div key={sport} className="text-xs bg-muted p-2 rounded flex items-center gap-2">
            <span className="text-muted-foreground">{sportNames[sport] || sport}:</span>
            <AttributeIconRow activeKeys={keys} size="xs" />
          </div>
        ))}
      </div>
    </div>
  )
}

const PlaceCard = React.memo(function PlaceCard({
  place,
  onApprove,
  onReject,
  showStatus = true,
  isSelectable = false,
  isSelected = false,
  onToggleSelection,
  forceExpanded = false,
  validationResult,
  fullWidth = false,
}: {
  place: PlaceWithCourts
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
  showStatus?: boolean
  isSelectable?: boolean
  isSelected?: boolean
  onToggleSelection?: () => void
  forceExpanded?: boolean
  validationResult?: ValidationResult
  fullWidth?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const expanded = forceExpanded || isExpanded
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState<PlaceEditForm>({
    name: '', description: '', place_type: '',
    street: '', house_number: '', city: '', postcode: '',
    district: '', county: '', state: '', country: '',
    latitude: '', longitude: '', sports: [], courts: [],
    contact_phone: '', contact_email: '', contact_website: '',
    image_url: null,
    placeAttributes: {},
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const hasCoords = place.latitude != null && place.longitude != null

  const courtIds = (place.courts ?? []).map(c => c.id)
  const { data: placeAttrRows = [] } = useQuery({
    queryKey: ['place-attributes', place.id],
    queryFn: () => database.attributes.getPlaceAttributes(place.id),
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  })
  const { data: courtAttrRows = [] } = useQuery({
    queryKey: ['court-attributes', courtIds],
    queryFn: () => database.attributes.getCourtAttributes(courtIds),
    enabled: expanded && courtIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const { data: nearbyData } = useQuery({
    queryKey: ['nearby-places', place.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/places/nearby?lat=${place.latitude}&lng=${place.longitude}&radius=500&exclude_id=${place.id}`
      )
      return res.json()
    },
    enabled: expanded && hasCoords,
    staleTime: 60000,
  })
  const nearbyPlaces: { id: string; name: string; moderation_status: string; distance: number }[] =
    nearbyData?.places || []

  const availableSports = place.courts?.length > 0
    ? [...new Set(place.courts.map(court => court.sport))]
    : (place.sports || [])

  const addressParts = [
    place.street && place.house_number ? `${place.street} ${place.house_number}` : place.street,
    place.city,
    place.district,
    place.state,
    place.country,
  ].filter(Boolean)
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null

  const getStatusIcon = (status: ModerationStatus) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusColor = (status: ModerationStatus) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
    }
  }

  const handleToggleExpand = () => {
    if (expanded && isEditing) setIsEditing(false)
    setIsExpanded(prev => !prev)
  }

  const startEditing = () => {
    // Build place attribute map from loaded rows
    const placeAttrs: Record<string, boolean> = {}
    for (const r of placeAttrRows) {
      if (r.value === 'true') placeAttrs[r.key] = true
    }
    setEditForm({
      name: place.name || '',
      description: place.description || '',
      place_type: place.place_type || '',
      street: place.street || '',
      house_number: place.house_number || '',
      city: place.city || '',
      postcode: place.postcode || '',
      district: place.district || '',
      county: place.county || '',
      state: place.state || '',
      country: place.country || '',
      latitude: place.latitude?.toString() || '',
      longitude: place.longitude?.toString() || '',
      sports: (place.sports as string[]) || [],
      courts: (place.courts || []).flatMap(c => {
        // Build per-court attribute map
        const rows = courtAttrRows.filter(r => r.court_id === c.id && r.value === 'true')
        const attrMap: Record<string, boolean> = {}
        for (const r of rows) attrMap[r.key] = true
        return Array.from({ length: Math.max(c.quantity || 1, 1) }, (_, idx) => ({
          // Only the first expanded row keeps the original DB id; extra rows are new courts
          id: idx === 0 ? c.id : undefined,
          sport: c.sport,
          surface: c.surface || '',
          quantity: '1',
          notes: c.notes || '',
          customSportName: c.custom_sport_name || '',
          attributes: { ...attrMap },
        }))
      }),
      contact_phone: place.contact_phone || '',
      contact_email: place.contact_email || '',
      contact_website: place.contact_website || '',
      opening_hours: (place.opening_hours as OpeningHours | null) ?? null,
      image_url: place.image_url || null,
      placeAttributes: placeAttrs,
    })
    setIsEditing(true)
  }

  const handleSave = async (andApprove: boolean) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/places/${place.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          place_type: editForm.place_type,
          street: editForm.street,
          house_number: editForm.house_number,
          city: editForm.city,
          postcode: editForm.postcode,
          district: editForm.district,
          county: editForm.county,
          state: editForm.state,
          country: editForm.country,
          sports: [...new Set([...editForm.sports, ...editForm.courts.map(c => c.sport).filter(Boolean)])],
          latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
          longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
          courts: editForm.courts.map(c => ({
            ...(c.id ? { id: c.id } : {}),
            sport: c.sport,
            surface: c.surface || null,
            quantity: 1,
            notes: c.notes || null,
            customSportName: c.customSportName || null,
            attributes: c.attributes ?? {},
          })),
          contact_phone: editForm.contact_phone || null,
          contact_email: editForm.contact_email || null,
          contact_website: editForm.contact_website || null,
          opening_hours: editForm.opening_hours,
          image_url: editForm.image_url,
          placeAttributes: editForm.placeAttributes,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      queryClient.invalidateQueries({ queryKey: ['places'] })
      queryClient.invalidateQueries({ queryKey: ['nearby-places', place.id] })
      queryClient.invalidateQueries({ queryKey: ['place-attributes', place.id] })
      queryClient.invalidateQueries({ queryKey: ['court-attributes', courtIds] })
      if (andApprove) {
        onApprove(place.id)
      } else {
        toast({ title: 'Saved', description: `${place.name} updated` })
      }
      setIsEditing(false)
    } catch {
      toast({ title: 'Error', description: 'Could not save changes', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: text })
  }

  const toggleSport = (sport: string) => {
    setEditForm(prev => {
      const isRemoving = prev.sports.includes(sport)
      return {
        ...prev,
        sports: isRemoving
          ? prev.sports.filter(s => s !== sport)
          : [...prev.sports, sport],
        courts: isRemoving
          ? prev.courts.filter(c => c.sport !== sport)
          : prev.courts.some(c => c.sport === sport)
            ? prev.courts
            : [...prev.courts, { sport, surface: '', quantity: '1', notes: '' }],
      }
    })
  }

  const handleAddSportFromOsm = (sport: string) => {
    const currentSports = (place.sports as string[]) ?? []
    if (currentSports.includes(sport)) return

    if (isEditing) {
      toggleSport(sport)
      return
    }

    // Open edit mode with sport pre-added in one atomic setState
    setEditForm({
      name: place.name || '',
      description: place.description || '',
      place_type: place.place_type || '',
      street: place.street || '',
      house_number: place.house_number || '',
      city: place.city || '',
      postcode: place.postcode || '',
      district: place.district || '',
      county: place.county || '',
      state: place.state || '',
      country: place.country || '',
      latitude: place.latitude?.toString() || '',
      longitude: place.longitude?.toString() || '',
      sports: [...currentSports, sport],
      courts: [
        ...(place.courts || []).flatMap(c =>
          Array.from({ length: Math.max(c.quantity || 1, 1) }, () => ({
            id: c.id,
            sport: c.sport,
            surface: c.surface || '',
            quantity: '1',
            notes: c.notes || '',
            customSportName: c.custom_sport_name || '',
          }))
        ),
        { sport, surface: '', quantity: '1', notes: '' },
      ],
      contact_phone: place.contact_phone || '',
      contact_email: place.contact_email || '',
      contact_website: place.contact_website || '',
      opening_hours: (place.opening_hours as OpeningHours | null) ?? null,
      image_url: place.image_url || null,
    })
    setIsEditing(true)
    setIsExpanded(true)
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {isSelectable && (
              <div className="pt-1 shrink-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onToggleSelection}
                  className="rounded"
                />
              </div>
            )}
            {place.image_url ? (
              <img
                src={place.image_url}
                alt={place.name}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{place.name}</CardTitle>
                {place.place_type && (
                  <Badge className={`text-xs ${getPlaceTypeBadgeClasses(place.place_type)}`}>
                    {placeTypeIcons[place.place_type as PlaceType] || ''} {placeTypeLabels[place.place_type as PlaceType] || place.place_type}
                  </Badge>
                )}
                {place.is_guest_submission && (
                  <Badge className="text-xs bg-yellow-100 text-yellow-800">Gast</Badge>
                )}
                {showStatus && (
                  <Badge className={`text-xs ${getStatusColor(place.moderation_status)}`}>
                    {getStatusIcon(place.moderation_status)}
                    <span className="ml-1 capitalize">{place.moderation_status}</span>
                  </Badge>
                )}
                {place.moderation_status === 'pending' && !fullWidth && (
                  <ValidationBadge place={place} initialResult={validationResult} onAddSport={handleAddSportFromOsm} />
                )}
              </div>

              {fullAddress && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{fullAddress}</span>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {place.profiles?.name ?? 'Gast'}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(place.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpand}
            className="shrink-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1 text-xs hidden sm:inline">{expanded ? 'Collapse' : 'View Details'}</span>
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className={fullWidth ? 'pt-0' : 'space-y-4 pt-0'}>
          {fullWidth ? (
            /* ── Full-width layout (pending tab) ── */
            <div className="space-y-4">
              {/* Validation */}
              {place.moderation_status === 'pending' && (
                <div>
                  <ValidationBadge place={place} initialResult={validationResult} onAddSport={handleAddSportFromOsm} />
                </div>
              )}

              {/* Duplicate alert */}
              {nearbyPlaces.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {nearbyPlaces.length} nearby place{nearbyPlaces.length > 1 ? 's' : ''} within 500m
                  </div>
                  {nearbyPlaces.map(np => (
                    <div key={np.id} className="flex items-center justify-between text-xs text-yellow-700 pl-6">
                      <Link href={`/places/${np.id}`} target="_blank" className="font-medium underline underline-offset-2 hover:text-yellow-900">{np.name}</Link>
                      <span className="text-yellow-600">{np.distance}m · {np.moderation_status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Maps row — own map + Google satellite side by side */}
              <div className="grid grid-cols-2 gap-4 items-start">
                {hasCoords ? (
                  <AdminMiniMap
                    latitude={Number(place.latitude)}
                    longitude={Number(place.longitude)}
                    placeName={place.name}
                    sports={availableSports}
                    nearbyPlaces={nearbyPlaces}
                    onLocationSelect={isEditing ? (lat, lng) => setEditForm(prev => ({
                      ...prev,
                      latitude: lat.toFixed(7),
                      longitude: lng.toFixed(7),
                    })) : undefined}
                    height="360px"
                    className="w-full"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 h-[360px]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    No coordinates — map unavailable
                  </div>
                )}
                {hasCoords ? (
                  <iframe
                    src={`https://www.google.com/maps?q=${place.latitude},${place.longitude}&t=k&z=18&output=embed`}
                    width="100%"
                    height="360"
                    className="rounded-lg border"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[360px] rounded-lg border bg-muted text-sm text-muted-foreground">
                    No coordinates
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {isEditing ? (
                <div className="flex gap-2">
                  {place.moderation_status === 'pending' && (
                    <Button onClick={() => handleSave(true)} disabled={isSaving || !editForm.name.trim()} className="flex-1">
                      {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Save & Approve
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving || !editForm.name.trim()} className="flex-1">
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save draft
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                </div>
              ) : place.moderation_status === 'pending' ? (
                <div className="flex gap-2">
                  <Button onClick={() => onApprove(place.id)} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />Approve
                  </Button>
                  <Button variant="outline" onClick={startEditing} className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />Edit
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => onReject(place.id, '')}>
                    <XCircle className="h-4 w-4 mr-2" />Reject
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            /* ── Standard single-column layout (other tabs) ── */
            <>
              {/* Actions */}
              {isEditing && (
                <div className="flex gap-2">
                  {place.moderation_status === 'pending' && (
                    <Button onClick={() => handleSave(true)} disabled={isSaving || !editForm.name.trim()} className="flex-1">
                      {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Save & Approve
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving || !editForm.name.trim()} className="flex-1">
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save draft
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                </div>
              )}
              {!isEditing && place.moderation_status === 'pending' && (
                <div className="flex gap-2">
                  <Button onClick={() => onApprove(place.id)} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />Approve
                  </Button>
                  <Button variant="outline" onClick={startEditing} className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />Edit
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => onReject(place.id, '')}>
                    <XCircle className="h-4 w-4 mr-2" />Reject
                  </Button>
                </div>
              )}

              {/* Map */}
              {hasCoords ? (
                <AdminMiniMap
                  latitude={Number(place.latitude)}
                  longitude={Number(place.longitude)}
                  placeName={place.name}
                  sports={availableSports}
                  nearbyPlaces={nearbyPlaces}
                  onLocationSelect={isEditing ? (lat, lng) => setEditForm(prev => ({
                    ...prev,
                    latitude: lat.toFixed(7),
                    longitude: lng.toFixed(7),
                  })) : undefined}
                  height="440px"
                  className="w-full"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No coordinates — map and duplicate check unavailable
                </div>
              )}

              {/* Duplicate alert */}
              {nearbyPlaces.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {nearbyPlaces.length} nearby place{nearbyPlaces.length > 1 ? 's' : ''} within 500m
                  </div>
                  {nearbyPlaces.map(np => (
                    <div key={np.id} className="flex items-center justify-between text-xs text-yellow-700 pl-6">
                      <Link href={`/places/${np.id}`} target="_blank" className="font-medium underline underline-offset-2 hover:text-yellow-900">{np.name}</Link>
                      <span className="text-yellow-600">{np.distance}m · {np.moderation_status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Google Maps iframe */}
              {hasCoords && (
                <iframe
                  src={`https://www.google.com/maps?q=${place.latitude},${place.longitude}&t=k&output=embed`}
                  width="100%"
                  height="480"
                  className="rounded-lg border"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </>
          )}

          {!isEditing ? (
            <>
              {/* Sports */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Sports</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {availableSports.length > 0 ? (
                    availableSports.map((sport) => (
                      <Badge key={sport} className={`text-xs ${getSportBadgeClasses(sport)}`}>
                        {sportIcons[sport] || '📍'} {sportNames[sport] || sport}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No sports specified</span>
                  )}
                </div>
              </div>

              {/* Courts */}
              {place.courts && place.courts.length > 0 && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Courts</Label>
                  <div className="space-y-2 mt-1">
                    {place.courts.map((court) => (
                      <div key={court.id} className="text-xs bg-muted p-2 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{court.sport === 'other' ? (court.custom_sport_name || 'Andere Sportart') : (sportNames[court.sport] || court.sport)}</span>
                          <span>Qty: {court.quantity}</span>
                        </div>
                        {court.surface && <div className="text-muted-foreground">Surface: {court.surface}</div>}
                        {court.notes && <div className="text-muted-foreground">Notes: {court.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attributes */}
              <PlaceAttributesPanel place={place} />

              {/* Core Info */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Place ID</Label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-xs text-muted-foreground truncate">{place.id}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => copyToClipboard(place.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Source</Label>
                  <p className="text-sm mt-0.5">{getSourceLabel(place.source)}</p>
                </div>

                {place.description && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                    <p className="text-sm mt-0.5">{place.description}</p>
                  </div>
                )}
              </div>

              {/* Address */}
              {(place.street || place.city || place.postcode || place.country) && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Address</Label>
                  <div className="mt-1 text-sm space-y-0.5">
                    {(place.street || place.house_number) && (
                      <div>{[place.street, place.house_number].filter(Boolean).join(' ')}</div>
                    )}
                    {(place.postcode || place.city) && (
                      <div>{[place.postcode, place.city].filter(Boolean).join(' ')}</div>
                    )}
                    {place.district && <div className="text-muted-foreground">{place.district}</div>}
                    {place.county && <div className="text-muted-foreground">{place.county}</div>}
                    {place.state && <div className="text-muted-foreground">{place.state}</div>}
                    {place.country && <div className="text-muted-foreground">{place.country}</div>}
                  </div>
                </div>
              )}

              {/* Image */}
              {place.image_url && (
                <img
                  src={place.image_url}
                  alt={place.name}
                  className="w-full h-40 object-cover rounded-lg"
                />
              )}

              {/* Coordinates */}
              {hasCoords && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Coordinates</Label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {Number(place.latitude).toFixed(6)}, {Number(place.longitude).toFixed(6)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => copyToClipboard(`${place.latitude}, ${place.longitude}`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Beschreibung</Label>
                <p className="text-sm mt-0.5">
                  {place.description || <span className="text-muted-foreground">—</span>}
                </p>
              </div>

              {/* Contact */}
              {(place.contact_phone || place.contact_email || place.contact_website) && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Kontakt</Label>
                  <div className="mt-1 text-sm space-y-0.5">
                    {place.contact_phone && <div>{place.contact_phone}</div>}
                    {place.contact_email && <div>{place.contact_email}</div>}
                    {place.contact_website && <div className="text-muted-foreground truncate">{place.contact_website}</div>}
                  </div>
                </div>
              )}

              {/* Opening hours */}
              {place.opening_hours && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Öffnungszeiten</Label>
                  <div className="mt-1 text-sm space-y-0.5">
                    {(() => {
                      const hours = place.opening_hours as OpeningHours
                      const dayLabels: Record<string, string> = { monday: 'Mo', tuesday: 'Di', wednesday: 'Mi', thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So' }
                      return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(key => {
                        const day = hours[key as keyof OpeningHours]
                        return (
                          <div key={key} className="flex gap-2">
                            <span className="text-muted-foreground w-6">{dayLabels[key]}</span>
                            {day && !day.closed && day.open && day.close
                              ? <span>{day.open} – {day.close}</span>
                              : <span className="text-muted-foreground">Geschlossen</span>
                            }
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}

              {/* Submitter */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Submitted by</Label>
                <p className="text-sm mt-0.5">
                  {place.profiles?.name ?? 'Gast'}{' '}
                  <span className="text-muted-foreground text-xs">
                    on {new Date(place.created_at).toLocaleString()}
                  </span>
                </p>
              </div>

              {/* Rejection reason */}
              {place.moderation_status === 'rejected' && place.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <Label className="text-xs font-medium text-red-700">Rejection Reason</Label>
                  <p className="text-sm text-red-600 mt-1">{place.rejection_reason}</p>
                </div>
              )}

              {/* Moderated info */}
              {place.moderated_at && (
                <div className="text-xs text-muted-foreground">
                  Moderated on {new Date(place.moderated_at).toLocaleString()}
                </div>
              )}

            </>
          ) : (
            // ── Edit form ──
            <>
              {/* Sports */}
              <div>
                <Label className="text-xs">Sports</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SPORT_ORDER.map(key => [key, sportNames[key] ?? key] as [string, string]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSport(key)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        editForm.sports.includes(key)
                          ? getSportBadgeClasses(key) + ' border-transparent'
                          : 'bg-background border-border text-muted-foreground hover:border-primary'
                      }`}
                    >
                      {sportIcons[key] || '📍'} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Courts editor — one row per physical court, surface per court */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Courts</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setEditForm(prev => ({
                      ...prev,
                      courts: [...prev.courts, { sport: '', surface: 'Unbekannt', quantity: '1', notes: '' }],
                    }))}
                  >
                    + Add court
                  </Button>
                </div>
                {editForm.courts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No courts — click &quot;Add court&quot; to add one.</p>
                ) : (
                  <div className="space-y-2">
                    {editForm.courts.map((court, i) => {
                      const isLastOfSport = court.sport
                        ? !editForm.courts.slice(i + 1).some(c => c.sport === court.sport)
                        : false
                      const courtIndex = editForm.courts.slice(0, i).filter(c => c.sport === court.sport).length
                      const courtAttrdefs = court.sport
                        ? ATTRIBUTE_DEFINITIONS.filter(d =>
                            d.scope === 'court' && (!d.sports || d.sports.includes(court.sport))
                          )
                        : []
                      return (
                        <React.Fragment key={i}>
                          <div className="grid grid-cols-[1fr_1fr_1fr_28px] gap-2 items-start bg-muted/50 p-2 rounded">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Sport{court.sport ? ` (Platz ${courtIndex + 1})` : ''}
                              </Label>
                              <Select
                                value={court.sport}
                                onValueChange={val => setEditForm(prev => {
                                  const courts = [...prev.courts]
                                  courts[i] = { ...courts[i], sport: val, customSportName: val !== 'other' ? '' : courts[i].customSportName }
                                  return { ...prev, courts }
                                })}
                              >
                                <SelectTrigger className="mt-0.5 h-7 text-xs">
                                  <SelectValue placeholder="Select…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SPORT_ORDER.map(key => (
                                    <SelectItem key={key} value={key} className="text-xs">
                                      {sportIcons[key] || '📍'} {sportNames[key] ?? key}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {court.sport === 'other' && (
                                <Input
                                  placeholder="Sport name…"
                                  value={court.customSportName || ''}
                                  onChange={e => setEditForm(prev => {
                                    const courts = [...prev.courts]
                                    courts[i] = { ...courts[i], customSportName: e.target.value }
                                    return { ...prev, courts }
                                  })}
                                  className="mt-1 h-7 text-xs"
                                />
                              )}
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Surface</Label>
                              <Select
                                value={court.surface || 'Unbekannt'}
                                onValueChange={val => setEditForm(prev => {
                                  const courts = [...prev.courts]
                                  courts[i] = { ...courts[i], surface: val }
                                  return { ...prev, courts }
                                })}
                              >
                                <SelectTrigger className="mt-0.5 h-7 text-xs">
                                  <SelectValue placeholder="Select…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {['Unbekannt', 'Rasen', 'Kunstrasen', 'Hartplatz', 'Asphalt', 'Kunststoffbelag', 'Asche', 'Sand', 'Sonstiges'].map(s => (
                                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Notes</Label>
                              <Input
                                value={court.notes}
                                onChange={e => setEditForm(prev => {
                                  const courts = [...prev.courts]
                                  courts[i] = { ...courts[i], notes: e.target.value }
                                  return { ...prev, courts }
                                })}
                                className="mt-0.5 h-7 text-xs"
                                placeholder="Optional"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditForm(prev => ({
                                ...prev,
                                courts: prev.courts.filter((_, idx) => idx !== i),
                              }))}
                              className="mt-5 text-muted-foreground hover:text-destructive transition-colors"
                              aria-label="Remove court"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                          {courtAttrdefs.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 px-2 pb-1">
                              {courtAttrdefs.map(def => {
                                const active = !!(court.attributes?.[def.key])
                                return (
                                  <button
                                    key={def.key}
                                    type="button"
                                    onClick={() => setEditForm(prev => {
                                      const courts = [...prev.courts]
                                      courts[i] = { ...courts[i], attributes: { ...(courts[i].attributes ?? {}), [def.key]: !courts[i].attributes?.[def.key] } }
                                      return { ...prev, courts }
                                    })}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                                      active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary'
                                    }`}
                                  >
                                    {active ? '✓ ' : ''}{def.label}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          {isLastOfSport && court.sport && (
                            <button
                              type="button"
                              onClick={() => setEditForm(prev => {
                                const idx = prev.courts.length - 1 - [...prev.courts].reverse().findIndex(c => c.sport === court.sport)
                                const courts = [...prev.courts]
                                courts.splice(idx + 1, 0, { sport: court.sport, surface: 'Unbekannt', quantity: '1', notes: '', customSportName: court.customSportName, attributes: {} })
                                return { ...prev, courts }
                              })}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-0.5"
                            >
                              + {sportNames[court.sport] ?? court.sport} Platz hinzufügen
                            </button>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                )}

                {/* Place-level attributes (Anlage) */}
                {(() => {
                  const defs = ATTRIBUTE_DEFINITIONS.filter(d => d.scope === 'place')
                  if (defs.length === 0) return null
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground">Anlage:</span>
                      {defs.map(def => {
                        const active = !!editForm.placeAttributes?.[def.key]
                        return (
                          <button
                            key={def.key}
                            type="button"
                            onClick={() => setEditForm(prev => ({
                              ...prev,
                              placeAttributes: { ...prev.placeAttributes, [def.key]: !prev.placeAttributes[def.key] },
                            }))}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary'
                            }`}
                          >
                            {active ? '✓ ' : ''}{def.label}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Place Type</Label>
                    <div className="flex gap-2 mt-1">
                      {[
                        { value: 'öffentlich', label: '🌳 Öffentlich' },
                        { value: 'verein', label: '👥 Verein' },
                        { value: 'schule', label: '🏫 Schule' },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, place_type: value }))}
                          className={`flex-1 text-xs px-3 py-1.5 rounded border transition-colors ${
                            editForm.place_type === value
                              ? 'border-primary bg-primary/10 text-foreground font-medium'
                              : 'border-border text-muted-foreground hover:border-primary'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  {(editForm.place_type === 'verein' || editForm.place_type === 'schule' || editForm.contact_phone || editForm.contact_email || editForm.contact_website) && (
                    <>
                      <div className="col-span-2">
                        <Label className="text-xs">Kontakt: Telefon</Label>
                        <Input
                          value={editForm.contact_phone}
                          onChange={e => setEditForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                          className="mt-1"
                          placeholder="z.B. +49 228 123456"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Kontakt: E-Mail</Label>
                        <Input
                          value={editForm.contact_email}
                          onChange={e => setEditForm(prev => ({ ...prev, contact_email: e.target.value }))}
                          className="mt-1"
                          placeholder="info@verein.de"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Kontakt: Website</Label>
                        <Input
                          value={editForm.contact_website}
                          onChange={e => setEditForm(prev => ({ ...prev, contact_website: e.target.value }))}
                          className="mt-1"
                          placeholder="https://verein.de"
                        />
                      </div>
                    </>
                  )}

                  <div className="col-span-2">
                    <Label className="text-xs">Öffnungszeiten</Label>
                    <div className="mt-2">
                      <OpeningHoursEditor
                        key={place.id}
                        value={editForm.opening_hours}
                        onChange={hours => setEditForm(prev => ({ ...prev, opening_hours: hours }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Street</Label>
                    <Input
                      value={editForm.street}
                      onChange={e => setEditForm(prev => ({ ...prev, street: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">House No.</Label>
                    <Input
                      value={editForm.house_number}
                      onChange={e => setEditForm(prev => ({ ...prev, house_number: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Postcode</Label>
                    <Input
                      value={editForm.postcode}
                      onChange={e => setEditForm(prev => ({ ...prev, postcode: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input
                      value={editForm.city}
                      onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">District</Label>
                    <Input
                      value={editForm.district}
                      onChange={e => setEditForm(prev => ({ ...prev, district: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">County</Label>
                    <Input
                      value={editForm.county}
                      onChange={e => setEditForm(prev => ({ ...prev, county: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">State</Label>
                    <Input
                      value={editForm.state}
                      onChange={e => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Country</Label>
                    <Input
                      value={editForm.country}
                      onChange={e => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  {/* Image */}
                  <div className="col-span-2">
                    {editForm.image_url ? (
                      <div className="relative">
                        <img
                          src={editForm.image_url}
                          alt={place.name}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setEditForm(prev => ({ ...prev, image_url: null }))}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete Image
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full h-16 bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={editForm.latitude}
                      onChange={e => setEditForm(prev => ({ ...prev, latitude: e.target.value }))}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={editForm.longitude}
                      onChange={e => setEditForm(prev => ({ ...prev, longitude: e.target.value }))}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                </div>

              </div>

            </>
          )}
        </CardContent>
      )}
    </Card>
  )
})

const PENDING_PAGE_SIZE = 50

const RADIUS_OPTIONS = [
  { label: '50m', value: 50 },
  { label: '100m', value: 100 },
  { label: '200m', value: 200 },
  { label: '300m', value: 300 },
]

function PlacesList({ status, fullWidth = false }: { status: ModerationStatus; fullWidth?: boolean }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Bulk selection state
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set())
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [page, setPage] = useState(0)
  const [expandAll, setExpandAll] = useState(false)

  // Validation state
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({})
  const [isBulkValidating, setIsBulkValidating] = useState(false)
  const [validationProgress, setValidationProgress] = useState(0)

  // Submitter filter state
  const [submitterFilter, setSubmitterFilter] = useState<'all' | 'admin' | 'user'>('all')

  // Country / district filter state
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [districtFilter, setDistrictFilter] = useState<string>('all')

  // Source / place type / sport filter state
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [placeTypeFilter, setPlaceTypeFilter] = useState<string>('all')
  const [sportFilter, setSportFilter] = useState<string>('all')

  // Isolated filter state
  const [isolatedOnly, setIsolatedOnly] = useState(false)
  const [isolatedRadius, setIsolatedRadius] = useState(200)
  const [isolatedIncludePending, setIsolatedIncludePending] = useState(false)

  const { data: moderationMeta } = useQuery({
    queryKey: ['moderation-meta', status],
    queryFn: () => database.places.getModerationMeta(status),
    staleTime: 60000,
  })

  const { data: isolatedIds, isLoading: isLoadingIsolated } = useQuery({
    queryKey: ['isolated-pending-ids', isolatedRadius, isolatedIncludePending],
    queryFn: () => database.moderation.getIsolatedPendingIds(isolatedRadius, isolatedIncludePending),
    enabled: status === 'pending' && isolatedOnly,
    staleTime: 30000,
  })

  // When isolatedOnly is active, pass the fetched IDs as a filter.
  // Pass undefined while still loading (shows all places until IDs arrive).
  // Pass an empty array when loaded but empty (returns 0 results — no isolated places exist).
  const activeIsolatedIds =
    status === 'pending' && isolatedOnly && !isLoadingIsolated
      ? (isolatedIds ?? [])
      : undefined

  const { data: pagedResult, isLoading } = useQuery({
    queryKey: [
      'places-moderation', status, page,
      countryFilter, cityFilter, districtFilter, sourceFilter, placeTypeFilter, sportFilter,
      activeIsolatedIds,
    ],
    queryFn: () => database.places.getPlacesAdminPaged({
      moderationStatus: status,
      country: countryFilter !== 'all' ? countryFilter : undefined,
      city: cityFilter !== 'all' ? cityFilter : undefined,
      district: districtFilter !== 'all' ? districtFilter : undefined,
      source: sourceFilter !== 'all' ? sourceFilter : undefined,
      placeType: placeTypeFilter !== 'all' ? placeTypeFilter : undefined,
      sport: sportFilter !== 'all' ? sportFilter : undefined,
      ids: activeIsolatedIds,
      page,
      pageSize: PENDING_PAGE_SIZE,
    }),
    placeholderData: (prev) => prev,
  })
  const places = pagedResult?.data ?? []
  const totalCount = pagedResult?.count ?? 0

  // Helper: optimistically remove a place from all cached pages
  const optimisticRemove = useCallback((placeId: string) => {
    queryClient.setQueriesData<{ data: PlaceWithCourts[]; count: number }>(
      { queryKey: ['places-moderation'], exact: false },
      (old) => old ? { data: old.data.filter(p => p.id !== placeId), count: old.count - 1 } : old
    )
  }, [queryClient])

  const approveMutation = useMutation({
    mutationFn: (placeId: string) => database.moderation.approvePlace(placeId, user!.id),
    onMutate: (placeId) => {
      optimisticRemove(placeId)
    },
    onSuccess: () => {
      toast({
        title: 'Place approved',
        description: 'The place has been approved and is now visible on the map.',
      })
      queryClient.invalidateQueries({ queryKey: ['places-moderation'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['moderation-meta'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['places'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['courts'] })
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] })
    },
    onError: (error, placeId) => {
      // Restore on failure by refetching
      queryClient.invalidateQueries({ queryKey: ['places-moderation'], exact: false })
      toast({
        title: 'Error approving place',
        description: error instanceof Error ? error.message : 'Failed to approve place',
        variant: 'destructive',
      })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ placeId, reason }: { placeId: string; reason: string }) =>
      database.moderation.rejectPlace(placeId, user!.id, reason),
    onMutate: ({ placeId }) => {
      optimisticRemove(placeId)
    },
    onSuccess: () => {
      toast({
        title: 'Place rejected',
        description: 'The place has been rejected and the user will be notified.',
      })
      queryClient.invalidateQueries({ queryKey: ['places-moderation'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['moderation-meta'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['places'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] })
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['places-moderation'], exact: false })
      toast({
        title: 'Error rejecting place',
        description: error instanceof Error ? error.message : 'Failed to reject place',
        variant: 'destructive',
      })
    },
  })

  const bulkApproveMutation = useMutation({
    mutationFn: (placeIds: string[]) => database.moderation.bulkApprovePlace(placeIds, user!.id),
    onSuccess: (result) => {
      const { successCount, failureCount, failed } = result
      
      if (failureCount === 0) {
        toast({
          title: 'Bulk approval successful',
          description: `Successfully approved ${successCount} places.`,
        })
      } else {
        toast({
          title: 'Partial success',
          description: `Approved ${successCount} places, ${failureCount} failed. Check console for details.`,
          variant: failureCount > successCount ? 'destructive' : 'default',
        })
        failed.forEach(failure => {
          console.error('Failed to approve place:', failure)
        })
      }
      
      // Clear selection and invalidate queries
      setSelectedPlaces(new Set())
      queryClient.invalidateQueries({ queryKey: ['places-moderation'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['moderation-meta'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['places'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['courts'] })
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] })
    },
    onError: (error) => {
      toast({
        title: 'Bulk approval failed',
        description: error instanceof Error ? error.message : 'Failed to approve places',
        variant: 'destructive',
      })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (placeIds: string[]) => database.moderation.bulkDeletePlaces(placeIds),
    onSuccess: (result) => {
      if (result.failureCount === 0) {
        toast({ title: 'Deleted', description: `Successfully deleted ${result.successCount} places.` })
      } else {
        toast({
          title: 'Partial success',
          description: `Deleted ${result.successCount} places, ${result.failureCount} failed.`,
          variant: result.failureCount > result.successCount ? 'destructive' : 'default',
        })
      }
      setSelectedPlaces(new Set())
      queryClient.invalidateQueries({ queryKey: ['places-moderation'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['moderation-meta'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['places'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] })
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete places',
        variant: 'destructive',
      })
    },
  })

  const handleBulkDelete = () => {
    if (selectedPlaces.size === 0) return
    const count = selectedPlaces.size
    if (!window.confirm(`Delete ${count} place${count !== 1 ? 's' : ''}? This cannot be undone.`)) return
    bulkDeleteMutation.mutate(Array.from(selectedPlaces))
  }

  const handleBulkValidate = async (source: 'osm' | 'google') => {
    if (selectedPlaces.size === 0) return
    setIsBulkValidating(true)
    setValidationProgress(0)
    const ids = Array.from(selectedPlaces)
    const BATCH_SIZE = 10
    let completed = 0

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)
      try {
        const res = await fetch('/api/admin/places/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeIds: batch, source }),
        })
        if (res.ok) {
          const data = await res.json()
          setValidationResults(prev => {
            const updated = { ...prev }
            for (const result of (data.results as ValidationResult[]) || []) {
              // Merge: keep existing result for the other source
              const existing = updated[result.placeId]
              updated[result.placeId] = {
                ...result,
                osm: source === 'osm' ? result.osm : (existing?.osm ?? result.osm),
                google: source === 'google' ? result.google : (existing?.google ?? result.google),
              }
            }
            return updated
          })
        }
      } catch (err) {
        console.error('Validation batch error:', err)
      }
      completed += batch.length
      setValidationProgress(completed)
    }

    setIsBulkValidating(false)
  }

  // Filter options come from the lightweight meta query (not the paged data)
  const countryOptions = moderationMeta?.countries ?? []
  const cityOptions = moderationMeta?.cities ?? []
  const districtOptions = moderationMeta?.districts ?? []
  const sourceOptions = moderationMeta?.sources ?? []
  const placeTypeOptions = moderationMeta?.placeTypes ?? []
  const sportOptions = moderationMeta?.sports ?? []

  // Server handles all filters except submitterRole (requires profile join filter not supported by PostgREST)
  const paginatedPlaces = submitterFilter === 'all'
    ? places
    : places.filter(p => {
        const role = p.profiles?.user_role
        if (submitterFilter === 'admin') return role === 'admin'
        return role !== 'admin'
      })

  // Reset page and selection when filter toggles
  useEffect(() => {
    setPage(0)
    setSelectedPlaces(new Set())
  }, [isolatedOnly, isolatedRadius, isolatedIncludePending, submitterFilter, countryFilter, cityFilter, districtFilter, sourceFilter, placeTypeFilter, sportFilter])

  const totalPages = Math.ceil(totalCount / PENDING_PAGE_SIZE)
  const filteredPlaces = paginatedPlaces

  // Stable callbacks for PlaceCard — avoids re-rendering all cards on unrelated state changes
  const approveMutateRef = useRef(approveMutation.mutate)
  approveMutateRef.current = approveMutation.mutate
  const rejectMutateRef = useRef(rejectMutation.mutate)
  rejectMutateRef.current = rejectMutation.mutate

  const handleApprove = useCallback((id: string) => approveMutateRef.current(id), [])
  const handleReject = useCallback((id: string, reason: string) => rejectMutateRef.current({ placeId: id, reason }), [])

  // Bulk selection helpers
  const togglePlaceSelection = useCallback((placeId: string) => {
    setSelectedPlaces(prev => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })
  }, [])

  const selectAllPlaces = () => {
    setSelectedPlaces(new Set(paginatedPlaces.map(place => place.id)))
  }

  const clearSelection = () => {
    setSelectedPlaces(new Set())
  }

  const handleBulkApprove = () => {
    if (selectedPlaces.size === 0) return
    bulkApproveMutation.mutate(Array.from(selectedPlaces))
  }

  const handleApproveAllIsolated = () => {
    if (!isolatedIds || isolatedIds.length === 0) return
    bulkApproveMutation.mutate(isolatedIds)
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading places...</div>
  }

  if (!isLoading && totalCount === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {status} places found.
      </div>
    )
  }

  return (
    <div>
      {/* Bulk operations controls - only show for pending places */}
      {status === 'pending' && totalCount > 0 && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border space-y-3">
          {/* Row 0: Submitter filter */}
          {status === 'pending' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Submitted by:</span>
              {(['all', 'user', 'admin'] as const).map(f => (
                <Button
                  key={f}
                  variant={submitterFilter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSubmitterFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'admin' ? 'Admins' : 'Users'}
                  {f !== 'all' && (
                    <span className="ml-1.5 text-xs opacity-70">
                      ({(places ?? []).filter(p => f === 'admin' ? p.profiles?.user_role === 'admin' : p.profiles?.user_role !== 'admin').length})
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Row 1: Country / district filter */}
          {status === 'pending' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Location:</span>
              <Select
                value={countryFilter}
                onValueChange={(v) => { setCountryFilter(v); setCityFilter('all'); setDistrictFilter('all') }}
              >
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {countryOptions.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={cityFilter}
                onValueChange={(v) => { setCityFilter(v); setDistrictFilter('all') }}
                disabled={cityOptions.length === 0}
              >
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cityOptions.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={districtFilter}
                onValueChange={setDistrictFilter}
                disabled={districtOptions.length === 0}
              >
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All districts</SelectItem>
                  {districtOptions.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(countryFilter !== 'all' || cityFilter !== 'all' || districtFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCountryFilter('all'); setCityFilter('all'); setDistrictFilter('all') }}
                >
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Row 2: Source / place type / sport filter */}
          {status === 'pending' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {sourceOptions.map(s => (
                    <SelectItem key={s} value={s}>{getSourceLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={placeTypeFilter} onValueChange={setPlaceTypeFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="Place type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {placeTypeOptions.map(t => (
                    <SelectItem key={t} value={t}>
                      {placeTypeIcons[t as PlaceType] ?? ''} {placeTypeLabels[t as PlaceType] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="Sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sports</SelectItem>
                  {sportOptions.map(s => (
                    <SelectItem key={s} value={s}>
                      {sportIcons[s] ?? ''} {sportNames[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(sourceFilter !== 'all' || placeTypeFilter !== 'all' || sportFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSourceFilter('all'); setPlaceTypeFilter('all'); setSportFilter('all') }}
                >
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Row 3: Isolated filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant={isolatedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsolatedOnly(v => !v)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {isolatedOnly ? 'Showing isolated only' : 'Show isolated only'}
              </Button>

              <Select
                value={String(isolatedRadius)}
                onValueChange={(v) => setIsolatedRadius(Number(v))}
              >
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isolatedOnly && (
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isolatedIncludePending}
                    onChange={e => setIsolatedIncludePending(e.target.checked)}
                    className="rounded"
                  />
                  also check pending
                </label>
              )}

              {isolatedOnly && (
                <span className="text-sm text-muted-foreground">
                  {isLoadingIsolated
                    ? 'Calculating…'
                    : `${isolatedIds?.length ?? 0} of ${totalCount} pending places are isolated`}
                </span>
              )}
            </div>

            {/* Approve all isolated */}
            {isolatedOnly && !isLoadingIsolated && (isolatedIds?.length ?? 0) > 0 && (
              <Button
                size="sm"
                onClick={handleApproveAllIsolated}
                disabled={bulkApproveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve all isolated ({isolatedIds?.length ?? 0})
              </Button>
            )}
          </div>

          {/* Row 3: Bulk select controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant={isBulkMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsBulkMode(!isBulkMode)
                  setSelectedPlaces(new Set())
                }}
              >
                {isBulkMode ? 'Exit Bulk Mode' : 'Bulk Select'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandAll(prev => !prev)}
              >
                {expandAll ? <><ChevronUp className="h-4 w-4 mr-1" /> Collapse All</> : <><ChevronDown className="h-4 w-4 mr-1" /> Expand All</>}
              </Button>

              {isBulkMode && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={paginatedPlaces.length > 0 && paginatedPlaces.every(p => selectedPlaces.has(p.id))}
                    onChange={paginatedPlaces.every(p => selectedPlaces.has(p.id)) ? clearSelection : selectAllPlaces}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">
                    Select All ({selectedPlaces.size}/{paginatedPlaces.length} this page)
                  </span>
                </div>
              )}
            </div>

            {isBulkMode && selectedPlaces.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkValidate('osm')}
                  disabled={isBulkValidating || bulkApproveMutation.isPending || bulkDeleteMutation.isPending}
                >
                  {isBulkValidating
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />OSM ({validationProgress}/{selectedPlaces.size})</>
                    : <><ShieldCheck className="h-4 w-4 mr-2" />OSM ({selectedPlaces.size})</>
                  }
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkValidate('google')}
                  disabled={isBulkValidating || bulkApproveMutation.isPending || bulkDeleteMutation.isPending}
                >
                  {isBulkValidating
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Google ({validationProgress}/{selectedPlaces.size})</>
                    : <><ShieldCheck className="h-4 w-4 mr-2" />Google ({selectedPlaces.size})</>
                  }
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={bulkApproveMutation.isPending || bulkDeleteMutation.isPending || isBulkValidating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Selected ({selectedPlaces.size})
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending || bulkApproveMutation.isPending || isBulkValidating}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedPlaces.size})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          {bulkApproveMutation.isPending && (
            <div className="text-sm text-muted-foreground">
              Approving places…
            </div>
          )}
        </div>
      )}

      {paginatedPlaces.map((place) => (
        <PlaceCard
          key={place.id}
          place={place}
          onApprove={handleApprove}
          onReject={handleReject}
          showStatus={false}
          isSelectable={isBulkMode}
          isSelected={selectedPlaces.has(place.id)}
          onToggleSelection={() => togglePlaceSelection(place.id)}
          forceExpanded={expandAll}
          validationResult={validationResults[place.id]}
          fullWidth={fullWidth}
        />
      ))}

      {/* Pagination controls - only for pending tab */}
      {status === 'pending' && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            Showing {page * PENDING_PAGE_SIZE + 1}–{Math.min((page + 1) * PENDING_PAGE_SIZE, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage(p => p - 1); setSelectedPlaces(new Set()) }}
              disabled={page === 0}
            >
              ← Prev
            </Button>
            <span className="text-sm font-medium px-2">
              Page {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage(p => p + 1); setSelectedPlaces(new Set()) }}
              disabled={page >= totalPages - 1}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function CommunityEditsTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: pendingEdits, isLoading } = useQuery({
    queryKey: ['community-edits'],
    queryFn: database.community.getPendingPlaceChanges,
    refetchInterval: 10000,
  })

  const approveMutation = useMutation({
    mutationFn: (editId: string) => database.community.approvePlaceEdit(editId, user!.id),
    onSuccess: () => {
      toast({ title: 'Community edit approved', description: 'The suggested changes have been applied to the place.' })
      queryClient.invalidateQueries({ queryKey: ['community-edits'] })
      queryClient.invalidateQueries({ queryKey: ['places'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['courts'] })
    },
    onError: (error) => {
      toast({ title: 'Error approving edit', description: error instanceof Error ? error.message : 'Failed to approve edit', variant: 'destructive' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ editId, reason }: { editId: string; reason: string }) =>
      database.community.rejectPlaceEdit(editId, user!.id, reason),
    onSuccess: () => {
      toast({ title: 'Community edit rejected', description: 'The contributor will be notified of the rejection.' })
      queryClient.invalidateQueries({ queryKey: ['community-edits'] })
    },
    onError: (error) => {
      toast({ title: 'Error rejecting edit', description: error instanceof Error ? error.message : 'Failed to reject edit', variant: 'destructive' })
    },
  })

  if (isLoading) return <div className="text-center py-8">Loading community edits...</div>

  if (!pendingEdits || pendingEdits.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">No pending community edits found.</div>
    )
  }

  return (
    <div className="space-y-4">
      {pendingEdits.map((edit: any) => (
        <CommunityEditCard
          key={edit.id}
          edit={edit}
          onApprove={(id) => approveMutation.mutate(id)}
          onReject={(id, reason) => rejectMutation.mutate({ editId: id, reason })}
        />
      ))}
    </div>
  )
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function CommunityEditCard({ edit, onApprove, onReject }: {
  edit: any
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

  const handleReject = () => {
    if (!rejectionReason.trim()) return
    onReject(edit.id, rejectionReason)
    setRejectionReason('')
    setIsRejectDialogOpen(false)
  }

  const proposedData = edit.proposed_data as any
  const currentData = edit.current_data as any
  const isImageAdd = edit.change_type === 'image_add'

  // ── Change detection ──
  const addressFields: { key: string; label: string }[] = [
    { key: 'street', label: 'Street' },
    { key: 'house_number', label: 'House No.' },
    { key: 'city', label: 'City' },
    { key: 'district', label: 'District' },
    { key: 'county', label: 'County' },
    { key: 'state', label: 'State' },
    { key: 'postcode', label: 'Postcode' },
    { key: 'country', label: 'Country' },
  ]
  const changedAddressFields = addressFields.filter(
    ({ key }) => proposedData?.place?.[key] !== currentData?.place?.[key]
  )
  const proposedSports: string[] = proposedData?.place?.sports || []
  const currentSports: string[] = currentData?.place?.sports || []
  const sportsChanged = JSON.stringify([...proposedSports].sort()) !== JSON.stringify([...currentSports].sort())
  const currentCourts: any[] = currentData?.courts || currentData?.place?.courts || []
  const proposedCourts: any[] = proposedData?.courts || []
  const courtsChanged = JSON.stringify(proposedCourts) !== JSON.stringify(currentCourts)
  const locationChanged =
    proposedData?.place?.latitude !== currentData?.place?.latitude ||
    proposedData?.place?.longitude !== currentData?.place?.longitude
  const nameChanged = proposedData?.place?.name !== currentData?.place?.name
  const placeTypeChanged = proposedData?.place?.place_type !== currentData?.place?.place_type
  const descriptionChanged = proposedData?.place?.description !== currentData?.place?.description
  const imageChanged = proposedData?.place?.image_url !== currentData?.place?.image_url
  const contactPhoneChanged = proposedData?.place?.contact_phone !== currentData?.place?.contact_phone
  const contactEmailChanged = proposedData?.place?.contact_email !== currentData?.place?.contact_email
  const contactWebsiteChanged = proposedData?.place?.contact_website !== currentData?.place?.contact_website
  const contactChanged = contactPhoneChanged || contactEmailChanged || contactWebsiteChanged

  const proposedPlaceAttrs: Record<string, boolean> = proposedData?.place_attributes ?? {}
  const currentPlaceAttrs: Record<string, boolean> = currentData?.place_attributes ?? {}
  const placeAttrsChanged = JSON.stringify(proposedPlaceAttrs) !== JSON.stringify(currentPlaceAttrs)
  const openingHoursChanged = JSON.stringify(proposedData?.place?.opening_hours ?? null)
    !== JSON.stringify(currentData?.place?.opening_hours ?? null)

  // Build proposed court attrs by sport from courts[i].attributes
  const proposedCourtAttrsBySport: Record<string, Record<string, boolean>> = {}
  for (const court of proposedCourts) {
    if (!court.attributes) continue
    const sport = court.sport
    if (!proposedCourtAttrsBySport[sport]) proposedCourtAttrsBySport[sport] = {}
    for (const [k, v] of Object.entries(court.attributes as Record<string, boolean>)) {
      if (v) proposedCourtAttrsBySport[sport][k] = true
    }
  }

  // Build current court attrs by sport from court_attrs_by_id keyed by court ID
  const currentCourtAttrsBySport: Record<string, Record<string, boolean>> = {}
  const currentCourtAttrsById: Record<string, Record<string, boolean>> = currentData?.court_attrs_by_id ?? {}
  for (const court of currentCourts) {
    const attrs = currentCourtAttrsById[court.id] ?? {}
    for (const [k, v] of Object.entries(attrs)) {
      if (v) {
        if (!currentCourtAttrsBySport[court.sport]) currentCourtAttrsBySport[court.sport] = {}
        currentCourtAttrsBySport[court.sport][k] = true
      }
    }
  }

  const courtAttrsChanged = JSON.stringify(proposedCourtAttrsBySport) !== JSON.stringify(currentCourtAttrsBySport)

  const attrsChanged = placeAttrsChanged || courtAttrsChanged

  const changeSummary: string[] = isImageAdd
    ? ['Neues Foto']
    : [
        nameChanged && 'Name',
        placeTypeChanged && 'Platzart',
        descriptionChanged && 'Description',
        imageChanged && 'Image',
        locationChanged && 'Location',
        changedAddressFields.length > 0 && 'Address',
        sportsChanged && 'Sports',
        courtsChanged && 'Courts',
        contactChanged && 'Kontakt',
        openingHoursChanged && 'Öffnungszeiten',
        attrsChanged && 'Ausstattung',
      ].filter(Boolean) as string[]

  // ── Map data ──
  const currentLat = currentData?.place?.latitude
  const currentLng = currentData?.place?.longitude
  const hasCurrentCoords = currentLat != null && currentLng != null
  const proposedLat = proposedData?.place?.latitude
  const proposedLng = proposedData?.place?.longitude

  const proposedLocation = locationChanged && proposedLat != null && proposedLng != null
    ? {
        latitude: Number(proposedLat),
        longitude: Number(proposedLng),
        distanceMeters: hasCurrentCoords
          ? haversineMeters(Number(currentLat), Number(currentLng), Number(proposedLat), Number(proposedLng))
          : undefined,
      }
    : undefined

  const thumbnail = isImageAdd
    ? (proposedData?.url ?? null)
    : (currentData?.place?.image_url || edit.places?.image_url)

  return (
    <Card className="mb-4 border-l-4 border-l-blue-400">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Thumbnail */}
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={edit.places?.name}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">
                  <Link href={`/places/${edit.place_id}`} target="_blank" className="hover:underline underline-offset-2">
                    {edit.places?.name || 'Unknown Place'}
                  </Link>
                </CardTitle>
                {isImageAdd ? (
                  <Badge className="text-xs bg-purple-100 text-purple-800">
                    <Camera className="h-3 w-3 mr-1" />
                    Neues Foto
                  </Badge>
                ) : (
                  <Badge className="text-xs bg-blue-100 text-blue-800">
                    <Edit className="h-3 w-3 mr-1" />
                    Community Edit
                  </Badge>
                )}
              </div>

              {/* Change summary badges */}
              {changeSummary.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {changeSummary.map(label => (
                    <Badge key={label} variant="outline" className="text-xs px-1.5 py-0">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {edit.profiles?.name || 'Unknown User'}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(edit.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(prev => !prev)}
            className="shrink-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1 text-xs hidden sm:inline">{isExpanded ? 'Collapse' : 'View Details'}</span>
          </Button>
        </div>
      </CardHeader>

      {isExpanded && isImageAdd && (
        <CardContent className="space-y-4 pt-0">
          <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Eingereichtes Foto</p>
            {proposedData?.url ? (
              <img
                src={proposedData.url}
                alt="Eingereicht"
                className="w-full max-h-72 object-contain rounded border bg-black/5"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Kein Bild verfügbar</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => onApprove(edit.id)} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Foto freigeben
            </Button>

            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex-1">
                  <XCircle className="h-4 w-4 mr-2" />
                  Ablehnen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Foto ablehnen</DialogTitle>
                  <DialogDescription>
                    Bitte gib einen Grund an. Das Bild wird aus dem Speicher gelöscht.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="image-rejection-reason">Ablehnungsgrund</Label>
                  <Textarea
                    id="image-rejection-reason"
                    placeholder="z.B. Kein Bezug zum Ort, ungeeignetes Bild..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!rejectionReason.trim()}
                  >
                    Ablehnen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      )}

      {isExpanded && !isImageAdd && (
        <CardContent className="space-y-4 pt-0">
          {/* Map */}
          {hasCurrentCoords ? (
            <AdminMiniMap
              latitude={Number(currentLat)}
              longitude={Number(currentLng)}
              placeName={edit.places?.name || ''}
              sports={currentSports}
              proposedLocation={proposedLocation}
              height="220px"
              className="w-full"
            />
          ) : (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              No coordinates — map unavailable
            </div>
          )}

          {/* Diff */}
          <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <span className="text-green-700">▲ Proposed</span>
              <span className="text-red-700">▼ Current</span>
            </div>

            {nameChanged && (
              <div>
                <p className="text-xs font-medium mb-1">Name</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">{proposedData?.place?.name || '—'}</div>
                  <div className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded">{currentData?.place?.name || '—'}</div>
                </div>
              </div>
            )}

            {placeTypeChanged && (
              <div>
                <p className="text-xs font-medium mb-1">Platzart</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                    {placeTypeIcons[proposedData?.place?.place_type as PlaceType] || ''} {placeTypeLabels[proposedData?.place?.place_type as PlaceType] || proposedData?.place?.place_type || '—'}
                  </div>
                  <div className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                    {placeTypeIcons[currentData?.place?.place_type as PlaceType] || ''} {placeTypeLabels[currentData?.place?.place_type as PlaceType] || currentData?.place?.place_type || '—'}
                  </div>
                </div>
              </div>
            )}

            {descriptionChanged && (
              <div>
                <p className="text-xs font-medium mb-1">Description</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded whitespace-pre-wrap">{proposedData?.place?.description || '—'}</div>
                  <div className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded whitespace-pre-wrap">{currentData?.place?.description || '—'}</div>
                </div>
              </div>
            )}

            {imageChanged && (
              <div>
                <p className="text-xs font-medium mb-1">Image</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    {proposedData?.place?.image_url
                      ? <img src={proposedData.place.image_url} alt="Proposed" className="w-full h-32 object-cover rounded border-2 border-green-400" />
                      : <div className="w-full h-32 bg-green-100 text-green-800 rounded flex items-center justify-center text-xs">No image</div>
                    }
                  </div>
                  <div>
                    {currentData?.place?.image_url
                      ? <img src={currentData.place.image_url} alt="Current" className="w-full h-32 object-cover rounded border-2 border-red-400" />
                      : <div className="w-full h-32 bg-red-100 text-red-800 rounded flex items-center justify-center text-xs">No image</div>
                    }
                  </div>
                </div>
              </div>
            )}

            {locationChanged && (
              <div>
                <p className="text-xs font-medium mb-1">
                  Location
                  {proposedLocation?.distanceMeters != null && (
                    <span className="ml-2 font-normal text-muted-foreground">({proposedLocation.distanceMeters}m moved)</span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                    {proposedLat != null ? `${Number(proposedLat).toFixed(6)}, ${Number(proposedLng).toFixed(6)}` : '—'}
                  </div>
                  <div className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                    {currentLat != null ? `${Number(currentLat).toFixed(6)}, ${Number(currentLng).toFixed(6)}` : '—'}
                  </div>
                </div>
              </div>
            )}

            {changedAddressFields.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Address</p>
                <div className="space-y-1">
                  {changedAddressFields.map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-2 gap-2 text-xs">
                      <div className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                        <span className="font-medium">{label}: </span>{proposedData?.place?.[key] || '—'}
                      </div>
                      <div className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                        <span className="font-medium">{label}: </span>{currentData?.place?.[key] || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sportsChanged && (
              <div>
                <p className="text-xs font-medium mb-1">Sports</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-wrap gap-1">
                    {proposedSports.length > 0
                      ? proposedSports.map((sport: string) => (
                          <Badge key={sport} className={`text-xs ${getSportBadgeClasses(sport)}`}>
                            {sportIcons[sport] || '📍'} {sportNames[sport] || sport}
                          </Badge>
                        ))
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentSports.length > 0
                      ? currentSports.map((sport: string) => (
                          <Badge key={sport} className={`text-xs ${getSportBadgeClasses(sport)}`}>
                            {sportIcons[sport] || '📍'} {sportNames[sport] || sport}
                          </Badge>
                        ))
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>
            )}

            {courtsChanged && (proposedCourts.length > 0 || currentCourts.length > 0) && (
              <div>
                <p className="text-xs font-medium mb-1">Courts</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    {proposedCourts.length > 0
                      ? proposedCourts.map((court: any, i: number) => (
                          <div key={i} className="text-xs bg-green-50 border border-green-200 rounded p-2">
                            <div className="font-medium">{sportNames[court.sport] || court.sport}</div>
                            <div>Qty: {court.quantity}{court.surface ? `, ${court.surface}` : ''}</div>
                            {court.notes && <div className="text-muted-foreground">{court.notes}</div>}
                          </div>
                        ))
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                  <div className="space-y-1">
                    {currentCourts.length > 0
                      ? currentCourts.map((court: any, i: number) => (
                          <div key={i} className="text-xs bg-red-50 border border-red-200 rounded p-2">
                            <div className="font-medium">{sportNames[court.sport] || court.sport}</div>
                            <div>Qty: {court.quantity}{court.surface ? `, ${court.surface}` : ''}</div>
                            {court.notes && <div className="text-muted-foreground">{court.notes}</div>}
                          </div>
                        ))
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

            {contactChanged && (
              <div>
                <p className="text-xs font-medium mb-1">Kontakt</p>
                {[
                  { label: 'Telefon', propKey: 'contact_phone', changed: contactPhoneChanged },
                  { label: 'E-Mail', propKey: 'contact_email', changed: contactEmailChanged },
                  { label: 'Website', propKey: 'contact_website', changed: contactWebsiteChanged },
                ].filter(f => f.changed).map(({ label, propKey }) => (
                  <div key={propKey} className="grid grid-cols-2 gap-2 text-xs mb-1">
                    <div className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                      <span className="font-medium">{label}: </span>{proposedData?.place?.[propKey] || '—'}
                    </div>
                    <div className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                      <span className="font-medium">{label}: </span>{currentData?.place?.[propKey] || '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {openingHoursChanged && (
              <div>
                <p className="text-xs font-medium mb-1">Öffnungszeiten</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Vorgeschlagen', hours: proposedData?.place?.opening_hours as OpeningHours | null, cls: 'bg-green-100 text-green-800' },
                    { label: 'Aktuell', hours: currentData?.place?.opening_hours as OpeningHours | null, cls: 'bg-red-100 text-red-800' },
                  ].map(({ label, hours, cls }) => (
                    <div key={label} className={`font-mono px-2 py-1 rounded ${cls}`}>
                      <p className="font-medium mb-0.5">{label}</p>
                      {hours
                        ? (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(key => {
                            const dayLabels: Record<string, string> = { monday: 'Mo', tuesday: 'Di', wednesday: 'Mi', thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So' }
                            const day = hours[key]
                            return (
                              <div key={key} className="flex gap-1.5">
                                <span className="opacity-70 w-5">{dayLabels[key]}</span>
                                {day && !day.closed && day.open && day.close
                                  ? <span>{day.open}–{day.close}</span>
                                  : <span className="opacity-50">Geschlossen</span>
                                }
                              </div>
                            )
                          })
                        : <span className="opacity-50">—</span>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {('place_attributes' in (proposedData ?? {}) || Object.keys(proposedCourtAttrsBySport).length > 0) && (
              <div>
                <p className="text-xs font-medium mb-1">Ausstattung</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Vorgeschlagen</p>
                    {/* Place-level */}
                    {Object.keys(proposedPlaceAttrs).length > 0 && (
                      <div className="mb-1">
                        <AttributeIconRow
                          activeKeys={ATTRIBUTE_DEFINITIONS.filter(d => d.scope === 'place' && proposedPlaceAttrs[d.key]).map(d => d.key)}
                          size="xs"
                        />
                      </div>
                    )}
                    {/* Court-level by sport */}
                    {Object.entries(proposedCourtAttrsBySport).map(([sport, attrs]) => {
                      const keys = ATTRIBUTE_DEFINITIONS.filter(d => d.scope === 'court' && attrs[d.key]).map(d => d.key)
                      if (keys.length === 0) return null
                      return (
                        <div key={sport} className="mb-1">
                          <span className="text-[10px] text-muted-foreground">{sportNames[sport] || sport}: </span>
                          <AttributeIconRow activeKeys={keys} size="xs" />
                        </div>
                      )
                    })}
                    {Object.keys(proposedPlaceAttrs).length === 0 && Object.keys(proposedCourtAttrsBySport).length === 0 && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Aktuell</p>
                    {Object.keys(currentPlaceAttrs).length > 0 && (
                      <div className="mb-1">
                        <AttributeIconRow
                          activeKeys={ATTRIBUTE_DEFINITIONS.filter(d => d.scope === 'place' && currentPlaceAttrs[d.key]).map(d => d.key)}
                          size="xs"
                        />
                      </div>
                    )}
                    {Object.entries(currentCourtAttrsBySport).map(([sport, attrs]) => {
                      const keys = ATTRIBUTE_DEFINITIONS.filter(d => d.scope === 'court' && attrs[d.key]).map(d => d.key)
                      if (keys.length === 0) return null
                      return (
                        <div key={sport} className="mb-1">
                          <span className="text-[10px] text-muted-foreground">{sportNames[sport] || sport}: </span>
                          <AttributeIconRow activeKeys={keys} size="xs" />
                        </div>
                      )
                    })}
                    {Object.keys(currentPlaceAttrs).length === 0 && Object.keys(currentCourtAttrsBySport).length === 0 && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => onApprove(edit.id)} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Changes
            </Button>

            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex-1">
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Community Edit</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this community contribution. This will help the contributor understand what needs to be improved.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="community-rejection-reason">Rejection Reason</Label>
                  <Textarea
                    id="community-rejection-reason"
                    placeholder="Enter reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
                    Reject Edit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

const REPORT_REASON_LABELS: Record<string, string> = {
  no_longer_exists: 'Platz existiert nicht mehr',
  other: 'Sonstiges',
}

function ReportedTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [deletingPlaceId, setDeletingPlaceId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [expandedPlaces, setExpandedPlaces] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) =>
    setExpandedPlaces(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const { data: reports, isLoading } = useQuery({
    queryKey: ['place-reports'],
    queryFn: database.reports.getOpenReports,
    refetchInterval: 15000,
  })

  const dismissAllMutation = useMutation({
    mutationFn: (placeId: string) => database.reports.dismissAllReportsForPlace(placeId),
    onSuccess: () => {
      toast({ title: 'Meldungen geschlossen' })
      queryClient.invalidateQueries({ queryKey: ['place-reports'] })
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] })
    },
    onError: () => {
      toast({ title: 'Fehler', variant: 'destructive' })
    },
  })

  const deletePlaceMutation = useMutation({
    mutationFn: (placeId: string) => database.reports.deleteReportedPlace(placeId),
    onSuccess: () => {
      toast({ title: 'Platz gelöscht', description: 'Der Platz wurde entfernt.' })
      queryClient.invalidateQueries({ queryKey: ['place-reports'] })
      queryClient.invalidateQueries({ queryKey: ['places'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] })
      setIsDeleteDialogOpen(false)
      setDeletingPlaceId(null)
    },
    onError: () => {
      toast({ title: 'Fehler beim Löschen', variant: 'destructive' })
    },
  })

  if (isLoading) {
    return <div className="text-center py-8">Loading reports...</div>
  }

  // Group reports by place_id
  const grouped = (reports || []).reduce((acc: Record<string, { place: any; reports: any[] }>, report: any) => {
    const placeId = report.places?.id
    if (!placeId) return acc
    if (!acc[placeId]) acc[placeId] = { place: report.places, reports: [] }
    acc[placeId].reports.push(report)
    return acc
  }, {})

  const groups = Object.values(grouped) as { place: any; reports: any[] }[]

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-600" />
            Gemeldete Plätze
          </CardTitle>
          <CardDescription>Plätze, die von Nutzern gemeldet wurden</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Keine offenen Meldungen.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Platz löschen</DialogTitle>
            <DialogDescription>
              Möchtest du diesen Platz wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Abbrechen</Button>
            <Button
              variant="destructive"
              disabled={deletePlaceMutation.isPending}
              onClick={() => deletingPlaceId && deletePlaceMutation.mutate(deletingPlaceId)}
            >
              {deletePlaceMutation.isPending ? 'Wird gelöscht...' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {groups.map(({ place, reports: placeReports }) => {
          const address = [
            place.street,
            place.district || place.city,
          ].filter(Boolean).join(', ')
          const isExpanded = expandedPlaces.has(place.id)
          const courts: any[] = (place as any).courts ?? []
          const openingHours = (place as any).opening_hours as OpeningHours | null
          const dayLabels: Record<string, string> = { monday: 'Mo', tuesday: 'Di', wednesday: 'Mi', thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So' }

          return (
            <Card key={place.id} className="border-l-4 border-l-red-400">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{place.name}</CardTitle>
                      <Badge className="bg-red-100 text-red-800 text-xs shrink-0">
                        {placeReports.length} {placeReports.length === 1 ? 'Meldung' : 'Meldungen'}
                      </Badge>
                      {(place as any).place_type && (
                        <Badge className={`text-xs ${getPlaceTypeBadgeClasses((place as any).place_type)}`}>
                          {placeTypeIcons[(place as any).place_type as PlaceType] || ''} {placeTypeLabels[(place as any).place_type as PlaceType] || (place as any).place_type}
                        </Badge>
                      )}
                    </div>
                    {address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {address}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/map?place=${place.id}`} target="_blank">
                        <Eye className="h-4 w-4 mr-1" />
                        Ansehen
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(place.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {placeReports.map((report: any) => (
                    <div key={report.id} className="text-sm bg-muted/50 rounded-lg px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{REPORT_REASON_LABELS[report.reason] || report.reason}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {report.comment && (
                        <p className="text-muted-foreground text-xs">{report.comment}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Collapsible place details */}
                {isExpanded && (
                  <div className="border-t pt-3 space-y-3">
                    {/* Image */}
                    {(place as any).image_url && (
                      <img
                        src={(place as any).image_url}
                        alt={place.name}
                        className="w-full h-36 object-cover rounded-lg"
                      />
                    )}

                    {/* Sports */}
                    {((place as any).sports?.length > 0) && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Sports</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {((place as any).sports as string[]).map((sport: string) => (
                            <Badge key={sport} className={`text-xs ${getSportBadgeClasses(sport)}`}>
                              {sportIcons[sport] || '📍'} {sportNames[sport] || sport}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Courts */}
                    {courts.length > 0 && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Courts</Label>
                        <div className="space-y-1 mt-1">
                          {courts.map((court: any) => (
                            <div key={court.id} className="text-xs bg-muted p-2 rounded">
                              <div className="flex justify-between">
                                <span className="font-medium">
                                  {court.sport === 'other' ? (court.custom_sport_name || 'Andere Sportart') : (sportNames[court.sport] || court.sport)}
                                </span>
                                <span>Qty: {court.quantity}</span>
                              </div>
                              {court.surface && <div className="text-muted-foreground">Surface: {court.surface}</div>}
                              {court.notes && <div className="text-muted-foreground">Notes: {court.notes}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {(place as any).description && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Beschreibung</Label>
                        <p className="text-sm mt-0.5">{(place as any).description}</p>
                      </div>
                    )}

                    {/* Full address */}
                    {((place as any).postcode || (place as any).county || (place as any).state || (place as any).country) && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Adresse</Label>
                        <div className="mt-1 text-sm space-y-0.5">
                          {((place as any).street || (place as any).house_number) && (
                            <div>{[(place as any).street, (place as any).house_number].filter(Boolean).join(' ')}</div>
                          )}
                          {((place as any).postcode || (place as any).city) && (
                            <div>{[(place as any).postcode, (place as any).city].filter(Boolean).join(' ')}</div>
                          )}
                          {(place as any).district && <div className="text-muted-foreground">{(place as any).district}</div>}
                          {(place as any).county && <div className="text-muted-foreground">{(place as any).county}</div>}
                          {(place as any).state && <div className="text-muted-foreground">{(place as any).state}</div>}
                          {(place as any).country && <div className="text-muted-foreground">{(place as any).country}</div>}
                        </div>
                      </div>
                    )}

                    {/* Contact */}
                    {((place as any).contact_phone || (place as any).contact_email || (place as any).contact_website) && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Kontakt</Label>
                        <div className="mt-1 text-sm space-y-0.5">
                          {(place as any).contact_phone && <div>{(place as any).contact_phone}</div>}
                          {(place as any).contact_email && <div>{(place as any).contact_email}</div>}
                          {(place as any).contact_website && <div className="text-muted-foreground truncate">{(place as any).contact_website}</div>}
                        </div>
                      </div>
                    )}

                    {/* Opening hours */}
                    {openingHours && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Öffnungszeiten</Label>
                        <div className="mt-1 text-sm space-y-0.5">
                          {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(key => {
                            const day = openingHours[key]
                            return (
                              <div key={key} className="flex gap-2">
                                <span className="text-muted-foreground w-6">{dayLabels[key]}</span>
                                {day && !day.closed && day.open && day.close
                                  ? <span>{day.open} – {day.close}</span>
                                  : <span className="text-muted-foreground">Geschlossen</span>
                                }
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={dismissAllMutation.isPending}
                    onClick={() => dismissAllMutation.mutate(place.id)}
                  >
                    Meldungen schließen
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setDeletingPlaceId(place.id)
                      setIsDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Platz löschen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}

const PAGE_SIZE = 250

function DataToolsTab({ isActive }: { isActive: boolean }) {
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isSavingAddresses, setIsSavingAddresses] = useState(false)
  const [isDeletingPlaces, setIsDeletingPlaces] = useState(false)
  const [geocodingPlace, setGeocodingPlace] = useState<string | null>(null)
  const [savingPlace, setSavingPlace] = useState<string | null>(null)
  const [deletingPlace, setDeletingPlace] = useState<string | null>(null)
  const [geocodingResults, setGeocodingResults] = useState<string | null>(null)
  const [enrichedPlaces, setEnrichedPlaces] = useState<PlaceWithCourts[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [missingAddressOnly, setMissingAddressOnly] = useState(false)
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  // Reset to page 0 whenever a filter changes
  const setFilter = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (value: T) => {
    setter(value)
    setPage(0)
    setSelectedPlaces(new Set())
  }

  const filters = {
    sources: selectedSources.size > 0 ? [...selectedSources] : undefined,
    addressStatus: missingAddressOnly ? 'coordinates-only' as const : 'all' as const,
    page,
    pageSize: PAGE_SIZE,
  }

  const { data: pagedResult, isLoading, isFetching, error } = useQuery({
    queryKey: ['data-tools-places', filters],
    queryFn: () => database.places.getPlacesAdminPaged(filters),
    enabled: isActive,
    placeholderData: (prev) => prev,
  })

  const { data: meta } = useQuery({
    queryKey: ['data-tools-meta'],
    queryFn: () => database.places.getPlacesAdminMeta(),
    enabled: isActive,
    staleTime: 60_000,
  })

  const totalCount = pagedResult?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Overlay locally enriched places on top of the current page data
  const displayPlaces: PlaceWithCourts[] = (pagedResult?.data ?? []).map(place =>
    enrichedPlaces.find(e => e.id === place.id) ?? place
  )

  const hasAddressData = (place: PlaceWithCourts) => {
    return !!(place.street || place.city || place.district || place.state || place.country || place.county || place.postcode)
  }

  const getSelectedPlacesData = () => displayPlaces.filter(place => selectedPlaces.has(place.id))

  const handleSelectAll = () => {
    if (selectedPlaces.size === displayPlaces.length) {
      setSelectedPlaces(new Set())
    } else {
      setSelectedPlaces(new Set(displayPlaces.map(place => place.id)))
    }
    setLastSelectedIndex(null)
  }

  const handleBulkGeocode = async () => {
    const selectedPlacesData = getSelectedPlacesData()
    if (selectedPlacesData.length === 0) return
    setIsGeocoding(true)
    setGeocodingResults(null)
    try {
      let successCount = 0
      let noAddressCount = 0
      let errorCount = 0
      for (let i = 0; i < selectedPlacesData.length; i++) {
        const place = selectedPlacesData[i]
        try {
          if (place.latitude == null || place.longitude == null) {
            noAddressCount++
            continue
          }
          const response = await fetch('/api/geocode/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: Number(place.latitude), longitude: Number(place.longitude), language: 'de' }),
          })
          if (response.ok) {
            const result = await response.json()
            const addressFields = {
              street: result.address.street || null,
              house_number: result.address.house_number || null,
              city: result.address.city || null,
              district: result.address.district || place.district || null,
              county: result.address.county || null,
              state: result.address.state || null,
              country: result.address.country || null,
              postcode: result.address.postcode || null,
            }
            const saveRes = await fetch('/api/admin/places/update-address', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ placeId: place.id, address: addressFields }),
            })
            if (!saveRes.ok) {
              errorCount++
            } else {
              setEnrichedPlaces(prev => {
                const enrichedPlace = { ...place, ...addressFields }
                const existing = prev.find(p => p.id === place.id)
                if (existing) return prev.map(p => p.id === place.id ? enrichedPlace : p)
                return [...prev, enrichedPlace]
              })
              successCount++
              setGeocodingResults(`🔄 Processing... ${i + 1}/${selectedPlacesData.length} (${successCount} saved)`)
            }
          } else if (response.status === 404) {
            noAddressCount++
          } else {
            errorCount++
          }
        } catch {
          errorCount++
        }
        if (i < selectedPlacesData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100))
        }
      }
      if (successCount > 0) {
        await queryClient.invalidateQueries({ queryKey: ['data-tools-places'] })
        await queryClient.invalidateQueries({ queryKey: ['data-tools-meta'] })
      }
      setGeocodingResults(`✅ Completed! ${successCount} saved${noAddressCount > 0 ? `, ${noAddressCount} no address found` : ''}${errorCount > 0 ? `, ${errorCount} errors` : ''}`)
    } catch (error) {
      setGeocodingResults(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleSaveAddresses = async () => {
    const selectedPlacesData = getSelectedPlacesData()
    if (selectedPlacesData.length === 0) return
    setIsSavingAddresses(true)
    setGeocodingResults(null)
    try {
      const placesToUpdate = selectedPlacesData.filter(place => hasAddressData(place))
      if (placesToUpdate.length === 0) {
        setGeocodingResults('❌ No enriched addresses to save')
        return
      }
      let successCount = 0
      let errorCount = 0
      const failedPlaces: string[] = []
      const succeededPlaces: string[] = []
      const BATCH_SIZE = 10
      const DELAY_MS = 300
      for (let batchStart = 0; batchStart < placesToUpdate.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, placesToUpdate.length)
        const currentBatch = placesToUpdate.slice(batchStart, batchEnd)
        const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(placesToUpdate.length / BATCH_SIZE)
        for (let i = 0; i < currentBatch.length; i++) {
          const place = currentBatch[i]
          const overallIndex = batchStart + i
          let retryCount = 0
          const maxRetries = 3
          let success = false
          while (!success && retryCount < maxRetries) {
            try {
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Database operation timeout after 30 seconds')), 30000)
              })
              const updateResult = await Promise.race([
                database.courts.updateCourt(place.id, {
                  street: place.street,
                  house_number: place.house_number,
                  city: place.city,
                  district: place.district,
                  county: place.county,
                  state: place.state,
                  country: place.country,
                  postcode: place.postcode,
                }),
                timeoutPromise
              ]) as any
              const { error } = updateResult
              if (error) {
                throw new Error(`Database error: ${error.message || JSON.stringify(error)}`)
              } else {
                successCount++
                succeededPlaces.push(place.id)
                success = true
              }
            } catch (error) {
              retryCount++
              if (retryCount >= maxRetries) {
                errorCount++
                failedPlaces.push(place.id)
              } else {
                await new Promise(resolve => setTimeout(resolve, 500 * retryCount))
              }
            }
          }
          setGeocodingResults(`💾 Saving batch ${batchNumber}/${totalBatches}... ${overallIndex + 1}/${placesToUpdate.length} (${successCount} successful, ${errorCount} failed)`)
          if (overallIndex < placesToUpdate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS))
          }
        }
      }
      if (successCount > 0) {
        await queryClient.invalidateQueries({ queryKey: ['data-tools-places'] })
        const successfullyUpdatedPlaces = placesToUpdate.filter(p => succeededPlaces.includes(p.id))
        setEnrichedPlaces(prev => prev.filter(p => !successfullyUpdatedPlaces.some(saved => saved.id === p.id)))
        setSelectedPlaces(prev => {
          const newSelected = new Set(prev)
          successfullyUpdatedPlaces.forEach(place => newSelected.delete(place.id))
          return newSelected
        })
      }
      setGeocodingResults(`✅ Addresses saved! ${successCount} places updated${errorCount > 0 ? `, ${errorCount} errors` : ''}`)
      if (failedPlaces.length > 0) console.error('Failed places:', failedPlaces)
    } catch (error) {
      setGeocodingResults(`❌ Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSavingAddresses(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedPlacesData = getSelectedPlacesData()
    if (selectedPlacesData.length === 0) return
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete ${selectedPlacesData.length} place${selectedPlacesData.length !== 1 ? 's' : ''} and all their associated courts?\n\nThis action cannot be undone!\n\nPlaces to delete:\n${selectedPlacesData.map(p => `• ${p.name}`).join('\n')}`
    )
    if (!confirmed) return
    setIsDeletingPlaces(true)
    setGeocodingResults(null)
    try {
      let successCount = 0
      let errorCount = 0
      const failedPlaces: string[] = []
      const succeededPlaces: string[] = []
      const BATCH_SIZE = 5
      const DELAY_MS = 500
      for (let batchStart = 0; batchStart < selectedPlacesData.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, selectedPlacesData.length)
        const currentBatch = selectedPlacesData.slice(batchStart, batchEnd)
        const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(selectedPlacesData.length / BATCH_SIZE)
        for (let i = 0; i < currentBatch.length; i++) {
          const place = currentBatch[i]
          const overallIndex = batchStart + i
          let retryCount = 0
          const maxRetries = 3
          let success = false
          while (!success && retryCount < maxRetries) {
            try {
              if (place.courts && place.courts.length > 0) {
                for (const court of place.courts) {
                  const courtDeleteResult = await database.courts.deleteCourt(court.id)
                  if (courtDeleteResult.error) throw new Error(`Failed to delete court ${court.id}: ${courtDeleteResult.error.message}`)
                }
              }
              const placeDeleteResult = await database.courts.deleteCourt(place.id)
              if (placeDeleteResult.error) throw new Error(`Failed to delete place: ${placeDeleteResult.error.message}`)
              successCount++
              succeededPlaces.push(place.id)
              success = true
            } catch (error) {
              retryCount++
              if (retryCount >= maxRetries) {
                errorCount++
                failedPlaces.push(place.id)
              } else {
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
              }
            }
          }
          setGeocodingResults(`🗑️ Deleting batch ${batchNumber}/${totalBatches}... ${overallIndex + 1}/${selectedPlacesData.length} (${successCount} deleted, ${errorCount} failed)`)
          if (overallIndex < selectedPlacesData.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS))
          }
        }
      }
      if (successCount > 0) {
        await queryClient.invalidateQueries({ queryKey: ['data-tools-places'] })
        setEnrichedPlaces(prev => prev.filter(p => !succeededPlaces.includes(p.id)))
        setSelectedPlaces(prev => {
          const newSelected = new Set(prev)
          succeededPlaces.forEach(placeId => newSelected.delete(placeId))
          return newSelected
        })
      }
      setGeocodingResults(`✅ Deletion complete! ${successCount} places deleted${errorCount > 0 ? `, ${errorCount} errors` : ''}`)
      if (failedPlaces.length > 0) console.error('Failed places:', failedPlaces)
    } catch (error) {
      setGeocodingResults(`❌ Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeletingPlaces(false)
    }
  }

  const handleSingleGeocode = async (place: PlaceWithCourts) => {
    setGeocodingPlace(place.id)
    setGeocodingResults(null)
    try {
      if (place.latitude == null || place.longitude == null) {
        setGeocodingResults(`❌ No coordinates for ${place.name}`)
        return
      }
      const response = await fetch('/api/geocode/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: Number(place.latitude), longitude: Number(place.longitude), language: 'de' }),
      })
      if (response.ok) {
        const result = await response.json()
        const addressFields = {
          street: result.address.street || null,
          house_number: result.address.house_number || null,
          city: result.address.city || null,
          district: result.address.district || place.district || null,
          county: result.address.county || null,
          state: result.address.state || null,
          country: result.address.country || null,
          postcode: result.address.postcode || null,
        }
        const saveRes = await fetch('/api/admin/places/update-address', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId: place.id, address: addressFields }),
        })
        if (!saveRes.ok) {
          const err = await saveRes.json().catch(() => ({}))
          setGeocodingResults(`❌ Failed to save address for ${place.name}: ${err.error ?? saveRes.status}`)
        } else {
          setEnrichedPlaces(prev => {
            const enrichedPlace = { ...place, ...addressFields }
            const existing = prev.find(p => p.id === place.id)
            if (existing) return prev.map(p => p.id === place.id ? enrichedPlace : p)
            return [...prev, enrichedPlace]
          })
          await queryClient.invalidateQueries({ queryKey: ['data-tools-places'] })
          setGeocodingResults(`✅ Address saved for ${place.name}`)
        }
      } else if (response.status === 404) {
        setGeocodingResults(`⚠️ No address found in OpenStreetMap for ${place.name} (coordinates may be in a park or field)`)
      } else {
        const err = await response.json().catch(() => ({}))
        setGeocodingResults(`❌ Geocoding failed for ${place.name}: ${err.error ?? response.status}`)
      }
    } catch (error) {
      setGeocodingResults(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeocodingPlace(null)
    }
  }

  const handleSingleSaveAddress = async (place: PlaceWithCourts) => {
    if (!hasAddressData(place)) return
    setSavingPlace(place.id)
    setGeocodingResults(null)
    try {
      const { error } = await database.courts.updateCourt(place.id, {
        street: place.street,
        house_number: place.house_number,
        city: place.city,
        district: place.district,
        county: place.county,
        state: place.state,
        country: place.country,
        postcode: place.postcode,
      })
      if (error) {
        setGeocodingResults(`❌ Failed to save address for ${place.name}`)
      } else {
        await queryClient.invalidateQueries({ queryKey: ['data-tools-places'] })
        setEnrichedPlaces(prev => prev.filter(p => p.id !== place.id))
        setGeocodingResults(`✅ Address saved for ${place.name}`)
      }
    } catch {
      setGeocodingResults(`❌ Error saving address for ${place.name}`)
    } finally {
      setSavingPlace(null)
    }
  }

  const handleSingleDelete = async (place: PlaceWithCourts) => {
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete "${place.name}" and all its associated courts?\n\nThis action cannot be undone!`
    )
    if (!confirmed) return
    setDeletingPlace(place.id)
    setGeocodingResults(null)
    try {
      if (place.courts && place.courts.length > 0) {
        for (const court of place.courts) {
          const courtDeleteResult = await database.courts.deleteCourt(court.id)
          if (courtDeleteResult.error) throw new Error(`Failed to delete court ${court.id}: ${courtDeleteResult.error.message}`)
        }
      }
      const placeDeleteResult = await database.courts.deleteCourt(place.id)
      if (placeDeleteResult.error) {
        setGeocodingResults(`❌ Failed to delete ${place.name}`)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['data-tools-places'] })
      setEnrichedPlaces(prev => prev.filter(p => p.id !== place.id))
      setSelectedPlaces(prev => {
        const newSelected = new Set(prev)
        newSelected.delete(place.id)
        return newSelected
      })
      setGeocodingResults(`✅ Successfully deleted ${place.name}`)
    } catch (error) {
      setGeocodingResults(`❌ Error deleting ${place.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingPlace(null)
    }
  }

  if (!isActive) return null
  if (isLoading && !pagedResult) return <div className="text-center py-8">Loading places...</div>
  if (error) return <div className="text-center py-8 text-red-500">Error loading places: {(error as Error).message}</div>

  return (
    <div className="space-y-4">

      <div className="space-y-4">
        {/* Row 1: Source chips + missing address switch */}
        <div className="flex flex-wrap items-center gap-2">
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(meta?.sources ?? []).map(({ name, count }) => {
            const active = selectedSources.has(name)
            return (
              <button
                key={name}
                onClick={() => {
                  setSelectedSources(prev => {
                    const next = new Set(prev)
                    if (next.has(name)) next.delete(name)
                    else next.add(name)
                    return next
                  })
                  setPage(0)
                  setSelectedPlaces(new Set())
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
                }`}
              >
                {name} <span className="opacity-70">({count})</span>
              </button>
            )
          })}
          {selectedSources.size > 0 && (
            <button
              onClick={() => { setSelectedSources(new Set()); setPage(0); setSelectedPlaces(new Set()) }}
              className="text-xs text-muted-foreground underline"
            >
              clear
            </button>
          )}
        </div>

        {/* Row 1b: Missing address switch */}
        <div className="flex items-center gap-2">
          <Switch
            id="missing-address"
            checked={missingAddressOnly}
            onCheckedChange={(val) => { setMissingAddressOnly(val); setPage(0); setSelectedPlaces(new Set()) }}
          />
          <label htmlFor="missing-address" className="text-sm cursor-pointer">
            📍 Missing Address{meta?.addressStats.coordinatesOnly != null ? ` (${meta.addressStats.coordinatesOnly})` : ''}
          </label>
        </div>

        {/* Row 3: Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectedPlaces.size === displayPlaces.length && displayPlaces.length > 0 ? 'Deselect All' : `Select All (${displayPlaces.length})`}
          </Button>
          {selectedPlaces.size > 0 && (
            <span className="text-sm text-muted-foreground">{selectedPlaces.size} selected</span>
          )}
          <div className="flex-1" />
          <Button
            onClick={handleBulkDelete}
            disabled={isDeletingPlaces || selectedPlaces.size === 0}
            variant="destructive"
            className="flex items-center gap-2"
          >
            {isDeletingPlaces ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting...</> : <><Trash2 className="h-4 w-4" />Delete Places ({selectedPlaces.size})</>}
          </Button>

          <Button
            onClick={handleBulkGeocode}
            disabled={isGeocoding || selectedPlaces.size === 0}
            className="flex items-center gap-2"
          >
            {isGeocoding ? <><Loader2 className="h-4 w-4 animate-spin" />Geocoding & Saving...</> : <><MapIcon className="h-4 w-4" />Geocode & Save ({selectedPlaces.size})</>}
          </Button>
        </div>
      </div>

      {geocodingResults && (
        <div className="p-3 rounded-md bg-muted">
          <p className="text-sm">{geocodingResults}</p>
        </div>
      )}

      {displayPlaces.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No places found</h3>
            <p className="text-muted-foreground">No places match the current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayPlaces.map((place: PlaceWithCourts, index: number) => {
            const availableSports = place.courts?.length > 0
              ? [...new Set(place.courts.map(court => court.sport))]
              : (place.sports || [])
            return (
              <Card key={place.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={(event) => {
                          if (event.shiftKey && lastSelectedIndex !== null) {
                            const start = Math.min(lastSelectedIndex, index)
                            const end = Math.max(lastSelectedIndex, index)
                            setSelectedPlaces(prev => {
                              const newSelected = new Set(prev)
                              for (let i = start; i <= end; i++) {
                                if (i < displayPlaces.length) newSelected.add(displayPlaces[i].id)
                              }
                              return newSelected
                            })
                          }
                        }}
                      >
                        <Checkbox
                          checked={selectedPlaces.has(place.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPlaces(prev => {
                              const newSelected = new Set(prev)
                              if (checked) newSelected.add(place.id)
                              else newSelected.delete(place.id)
                              return newSelected
                            })
                            setLastSelectedIndex(index)
                          }}
                        />
                      </div>
                      <span>{place.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleSingleDelete(place)}
                          disabled={deletingPlace === place.id}
                          variant="destructive"
                          className="h-7 px-2 text-xs"
                          title="Delete place and all courts"
                        >
                          {deletingPlace === place.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                        <Button
                          onClick={() => handleSingleGeocode(place)}
                          disabled={geocodingPlace === place.id}
                          variant="default"
                          className="h-7 px-2 text-xs"
                          title="Geocode & save address"
                        >
                          {geocodingPlace === place.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapIcon className="h-3 w-3" />}
                        </Button>
                      </div>
                      <Badge variant="outline">
                        {place.courts?.length || 0} court{(place.courts?.length || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    📍 {place.latitude}, {place.longitude}
                    {place.district && ` • ${place.district}`}
                    {place.neighborhood && ` • ${place.neighborhood}`}
                  </CardDescription>
                  {(place.street || place.city || place.country) && (
                    <CardDescription className="mt-1">
                      🏠 {[
                        place.house_number && place.street ? `${place.street} ${place.house_number}` : place.street,
                        place.city,
                        place.state,
                        place.country
                      ].filter(Boolean).join(', ')}
                      {place.postcode && ` (${place.postcode})`}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Available Sports:</h4>
                      <div className="flex flex-wrap gap-1">
                        {availableSports.length > 0 ? (
                          availableSports.map((sport) => (
                            <Badge key={sport} variant="secondary" className="text-xs">{sport}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No sports specified</span>
                        )}
                      </div>
                    </div>
                    {place.courts && place.courts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Court Details:</h4>
                        <div className="space-y-2">
                          {place.courts.map((court, i) => (
                            <div key={court.id} className="text-sm bg-muted/50 p-2 rounded">
                              <div className="font-medium">Court {i + 1}: {court.sport}</div>
                              <div className="text-muted-foreground">Quantity: {court.quantity}</div>
                              {court.surface && <div className="text-muted-foreground">Surface: {court.surface}</div>}
                              {court.notes && <div className="text-muted-foreground">Notes: {court.notes}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {place.description && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Description:</h4>
                        <p className="text-sm text-muted-foreground">{place.description}</p>
                      </div>
                    )}
                    {(place.street || place.city || place.district || place.country) && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Address Details:</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {place.street && <div>Street: {place.street}{place.house_number && ` ${place.house_number}`}</div>}
                          {place.city && <div>City: {place.city}</div>}
                          {place.district && <div>District: {place.district}</div>}
                          {place.county && <div>County: {place.county}</div>}
                          {place.state && <div>State: {place.state}</div>}
                          {place.country && <div>Country: {place.country}</div>}
                          {place.postcode && <div>Postal Code: {place.postcode}</div>}
                        </div>
                      </div>
                    )}
                    {place.image_url && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Court Image:</h4>
                        <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
                          <img
                            src={place.image_url}
                            alt={place.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-sm text-muted-foreground">❌ Image failed to load</div>'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <h4 className="text-sm font-medium mb-2">Metadata:</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div><span className="font-medium">ID:</span> {place.id}</div>
                        <div><span className="font-medium">Source:</span> {place.source || 'unknown'}</div>
                        {place.source_id && <div><span className="font-medium">Source ID:</span> {place.source_id}</div>}
                        <div><span className="font-medium">Created:</span> {new Date(place.created_at).toLocaleString()}</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Address Status:</span>
                          {(place.street && place.city) ? (
                            <Badge variant="default" className="text-xs">✅ Enriched</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">📍 Coordinates Only</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <details className="pt-2 border-t">
                      <summary className="text-sm font-medium cursor-pointer hover:text-primary">🔍 Raw JSON Data</summary>
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
                          {JSON.stringify(place, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm">Page {page + 1} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminPlacesPage() {
  const [activeTab, setActiveTab] = useState('pending')

  return (
    <div className="px-4 py-6" data-admin-places>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Place Moderation</h1>
        <p className="text-muted-foreground mt-2">
          Review and moderate user-submitted places and courts
        </p>
      </div>

      <ModerationStats />

      <Tabs defaultValue="pending" onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="data-tools">All</TabsTrigger>
          <TabsTrigger value="pending">Pending Places</TabsTrigger>
          <TabsTrigger value="community-edits">Community Edits</TabsTrigger>
          <TabsTrigger value="reported">Reported</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="w-full max-w-none">
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Pending Places
              </h2>
              <p className="text-sm text-muted-foreground">Places waiting for your review. These are not visible to users yet.</p>
            </div>
            <PlacesList status="pending" fullWidth />
          </div>
        </TabsContent>

        <TabsContent value="community-edits">
          <CommunityEditsTab />
        </TabsContent>

        <TabsContent value="reported">
          <ReportedTab />
        </TabsContent>


        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Rejected Places
              </CardTitle>
              <CardDescription>
                Places that were rejected and are not visible on the map.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlacesList status="rejected" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-tools">
          <DataToolsTab isActive={activeTab === 'data-tools'} />
        </TabsContent>

      </Tabs>
    </div>
  )
}

export default AdminPlacesPage