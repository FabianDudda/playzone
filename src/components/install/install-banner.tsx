'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

const DISMISSED_KEY = 'install-banner-dismissed'

export default function InstallBanner() {
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt()
  // Start hidden to avoid a flash on first render before localStorage is read
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  if (isStandalone || dismissed || (!canInstall && !isIOS)) return null

  return (
    <div className="absolute left-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2" style={{ bottom: 'calc(132px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex items-center gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
        {canInstall ? (
          <>
            <span className="flex-1 text-sm font-medium">Als App installieren</span>
            <button
              onClick={promptInstall}
              className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background"
            >
              Installieren
            </button>
          </>
        ) : (
          <p className="flex-1 text-sm leading-snug">
            <span className="font-medium">Als App speichern: </span>
            Tippe auf <span className="font-medium">···</span>, dann auf <Share className="inline h-3.5 w-3.5 align-text-bottom" /> <span className="font-medium">Teilen</span> und dann auf <span className="font-medium">»Zum Home-Bildschirm«</span>
          </p>
        )}
        <button
          onClick={dismiss}
          className="ml-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
