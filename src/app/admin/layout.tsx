'use client'

import AdminGuard from '@/components/auth/admin-guard'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  MapPin, 
  Settings, 
  Users, 
  BarChart3, 
  Shield,
  ArrowLeft
} from 'lucide-react'

function AdminSidebar() {
  const pathname = usePathname()
  
  const adminMenuItems = [
    {
      label: 'Places',
      href: '/admin/places',
      icon: MapPin,
      description: 'Moderate user-submitted places'
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: Users,
      description: 'Manage user accounts'
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      description: 'View system analytics'
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      description: 'System configuration'
    }
  ]

  return (
    <div className="w-64 bg-muted/50 h-screen p-4 space-y-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5" />
          <h2 className="font-semibold">Admin Panel</h2>
        </div>
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Back to App
        </Link>
      </div>
      
      <nav className="space-y-2">
        {adminMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors group ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
            >
              <Icon className={`h-4 w-4 ${
                isActive 
                  ? 'text-primary-foreground' 
                  : 'text-muted-foreground group-hover:text-foreground'
              }`} />
              <div className="flex-1">
                <div className={`text-sm font-medium ${
                  isActive ? 'text-primary-foreground' : ''
                }`}>{item.label}</div>
                <div className={`text-xs ${
                  isActive 
                    ? 'text-primary-foreground/80' 
                    : 'text-muted-foreground'
                }`}>{item.description}</div>
              </div>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
    </AdminGuard>
  )
}