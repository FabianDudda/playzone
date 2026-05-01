'use client'

import Link from 'next/link'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { MapPin, Calendar, ChevronRight } from 'lucide-react'

interface AddActionSheetProps {
  isOpen: boolean
  onClose: () => void
  onCreatePlace: () => void
}

export default function AddActionSheet({ isOpen, onClose, onCreatePlace }: AddActionSheetProps) {
  return (
    <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()} modal={false} shouldScaleBackground={false}>
      <DrawerContent hideOverlay className="focus:outline-none" style={{ height: 'auto' }}>
        <VisuallyHidden><DrawerTitle>Erstellen</DrawerTitle></VisuallyHidden>

        <button
          onClick={() => { onClose(); onCreatePlace() }}
          className="w-full flex items-center gap-3 px-4 py-4 text-left border-b border-black/[.05] dark:border-white/[.06] active:bg-black/[.03] dark:active:bg-white/[.03] transition-colors"
        >
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold">Ort erstellen</div>
            <div className="text-[13px] text-muted-foreground">Neuen Sportplatz hinzufügen</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        </button>

        <Link
          href="/events/new"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-4 text-left active:bg-black/[.03] dark:active:bg-white/[.03] transition-colors"
        >
          <div className="h-11 w-11 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold">Event erstellen</div>
            <div className="text-[13px] text-muted-foreground">Veranstaltung organisieren</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        </Link>
      </DrawerContent>
    </Drawer>
  )
}
