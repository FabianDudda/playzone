'use client'

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { SportType } from '@/lib/supabase/types'
import { sportNames, sportIcons, CURATED_SPORTS, PlaceType, placeTypeLabels, placeTypeIcons, getPlaceTypeBadgeClasses } from '@/lib/utils/sport-utils'
import { cn } from '@/lib/utils'

const PLACE_TYPES: PlaceType[] = ['öffentlich', 'verein', 'schule']

interface FilterBottomSheetVaulProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  onExplicitClose: () => void
  selectedSports: SportType[]
  onSportsChange: (sports: SportType[]) => void
  selectedPlaceType: PlaceType | null
  onPlaceTypeChange: (type: PlaceType | null) => void
}

export default function FilterBottomSheetVaul({
  isOpen,
  onClose,
  onExplicitClose,
  selectedSports,
  onSportsChange,
  selectedPlaceType,
  onPlaceTypeChange,
}: FilterBottomSheetVaulProps) {
  const toggleSport = (sport: SportType) => {
    if (selectedSports.includes(sport)) {
      onSportsChange(selectedSports.filter(s => s !== sport))
    } else {
      onSportsChange([...selectedSports, sport])
    }
  }

  const hasActiveFilters = selectedSports.length > 0 || selectedPlaceType !== null

  return (
    <Drawer open={isOpen} onOpenChange={onClose} modal={false} shouldScaleBackground={false}>
      <DrawerContent
        hideOverlay
        className="h-auto max-w-2xl mx-auto"
      >
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-xl">Filter</DrawerTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={() => { onSportsChange([]); onPlaceTypeChange(null) }}>
                  Zurücksetzen
                </Button>
              )}
              <Button
                variant="secondary"
                size="icon"
                onClick={onExplicitClose}
                title="Schließen"
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 py-4 max-h-[80vh] overflow-y-auto space-y-4">
          {/* Place type filter */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Art des Ortes</p>
            <div className="grid grid-cols-3 gap-2">
              {PLACE_TYPES.map((type) => {
                const isSelected = selectedPlaceType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onPlaceTypeChange(isSelected ? null : type)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <span className="text-[20px] leading-none">{placeTypeIcons[type]}</span>
                    <span className="text-sm font-medium">{placeTypeLabels[type]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sport filter */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Sportart</p>
            <div className="grid grid-cols-3 gap-2">
              {CURATED_SPORTS.map((sport) => {
                const isSelected = selectedSports.includes(sport)
                const sportName = sportNames[sport] || sport
                const sportIcon = sportIcons[sport] || '📍'

                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => toggleSport(sport)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <span className="text-[20px] leading-none">{sportIcon}</span>
                    <span className="text-sm font-medium">{sportName}</span>
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
