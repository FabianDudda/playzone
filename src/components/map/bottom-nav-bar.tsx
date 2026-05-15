'use client'

import { ReactNode } from 'react'
import { House, Search, Heart, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavBarProps {
  onMenuOpen: () => void
  onSearchOpen: () => void
  onFavoritesOpen: () => void
  onAddOpen: () => void
  addOpen: boolean
}

export default function BottomNavBar({
  onMenuOpen,
  onSearchOpen,
  onFavoritesOpen,
  onAddOpen,
  addOpen,
}: BottomNavBarProps) {
  return (
    <div
      className="fixed left-0 right-0 z-[1100] bg-background border-t border-border shadow-[0_-2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_16px_rgba(0,0,0,0.20)]"
      style={{ bottom: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch max-w-2xl mx-auto">
        <NavItem icon={<House className="h-5 w-5" />} label="Home" onClick={onMenuOpen} />
        <NavItem icon={<Search className="h-5 w-5" />} label="Suche" onClick={onSearchOpen} />
        <NavItem icon={<Heart className="h-5 w-5" />} label="Favoriten" onClick={onFavoritesOpen} />
        <NavItem
          icon={
            <div className={cn('transition-transform duration-200', addOpen ? 'rotate-45' : 'rotate-0')}>
              <Plus className="h-5 w-5" />
            </div>
          }
          label="Erstellen"
          onClick={onAddOpen}
        />
      </div>
    </div>
  )
}

function NavItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-14 flex flex-col items-center justify-center gap-1 active:bg-muted transition-colors"
    >
      {icon}
      <span className="text-[10px] font-medium text-muted-foreground leading-none">{label}</span>
    </button>
  )
}
