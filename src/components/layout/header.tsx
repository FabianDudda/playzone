'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { MapPin, Trophy, Plus, User, LogOut, Menu, TestTube } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'

export default function Header() {
  const { user, profile, signOut, loading } = useAuth()

  const navigation = [
    { name: 'Map', href: '/map', icon: MapPin },
    { name: 'Rankings', href: '/rankings', icon: Trophy },
    { name: 'Add Match', href: '/matches/new', icon: Plus },
    { name: 'Test', href: '/test', icon: TestTube },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Sign Out', href: '#', icon: LogOut, action: 'signOut' },
  ]


  const MobileNav = () => {
    const [open, setOpen] = useState(false)
    
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="pr-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation menu for Court Sports
          </SheetDescription>
          <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
            <span className="font-bold">Court Sports</span>
          </Link>
          <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
            <div className="flex flex-col space-y-3">
              {navigation.map((item) => {
                if ((item.name === 'Profile' || item.name === 'Sign Out') && !user) return null
                
                if (item.action === 'signOut') {
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        signOut()
                        setOpen(false)
                      }}
                      className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary text-left"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </button>
                  )
                }
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"
                    onClick={() => setOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  if (loading) {
    return (
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold inline-block">Court Sports</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold inline-block">Court Sports</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            {navigation.map((item) => {
              if ((item.name === 'Profile' || item.name === 'Sign Out') && !user) return null
              
              if (item.action === 'signOut') {
                return (
                  <button
                    key={item.name}
                    onClick={signOut}
                    className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </button>
                )
              }
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <MobileNav />
          {!user && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}