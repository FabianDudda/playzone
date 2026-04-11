'use client'

import { ArrowLeft } from 'lucide-react'

export default function BackButton() {
  return (
    <button
      onClick={() => history.back()}
      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title="Zurück"
      aria-label="Zurück"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  )
}
