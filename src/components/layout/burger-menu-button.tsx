'use client'

import { Menu } from 'lucide-react'

interface BurgerMenuButtonProps {
  onTap: () => void
}

export default function BurgerMenuButton({ onTap }: BurgerMenuButtonProps) {
  return (
    <button
      onClick={onTap}
      className="fixed right-3 z-[200] flex items-center justify-center h-11 w-11 rounded-xl bg-background/90 backdrop-blur-xl border border-border/60 shadow-md shadow-black/10 active:scale-95 transition-transform"
      style={{ top: 'calc(12px + env(safe-area-inset-top, 0px))' }}
      aria-label="Menü öffnen"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}
