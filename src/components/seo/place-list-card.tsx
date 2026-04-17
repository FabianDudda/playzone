import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { sportIcons, sportNames, getPlaceTypeBadgeClasses, placeTypeIcons, placeTypeLabels } from '@/lib/utils/sport-utils'
import { PlaceType } from '@/lib/utils/sport-utils'
import { PlaceListing } from '@/lib/supabase/seo-queries'
import { rowsToAttributeMap, getActiveAttributeKeys } from '@/lib/attributes/definitions'
import { AttributeBadge } from '@/components/attributes/attribute-icons'

interface PlaceListCardProps {
  place: PlaceListing
  primarySport?: string
}

export default function PlaceListCard({ place, primarySport }: PlaceListCardProps) {
  const sports = (place.sports ?? []).filter(s => s !== 'other')

  const addressLine = [
    place.street && place.house_number
      ? `${place.street} ${place.house_number}`
      : place.street,
    place.district ?? place.city,
  ]
    .filter(Boolean)
    .join(', ')

  const attrActiveKeys = getActiveAttributeKeys(
    rowsToAttributeMap(place.place_attributes ?? [])
  ).slice(0, 3)

  return (
    <Link
      href={`/places/${place.id}`}
      className="flex gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {place.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.image_url}
            alt={place.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-2xl">
            {sportIcons[primarySport ?? sports[0]] ?? '📍'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium text-sm leading-tight truncate">{place.name}</p>

        {/* Sport pills */}
        {sports.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sports.slice(0, 3).map(sport => (
              <span key={sport} className="text-xs text-muted-foreground flex items-center gap-0.5">
                {sportIcons[sport] ?? ''} {sportNames[sport] ?? sport}
              </span>
            ))}
            {sports.length > 3 && (
              <span className="text-xs text-muted-foreground">+{sports.length - 3}</span>
            )}
          </div>
        )}

        {/* Address */}
        {addressLine && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {addressLine}
          </p>
        )}

        {/* Place type + features */}
        <div className="flex flex-wrap items-center gap-1">
          {place.place_type && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 ${getPlaceTypeBadgeClasses(place.place_type)}`}
            >
              {placeTypeIcons[place.place_type as PlaceType] ?? ''}{' '}
              {placeTypeLabels[place.place_type as PlaceType] ?? place.place_type}
            </Badge>
          )}
          {attrActiveKeys.map(k => (
            <AttributeBadge key={k} attributeKey={k} size="xs" showLabel />
          ))}
        </div>
      </div>
    </Link>
  )
}
