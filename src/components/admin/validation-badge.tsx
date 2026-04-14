'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react'
import {
  type ValidationResult,
  type ValidationCheckResult,
  computeOverallStatus,
} from '@/lib/validation/place-validation'
import type { PlaceWithCourts } from '@/lib/supabase/types'

interface ValidationBadgeProps {
  place: PlaceWithCourts
  initialResult?: ValidationResult
}

type Source = 'osm' | 'google'

export default function ValidationBadge({ place, initialResult }: ValidationBadgeProps) {
  const [osmResult, setOsmResult] = useState<ValidationCheckResult | null>(
    initialResult?.osm ?? null
  )
  const [googleResult, setGoogleResult] = useState<ValidationCheckResult | null>(
    initialResult?.google ?? null
  )
  const [isLoadingOsm, setIsLoadingOsm] = useState(false)
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Sync when a bulk-run result arrives from the parent
  useEffect(() => {
    if (!initialResult) return
    if (initialResult.osm.status !== 'unavailable' || initialResult.osm.error !== 'Not run') {
      setOsmResult(initialResult.osm)
    }
    if (initialResult.google.status !== 'unavailable' || initialResult.google.error !== 'Not run') {
      setGoogleResult(initialResult.google)
    }
    setIsExpanded(true)
  }, [initialResult])

  const runCheck = async (source: Source, e: React.MouseEvent) => {
    e.stopPropagation()
    if (source === 'osm') setIsLoadingOsm(true)
    else setIsLoadingGoogle(true)

    try {
      const res = await fetch(`/api/admin/places/validate?id=${place.id}&source=${source}`)
      if (res.ok) {
        const data: ValidationResult = await res.json()
        if (source === 'osm') setOsmResult(data.osm)
        else setGoogleResult(data.google)
        setIsExpanded(true)
      }
    } finally {
      if (source === 'osm') setIsLoadingOsm(false)
      else setIsLoadingGoogle(false)
    }
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(prev => !prev)
  }

  const hasAnyResult = osmResult !== null || googleResult !== null

  // Compute overall status from whatever has been run
  const overallStatus = hasAnyResult
    ? computeOverallStatus(
        osmResult ?? { source: 'osm', status: 'unavailable', matches: [] },
        googleResult ?? { source: 'google', status: 'unavailable', matches: [] }
      )
    : null

  const STATUS_CONFIG = {
    confirmed: {
      label: 'Sport confirmed',
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    },
    partial: {
      label: 'Other sports nearby',
      icon: <AlertCircle className="h-3 w-3" />,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
    },
    not_found: {
      label: 'Nothing found',
      icon: <HelpCircle className="h-3 w-3" />,
      className: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200',
    },
    unavailable: {
      label: 'API unavailable',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
    },
  } as const

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="flex items-center gap-1 flex-wrap">
        {/* OSM button */}
        <SourceButton
          label="OSM"
          isLoading={isLoadingOsm}
          result={osmResult}
          onClick={(e) => runCheck('osm', e)}
        />

        {/* Google button */}
        <SourceButton
          label="Google"
          isLoading={isLoadingGoogle}
          result={googleResult}
          onClick={(e) => runCheck('google', e)}
        />

        {/* Overall status badge + expand toggle — only shown once at least one check ran */}
        {overallStatus && (
          <Badge
            className={`text-xs gap-1 cursor-pointer select-none ${STATUS_CONFIG[overallStatus].className}`}
            onClick={toggleExpand}
          >
            {STATUS_CONFIG[overallStatus].icon}
            {STATUS_CONFIG[overallStatus].label}
            {isExpanded
              ? <ChevronUp className="h-3 w-3 ml-0.5" />
              : <ChevronDown className="h-3 w-3 ml-0.5" />
            }
          </Badge>
        )}
      </div>

      {isExpanded && hasAnyResult && (
        <div
          className="border rounded-lg p-2.5 bg-muted/30 space-y-2.5 text-xs w-72 max-w-xs"
          onClick={e => e.stopPropagation()}
        >
          {osmResult && <SourceResults result={osmResult} label="OpenStreetMap" onRerun={(e) => runCheck('osm', e)} isLoading={isLoadingOsm} />}
          {googleResult && (
            <div className={osmResult ? 'border-t pt-2.5' : ''}>
              <SourceResults result={googleResult} label="Google Maps" onRerun={(e) => runCheck('google', e)} isLoading={isLoadingGoogle} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SourceButton({
  label,
  isLoading,
  result,
  onClick,
}: {
  label: string
  isLoading: boolean
  result: ValidationCheckResult | null
  onClick: (e: React.MouseEvent) => void
}) {
  const hasRun = result !== null && !(result.status === 'unavailable' && result.error === 'Not run')

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-xs gap-1 cursor-wait select-none">
        <Loader2 className="h-3 w-3 animate-spin" />
        {label}…
      </Badge>
    )
  }

  if (!hasRun) {
    return (
      <Badge
        variant="outline"
        className="text-xs gap-1 cursor-pointer hover:bg-muted select-none"
        onClick={onClick}
      >
        <HelpCircle className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  // Already run — show a small re-run icon only
  return (
    <Badge
      variant="outline"
      className="text-xs gap-1 cursor-pointer hover:bg-muted select-none px-1.5"
      title={`Re-run ${label}`}
      onClick={onClick}
    >
      <RefreshCw className="h-3 w-3" />
      {label}
    </Badge>
  )
}

function SourceResults({
  result,
  label,
  onRerun,
  isLoading,
}: {
  result: ValidationCheckResult
  label: string
  onRerun: (e: React.MouseEvent) => void
  isLoading: boolean
}) {
  if (result.status === 'unavailable') {
    return (
      <div>
        <div className="font-semibold text-muted-foreground mb-1">{label}</div>
        <span className="text-muted-foreground italic">{result.error ?? 'Not configured'}</span>
      </div>
    )
  }

  if (result.status === 'error') {
    return (
      <div>
        <div className="font-semibold mb-1 flex items-center gap-1.5">
          {label}
          <button onClick={onRerun} disabled={isLoading} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
        <span className="text-red-600">Error: {result.error}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="font-semibold mb-1.5 flex items-center gap-1.5">
        {label}
        <span className="font-normal text-muted-foreground">
          — {result.matches.length === 0 ? 'nothing found within 200m' : `${result.matches.length} found`}
        </span>
        <button onClick={onRerun} disabled={isLoading} className="text-muted-foreground hover:text-foreground ml-auto">
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </button>
      </div>
      {result.matches.length > 0 && (
        <div className="space-y-1">
          {result.matches.map((m, i) => (
            <div
              key={i}
              className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs ${
                m.matchesDeclared
                  ? 'bg-green-50 text-green-900 border border-green-200'
                  : 'bg-gray-50 text-gray-700 border border-gray-100'
              }`}
            >
              <span className="truncate font-medium" title={m.name}>{m.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {m.sportTag && (
                  <span className="opacity-60 font-mono text-[10px]">{m.sportTag}</span>
                )}
                <span className="font-mono text-[10px] tabular-nums">{m.distance}m</span>
                {m.matchesDeclared
                  ? <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                  : <span className="text-gray-400 shrink-0">~</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
