'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Filter } from 'lucide-react'
import { SportType } from '@/lib/supabase/types'
import { sportNames, sportBadgeStyles, sportColors, sportIcons } from '@/lib/utils/sport-utils'
import { cn } from '@/lib/utils'

interface FilterBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedSport: SportType | 'all'
  onSportChange: (sport: SportType | 'all') => void
}

const SPORTS: (SportType | 'all')[] = [
  'all',
  'fußball', 
  'basketball', 
  'tischtennis', 
  'volleyball', 
  'beachvolleyball', 
  'spikeball', 
  'boule', 
  'skatepark'
]

export default function FilterBottomSheet({
  isOpen,
  onClose,
  selectedSport,
  onSportChange
}: FilterBottomSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="max-h-[80vh] overflow-y-auto" 
        hideOverlay
        onInteractOutside={() => {
          // Allow all outside interactions for filter sheet
          // This enables map pan/zoom while filter is open
        }}
      >
        <SheetHeader>
          <SheetTitle>
            Filter
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 py-6">
          {/* Sports Filter Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sportarten</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SPORTS.map((sport) => {
                const isSelected = selectedSport === sport
                const sportName = sport === 'all' ? 'Alle Sportarten' : sportNames[sport] || sport
                const sportIcon = sport === 'all' ? '🏟️' : sportIcons[sport] || '📍'
                
                return (
                  <Button
                    key={sport}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSportChange(sport)}
                    className={cn(
                      "h-10 px-3 flex items-center gap-3 justify-start relative",
                      isSelected && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 absolute top-1 right-1 text-primary" />
                    )}
                    
                    {/* Sport Icon */}
                    <span className="text-lg">{sportIcon}</span>
                    
                    <span className="text-sm font-medium">
                      {sportName}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}

