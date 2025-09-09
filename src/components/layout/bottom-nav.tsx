'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Map, User } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'

const navigation = [
  {
    name: 'Events',
    href: '/events',
    icon: Calendar,
    disabled: false
  },
  {
    name: 'Map',
    href: '/map',
    icon: Map,
    disabled: false
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
    disabled: false
  }
]

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault()
      window.location.href = '/auth/signin'
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 h-16">
      <div className="max-w-md md:max-w-2xl mx-auto grid grid-cols-3 h-full px-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          if (item.disabled) {
            return (
              <div
                key={item.name}
                className="flex flex-col items-center justify-center py-2 px-1 cursor-not-allowed opacity-50"
              >
                <Icon className="h-6 w-6 text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">
                  {item.name}
                </span>
              </div>
            )
          }

          // Special handling for Profile button
          if (item.name === 'Profile') {
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleProfileClick}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Icon className={`h-6 w-6 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                <span className={`text-xs mt-1 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                  {item.name}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className={`text-xs mt-1 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
      {/* Safe area padding for devices with home indicators */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  )
}