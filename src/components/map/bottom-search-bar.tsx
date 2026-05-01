'use client'

import { Search, Plus, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'

interface BottomSearchBarProps {
  onSearchTap: () => void
  onAddTap: () => void
  onMenuTap: () => void
  filterActive?: boolean
  filterOpen?: boolean
  isAddOpen?: boolean
}

export default function BottomSearchBar({ onSearchTap, onAddTap, onMenuTap, filterActive = false, filterOpen = false, isAddOpen = false }: BottomSearchBarProps) {
  const { user, profile } = useAuth()

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
    >
      {filterActive && !filterOpen && (
        <div className="mb-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-xl border border-border/60 shadow-sm shadow-black/10 text-[11px] font-semibold uppercase tracking-wider text-primary">
          Gespeichert
        </div>
      )}

      <div className="flex w-[200px] h-[56px] items-center rounded-full bg-background/90 backdrop-blur-xl border border-border/60 shadow-lg shadow-black/10 overflow-visible">

        {/* Search */}
        <button
          onClick={onSearchTap}
          className="flex flex-1 h-full flex-col items-center justify-center gap-0.5 rounded-l-full active:bg-muted/50 transition-colors"
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

        {/* Add / Close toggle */}
        <button
          onClick={onAddTap}
          className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-transform"
          aria-label={isAddOpen ? 'Schließen' : 'Erstellen'}
        >
          <div className={cn('transition-transform duration-200', isAddOpen ? 'rotate-45' : 'rotate-0')}>
            {isAddOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </div>
        </button>

        {/* Profile / Menu */}
        <button
          onClick={onMenuTap}
          className="flex flex-1 h-full flex-col items-center justify-center gap-0.5 rounded-r-full active:bg-muted/50 transition-colors"
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
