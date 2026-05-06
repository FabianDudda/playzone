'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { database } from '@/lib/supabase/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { Edit, MapPin } from 'lucide-react'
import Link from 'next/link'
import BackButton from '@/components/layout/back-button'
import { sportNames, sportIcons } from '@/lib/utils/sport-utils'

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-800 text-xs shrink-0">Approved</Badge>
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 text-xs shrink-0">Rejected</Badge>
    default:
      return <Badge className="bg-orange-100 text-orange-800 text-xs shrink-0">Waiting for review</Badge>
  }
}

function PlaceRow({ name, address, sports, date, status, href, rejectionReason }: {
  name: string
  address?: string
  sports?: string[]
  date: string
  status: string
  href?: string
  rejectionReason?: string
}) {
  const Wrapper = href ? Link : 'div'
  const wrapperProps = href ? { href } : {}

  return (
    <div className="border-b last:border-0 py-4">
      <Wrapper {...(wrapperProps as any)} className="block">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{date}</p>
          <StatusBadge status={status} />
        </div>
        <span className="text-base font-semibold leading-tight">{name}</span>
        {address && <p className="text-base text-muted-foreground mt-0.5">{address}</p>}
        {sports && sports.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {sports.map((sport) => (
              <div
                key={sport}
                className="flex items-center gap-1.5 border border-border rounded-full px-3 py-1.5"
              >
                <span className="text-[16px] leading-none">{sportIcons[sport] || '📍'}</span>
                <span className="text-[14px] font-medium text-muted-foreground">{sportNames[sport] || sport}</span>
              </div>
            ))}
          </div>
        )}
      </Wrapper>
      {status === 'rejected' && rejectionReason && (
        <p className="text-sm mt-2"><span className="font-medium">Reason: </span>{rejectionReason}</p>
      )}
    </div>
  )
}

export default function MessagesPage() {
  const { user } = useAuth()

  const { data: contributions, isLoading } = useQuery({
    queryKey: ['user-contributions', user?.id],
    queryFn: () => database.community.getUserContributions(user!.id),
    enabled: !!user,
  })

  if (!user) {
    return (
      <div className="container px-4 py-4 overflow-x-hidden">
        <div className="max-w-xl mx-auto">
          <p className="text-muted-foreground">Sign in to see your messages.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">My Contributions</h1>
        </div>

        {isLoading && (
          <Card>
            <CardContent className="p-4">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        )}

        {!isLoading && contributions?.submittedPlaces.length === 0 && contributions?.submittedEdits.length === 0 && (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              No submissions yet. Places you add or edit will appear here.
            </CardContent>
          </Card>
        )}

        {/* Submitted Places */}
        {!isLoading && contributions && contributions.submittedPlaces.length > 0 && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Places submitted ({contributions.submittedPlaces.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-0 pb-0">
              {contributions.submittedPlaces.map((place: any) => {
                const address = [
                  place.street && place.house_number ? `${place.street} ${place.house_number}` : place.street,
                  place.postcode,
                  place.city,
                ].filter(Boolean).join(', ')
                return (
                  <PlaceRow
                    key={place.id}
                    name={place.name}
                    address={address}
                    sports={place.sports}
                    date={new Date(place.created_at).toLocaleDateString()}
                    status={place.moderation_status}
                    href={place.moderation_status === 'approved' ? `/map?place=${place.id}` : undefined}
                    rejectionReason={place.rejection_reason}
                  />
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Submitted Edits */}
        {!isLoading && contributions && contributions.submittedEdits.length > 0 && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edits submitted ({contributions.submittedEdits.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-0 pb-0">
              {contributions.submittedEdits.map((edit: any) => {
                const place = edit.places as any
                const address = [
                  place?.street && place?.house_number ? `${place.street} ${place.house_number}` : place?.street,
                  place?.postcode,
                  place?.city,
                ].filter(Boolean).join(', ')
                return (
                  <PlaceRow
                    key={edit.id}
                    name={place?.name || 'Unknown place'}
                    address={address}
                    sports={place?.sports}
                    date={new Date(edit.created_at).toLocaleDateString()}
                    status={edit.status}
                    href={edit.status === 'approved' ? `/map?place=${edit.place_id}` : undefined}
                    rejectionReason={edit.rejection_reason}
                  />
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
