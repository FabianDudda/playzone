'use client'

import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { ChevronLeft, X, RotateCcw } from 'lucide-react'
import { SportType } from '@/lib/supabase/types'
import {
  sportNames, sportIcons, SPORT_ORDER,
  PlaceType, placeTypeLabels, placeTypeIcons,
} from '@/lib/utils/sport-utils'
import { cn } from '@/lib/utils'

const PLACE_TYPES: PlaceType[] = ['öffentlich', 'verein', 'schule']

interface FilterSheetProps {
  open: boolean
  onBack: () => void
  onClose: () => void
  selectedSports: SportType[]
  onSportsChange: (sports: SportType[]) => void
  selectedPlaceType: PlaceType[]
  onPlaceTypeChange: (types: PlaceType[]) => void
  showOrte: boolean
  showEvents: boolean
  onToggleContentType: (type: 'orte' | 'events') => void
  onReset: () => void
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-4 pb-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export default function FilterSheet({
  open,
  onBack,
  onClose,
  selectedSports,
  onSportsChange,
  selectedPlaceType,
  onPlaceTypeChange,
  showOrte,
  showEvents,
  onToggleContentType,
  onReset,
}: FilterSheetProps) {
  const hasActive = selectedSports.length > 0 || selectedPlaceType.length > 0 || !showOrte || !showEvents

  const toggleSport = (sport: SportType) => {
    onSportsChange(
      selectedSports.includes(sport)
        ? selectedSports.filter(s => s !== sport)
        : [...selectedSports, sport]
    )
  }

  const togglePlaceType = (type: PlaceType) => {
    onPlaceTypeChange(
      selectedPlaceType.includes(type)
        ? selectedPlaceType.filter(t => t !== type)
        : [...selectedPlaceType, type]
    )
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onBack()} modal={false} shouldScaleBackground={false}>
      <DrawerContent hideOverlay className="h-[92dvh] flex flex-col focus:outline-none">
        <VisuallyHidden><DrawerTitle>Filter</DrawerTitle></VisuallyHidden>
        {/* Header — identical to favorites sheet */}
        <div className="grid grid-cols-3 items-center px-4 pt-2 pb-3 shrink-0">
          <div>
            <button
              onClick={onBack}
              className="h-8 w-8 rounded-full bg-black/[.06] dark:bg-white/[.08] flex items-center justify-center active:bg-black/[.12] dark:active:bg-white/[.14] transition-colors"
              aria-label="Zurück"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
          </div>
          <span className="text-[17px] font-bold text-center">Filter</span>
          <div className="flex items-center justify-end gap-2">
            {hasActive && (
              <button
                onClick={onReset}
                className="h-8 w-8 rounded-full bg-black/[.06] dark:bg-white/[.08] flex items-center justify-center active:bg-black/[.12] dark:active:bg-white/[.14] transition-colors"
                aria-label="Zurücksetzen"
              >
                <RotateCcw className="h-4 w-4 text-foreground" />
              </button>
            )}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-black/[.06] dark:bg-white/[.08] flex items-center justify-center active:bg-black/[.12] dark:active:bg-white/[.14] transition-colors"
              aria-label="Schließen"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pb-8 flex flex-col gap-4">

          {/* Art des Ortes */}
          <div>
            <SectionLabel label="Art des Ortes" />
            <div className="px-4 flex gap-2">
              {PLACE_TYPES.map(type => {
                const active = selectedPlaceType.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => togglePlaceType(type)}
                    className={cn(
                      'flex-1 h-9 flex items-center justify-center gap-1.5 rounded-[10px] border text-[13px] font-medium transition-all',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-black/[.1] dark:border-white/[.12] bg-transparent text-foreground'
                    )}
                  >
                    <span>{placeTypeIcons[type]}</span>
                    {placeTypeLabels[type]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sportart */}
          <div>
            <SectionLabel label="Sportart" />
            <div className="px-4 grid grid-cols-4 gap-2">
              {SPORT_ORDER.map(sport => {
                const active = selectedSports.includes(sport as SportType)
                return (
                  <button
                    key={sport}
                    onClick={() => toggleSport(sport as SportType)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 h-16 rounded-xl border transition-all',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-black/[.05] dark:border-white/[.06] bg-black/[.025] dark:bg-white/[.04] text-foreground'
                    )}
                  >
                    <span className="text-[22px] leading-none">{sportIcons[sport] || '📍'}</span>
                    <span className="text-[11px] font-medium leading-tight px-1 truncate w-full text-center">
                      {sportNames[sport] || sport}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Inhalte */}
          <div>
            <SectionLabel label="Inhalte" />
            <div className="px-4 flex gap-2">
              {(['orte', 'events'] as const).map(type => {
                const active = type === 'orte' ? showOrte : showEvents
                return (
                  <button
                    key={type}
                    onClick={() => onToggleContentType(type)}
                    className={cn(
                      'flex-1 h-9 rounded-[10px] border text-[13px] font-medium transition-all',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-black/[.1] dark:border-white/[.12] bg-transparent text-muted-foreground'
                    )}
                  >
                    {type === 'orte' ? 'Orte' : 'Events'}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

      </DrawerContent>
    </Drawer>
  )
}
