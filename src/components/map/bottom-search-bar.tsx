'use client'

import { Search, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'

interface BottomSearchBarProps {
  onSearchTap: () => void
  onAddTap: () => void
  onMenuTap: () => void
  filterActive?: boolean
  filterOpen?: boolean
}

export default function BottomSearchBar({ onSearchTap, onAddTap, onMenuTap, filterActive = false, filterOpen = false }: BottomSearchBarProps) {
  const { user, profile } = useAuth()

  return (
    <div
      className="fixed left-3 right-3 z-[200] flex flex-col"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      {filterActive && !filterOpen && (
        <div className="mb-2 self-start px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-xl border border-border/60 shadow-sm shadow-black/10 text-[11px] font-semibold uppercase tracking-wider text-primary">
          Gespeichert
        </div>
      )}
      <div className="flex h-[56px] rounded-[18px] bg-background/90 backdrop-blur-xl border border-border/60 shadow-lg shadow-black/10 overflow-hidden">

        {/* Search */}
        <button
          onClick={onSearchTap}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 active:bg-muted/50 transition-colors"
          aria-label="Suche öffnen"
        >
          <div className="relative">
            <Search className={cn('h-5 w-5', filterActive ? 'text-primary' : 'text-foreground')} />
            {filterActive && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary border-2 border-background" />
            )}
          </div>
          <span className={cn('text-[10px] font-medium leading-none', filterActive ? 'text-primary' : 'text-muted-foreground')}>
            Suchen
          </span>
        </button>

        <div className="w-px h-8 self-center bg-border/60 shrink-0" />

        {/* Add place */}
        <button
          onClick={onAddTap}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 active:bg-muted/50 transition-colors"
          aria-label="Ort hinzufügen"
        >
          <Plus className="h-5 w-5 text-foreground" />
          <span className="text-[10px] font-medium leading-none text-muted-foreground">Hinzufügen</span>
        </button>

        <div className="w-px h-8 self-center bg-border/60 shrink-0" />

        {/* Profile */}
        <button
          onClick={onMenuTap}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 active:bg-muted/50 transition-colors"
          aria-label="Menü öffnen"
        >
          {profile?.avatar ? (
            <img src={profile.avatar} alt={profile.name ?? ''} className="h-6 w-6 rounded-full object-cover" />
          ) : user && profile?.name ? (
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold select-none">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <User className="h-5 w-5 text-foreground" />
          )}
          <span className="text-[10px] font-medium leading-none text-muted-foreground">Profil</span>
        </button>

      </div>
    </div>
  )
}
