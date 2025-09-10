'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Filter, X } from 'lucide-react'
import { SportType } from '@/lib/supabase/types'
import { sportNames, sportBadgeStyles, sportColors, sportIcons } from '@/lib/utils/sport-utils'
import { cn } from '@/lib/utils'

interface FilterBottomSheetProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  onExplicitClose: () => void
  selectedSport: SportType | 'all'
  onSportChange: (sport: SportType | 'all') => void
}

const SPORTS: (SportType | 'all')[] = [
  'all',
  'fußball', 
  'basketball', 
  'tischtennis', 
  'tennis', 
  'beachvolleyball', 
  'volleyball', 
  'skatepark', 
  'boule', 
  'hockey'
]

export default function FilterBottomSheet({
  isOpen,
  onClose,
  onExplicitClose,
  selectedSport,
  onSportChange
}: FilterBottomSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose} modal={false}>
      <SheetContent 
        side="bottom" 
        className="max-h-[80vh] overflow-y-auto max-w-2xl mx-auto rounded-t-xl"
        hideOverlay
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>
              Filter
            </SheetTitle>
            <button
              onClick={onExplicitClose}
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>
        
        <div className="space-y-6 py-6">
          {/* Sports Filter Section */}
          <div className="space-y-4">
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

