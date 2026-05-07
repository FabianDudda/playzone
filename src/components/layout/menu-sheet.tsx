'use client'

import { type ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useAuth } from '@/components/providers/auth-provider'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import {
  User, Shield, MapPin, Calendar, BookOpen, HelpCircle, Sparkles,
  Handshake, MessageSquare, LogIn, LogOut, Edit2, Bell,
  Download, ChevronRight, Rss, Sun, Moon, X, Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MenuSheetProps {
  open: boolean
  onClose: () => void
  onOpenFavorites?: () => void
}

function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      {label && (
        <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
          {label}
        </div>
      )}
      <div className="rounded-[14px] bg-muted/40 overflow-hidden divide-y divide-border/50">
        {children}
      </div>
    </div>
  )
}

function Row({
  icon, label, sub, danger, onClick, href,
}: {
  icon: ReactNode
  label: string
  sub?: string
  danger?: boolean
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <div className={`flex items-center gap-3 px-3.5 py-[13px] w-full text-left ${danger ? 'text-destructive' : ''}`}>
      <div className={`w-[22px] flex justify-center shrink-0 ${danger ? 'text-destructive' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="flex-1 text-[15px] font-medium">{label}</div>
      {sub && <div className="text-[13px] text-muted-foreground">{sub}</div>}
      {!danger && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
    </div>
  )

  if (href) {
    return <Link href={href} onClick={onClick} className="block">{inner}</Link>
  }
  return <button onClick={onClick} className="w-full text-left">{inner}</button>
}

export default function MenuSheet({ open, onClose, onOpenFavorites }: MenuSheetProps) {
  const { user, profile, isAdmin, signOut } = useAuth()
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt()
  const isGuest = !user

  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('debug-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored ? stored === 'dark' : prefersDark
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])
  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('debug-theme', next ? 'dark' : 'light')
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} modal={false} snapPoints={[1]} activeSnapPoint={1}>
      <DrawerContent hideOverlay className="h-[100dvh] flex flex-col focus:outline-none max-w-2xl mx-auto">
        <VisuallyHidden><DrawerTitle>Menü</DrawerTitle></VisuallyHidden>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-2 pb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isGuest ? (
              <>
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-[17px] font-bold">OpenSportMap</div>
                  <div className="text-[13px] text-muted-foreground">Nicht angemeldet</div>
                </div>
              </>
            ) : (
              <>
                <div className="h-11 w-11 rounded-full bg-primary flex items-center justify-center shrink-0 text-primary-foreground font-bold text-base select-none">
                  {profile?.name?.charAt(0).toUpperCase() ?? <User className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[16px] font-bold">
                    <span className="truncate">{profile?.name}</span>
                    {isAdmin && (
                      <span className="shrink-0 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-muted-foreground truncate">{user?.email}</div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {!isGuest && (
              <Button
                variant="glass-secondary"
                size="icon"
                className="rounded-full h-9 w-9"
                asChild
              >
                <a href="/profile/edit" onClick={onClose} aria-label="Profil bearbeiten">
                  <Edit2 className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button
              variant="glass-secondary"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={onClose}
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {/* Guest sign-in CTAs */}
          {isGuest && (
            <div className="flex gap-2 mb-4">
              <Link
                href="/auth/signin"
                onClick={onClose}
                className="flex-1 h-11 bg-primary text-primary-foreground rounded-xl text-[15px] font-semibold flex items-center justify-center gap-1.5"
              >
                <LogIn className="h-4 w-4" />
                Anmelden
              </Link>
              <Link
                href="/auth/signup"
                onClick={onClose}
                className="flex-1 h-11 bg-muted text-foreground rounded-xl text-[15px] font-semibold flex items-center justify-center"
              >
                Registrieren
              </Link>
            </div>
          )}

          {/* KONTO — logged-in only */}
          {!isGuest && (
            <Section label="Konto">
              <Row icon={<Bell className="h-[17px] w-[17px]" />} label="Meine Beiträge" href="/contributions" onClick={onClose} />
              <Row icon={<Calendar className="h-[17px] w-[17px]" />} label="Meine Events" href="/events/mine" onClick={onClose} />
              {isAdmin && (
                <Row
                  icon={isDark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
                  label="Erscheinungsbild"
                  sub="Admin"
                  onClick={toggleTheme}
                />
              )}
              {isAdmin && (
                <Row
                  icon={<Shield className="h-[17px] w-[17px] text-amber-600" />}
                  label="Admin Dashboard"
                  sub="Admin"
                  href="/admin/places"
                  onClick={onClose}
                />
              )}
            </Section>
          )}

          {/* ENTDECKEN — identical for all users */}
          <Section label="Entdecken">
            <Row icon={<Calendar className="h-[17px] w-[17px]" />} label="Events" href="/events" onClick={onClose} />
            <Row icon={<MapPin className="h-[17px] w-[17px]" />} label="Orte" href="/orte" onClick={onClose} />
            {onOpenFavorites && (
              <Row icon={<Heart className="h-[17px] w-[17px]" />} label="Gespeicherte Orte" onClick={() => { onOpenFavorites(); onClose() }} />
            )}
            <Row icon={<Rss className="h-[17px] w-[17px]" />} label="Blog" href="/blog" onClick={onClose} />
          </Section>

          {/* APP — identical for all users */}
          <Section label="App">
            {!isStandalone && (canInstall || isIOS) && (
              <Row
                icon={<Download className="h-[17px] w-[17px]" />}
                label="App installieren"
                sub="PWA"
                onClick={canInstall ? () => { promptInstall(); onClose() } : undefined}
              />
            )}
            <Row icon={<HelpCircle className="h-[17px] w-[17px]" />} label="Häufige Fragen" href="/faq" onClick={onClose} />
            <Row icon={<Sparkles className="h-[17px] w-[17px]" />} label="Was ist OpenSportMap?" href="/about" onClick={onClose} />
            <Row icon={<Handshake className="h-[17px] w-[17px]" />} label="Partner" href="/partner" onClick={onClose} />
            <Row icon={<MessageSquare className="h-[17px] w-[17px]" />} label="Feedback geben" href="/feedback" onClick={onClose} />
          </Section>

          {/* Sign out — logged-in only */}
          {!isGuest && (
            <Section>
              <Row
                icon={<LogOut className="h-[17px] w-[17px]" />}
                label="Abmelden"
                danger
                onClick={() => { signOut(); onClose() }}
              />
            </Section>
          )}

          {/* Legal footer — identical for all users */}
          <div className="flex gap-3 justify-center text-[12px] text-muted-foreground/60 mt-2 pt-2">
            <Link href="/impressum" onClick={onClose} className="hover:text-muted-foreground transition-colors">Impressum</Link>
            <span>·</span>
            <Link href="/changelog" onClick={onClose} className="hover:text-muted-foreground transition-colors">Changelog</Link>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
