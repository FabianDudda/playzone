'use client'

import { House, Search, SlidersHorizontal } from 'lucide-react'

interface TopSearchBarProps {
  onMenuOpen: () => void
  onSearchOpen: () => void
  onFilterOpen: () => void
  hasActiveFilter: boolean
  activeFilterCount: number
}

export default function TopSearchBar({
  onMenuOpen,
  onSearchOpen,
  onFilterOpen,
  hasActiveFilter,
  activeFilterCount,
}: TopSearchBarProps) {
  return (
    <div
      className="fixed left-0 right-0 z-[1100] flex items-center gap-2 px-3 py-3 max-w-2xl mx-auto"
      style={{ top: 0, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
    >
      {/* Menu button */}
      <button
        onClick={onMenuOpen}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full glass-surface border border-black/[.06] dark:border-white/[.08] shadow-[0_2px_16px_rgba(0,0,0,0.14)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.30)] active:scale-95 transition-transform"
        aria-label="Menü"
      >
        <House className="h-[18px] w-[18px] text-foreground" />
      </button>

      {/* Search input (tappable placeholder — opens SearchSheet) */}
      <button
        onClick={onSearchOpen}
        className="relative flex flex-1 h-11 items-center gap-2.5 pl-3 pr-3 rounded-full glass-surface border border-black/[.06] dark:border-white/[.08] shadow-[0_2px_16px_rgba(0,0,0,0.14)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.30)] text-left active:opacity-70 transition-opacity"
        aria-label="Suche öffnen"
      >
        <Search className="h-[17px] w-[17px] text-muted-foreground shrink-0" />
        <span className="text-[15px] text-muted-foreground flex-1 truncate">Orte, Plätze, Events</span>
      </button>

      {/* Filter button */}
      <button
        onClick={onFilterOpen}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full glass-surface border border-black/[.06] dark:border-white/[.08] shadow-[0_2px_16px_rgba(0,0,0,0.14)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.30)] active:scale-95 transition-transform"
        aria-label="Filter"
      >
        <SlidersHorizontal className="h-[18px] w-[18px] text-foreground" />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  )
}
