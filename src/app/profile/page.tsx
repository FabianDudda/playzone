'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, Trophy, Calendar, Edit2, Plus, Shield, LogOut, ChevronRight, MessageSquare, Info, Bell, Instagram, BookOpen, Sparkles, Download, Handshake, Rss } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import Link from 'next/link'

const NAV_ITEMS = [
  { name: 'Profil bearbeiten', href: '/profile/edit', icon: Edit2, adminOnly: false },
  { name: 'Meine Beiträge', href: '/contributions', icon: Bell, adminOnly: false },
  { name: 'Rangliste', href: '/rankings', icon: Trophy, adminOnly: true },
  { name: 'Spiel hinzufügen', href: '/matches/new', icon: Plus, adminOnly: true },
  { name: 'Events', href: '/events', icon: Calendar, adminOnly: true },
  { name: 'Admin', href: '/admin/places', icon: Shield, adminOnly: true },
  { name: 'Meine Statistiken', href: '/profile/stats', icon: Trophy, adminOnly: true },
]

export default function ProfilePage() {
  const { user, profile, loading, isAdmin, signOut } = useAuth()
  const { canInstall, promptInstall } = useInstallPrompt()

  if (loading) {
    return (
      <div className="container px-4 py-4">
        <div className="max-w-xl mx-auto space-y-6">
          <Card><CardContent className="p-6"><div className="h-24 animate-pulse bg-muted rounded" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-20 animate-pulse bg-muted rounded" /></CardContent></Card>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="container px-4 py-4 max-w-xl mx-auto space-y-6">
        {/* Placeholder avatar */}
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Auth card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Anmelden für vollen Zugriff auf alle Funktionen</h2>
          
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link href="/auth/signin">Anmelden</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/signup">Registrieren</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Nav list */}
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col divide-y">
              {canInstall && (
                <button onClick={promptInstall} className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left w-full">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span>App installieren</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </button>
              )}
              <Link href="/blog" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <Rss className="h-4 w-4 text-muted-foreground" />
                <span>Blog</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/about" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span>Was ist OpenSportMap?</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/faq" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>Häufige Fragen</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/feedback" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>Feedback geben</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/partner" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <Handshake className="h-4 w-4 text-muted-foreground" />
                <span>Partner</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/impressum" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span>Impressum</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
            </div>
          </CardContent>
        </Card>
        <a href="https://www.instagram.com/opensportmap/" target="_blank" rel="noopener noreferrer" className="flex justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Instagram className="h-5 w-5" />
        </a>
        <Link href="/changelog" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">App Version 0.3.1-alpha</Link>
      </div>
    )
  }

  const visibleNavItems = NAV_ITEMS.filter(item => !(item.adminOnly && !isAdmin))

  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarImage src={profile.avatar || undefined} alt={profile.name} />
                <AvatarFallback className="text-xl">
                  {profile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-xl font-bold truncate">{profile.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate">{user.email}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Links */}
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col divide-y">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.name}</span>
                  {item.adminOnly
                    ? <span className="ml-auto text-xs text-muted-foreground">[admin]</span>
                    : <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  }
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* App Links */}
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col divide-y">
              {canInstall && (
                <button onClick={promptInstall} className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left w-full">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span>App installieren</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </button>
              )}
              <Link href="/blog" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <Rss className="h-4 w-4 text-muted-foreground" />
                <span>Blog</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/about" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span>Was ist OpenSportMap?</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/faq" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>Häufige Fragen</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/feedback" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>Feedback geben</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/partner" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <Handshake className="h-4 w-4 text-muted-foreground" />
                <span>Partner</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/impressum" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span>Impressum</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="p-0">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Abmelden</span>
            </button>
          </CardContent>
        </Card>
        <a href="https://www.instagram.com/opensportmapde/" target="_blank" rel="noopener noreferrer" className="flex justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Instagram className="h-5 w-5" />
        </a>
        <Link href="/changelog" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">App Version 0.3.1-alpha</Link>
      </div>
    </div>
  )
}
