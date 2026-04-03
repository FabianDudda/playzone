'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Map, Plus, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleAddClick = () => {
    const stored = sessionStorage.getItem('map-position')
    if (stored) {
      const { lat, lng, zoom } = JSON.parse(stored)
      router.push(`/new?lat=${lat}&lng=${lng}&zoom=${zoom}`)
    } else {
      router.push('/new')
    }
  }

  const addActive = pathname === '/new'

  if (pathname.startsWith('/widget')) return null

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <div className="flex h-16 items-center justify-around px-4 max-w-2xl mx-auto w-full">
          <Link
            href="/"
            className={`flex flex-1 flex-col items-center gap-1 text-xs font-medium transition-colors ${
              pathname === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="h-5 w-5" />
            <span>Karte</span>
          </Link>

          <button
            onClick={handleAddClick}
            className={`flex flex-1 flex-col items-center gap-1 text-xs font-medium transition-colors ${
              addActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="h-5 w-5" />
            <span>Hinzufügen</span>
          </button>

          <Link
            href="/profile"
            className={`flex flex-1 flex-col items-center gap-1 text-xs font-medium transition-colors ${
              pathname === '/profile' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-5 w-5" />
            <span>Profil</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
