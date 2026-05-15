'use client'

import { useEffect, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { Area } from '@/lib/supabase/types'

interface AreaBannerProps {
  area: Area
}

export default function AreaBanner({ area }: AreaBannerProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="pointer-events-auto absolute left-1/2 top-4 z-[1100] -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-2 rounded-xl bg-background border border-border px-4 py-2.5 shadow-sm max-w-[280px]">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{area.name}</p>
          {area.description && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{area.description}</p>
          )}
        </div>
        <button
          onClick={() => setVisible(false)}
          className="ml-1 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
