'use client'

import { Phone, Mail, Globe, Instagram, User } from 'lucide-react'
import { EventContact } from '@/lib/supabase/types'

interface ContactDisplayProps {
  contact: EventContact
  className?: string
}

export default function ContactDisplay({ contact, className = '' }: ContactDisplayProps) {
  const items = [
    contact.name     && { icon: User,      label: contact.name,     href: undefined },
    contact.email    && { icon: Mail,      label: contact.email,    href: `mailto:${contact.email}` },
    contact.phone    && { icon: Phone,     label: contact.phone,    href: `tel:${contact.phone}` },
    contact.instagram && { icon: Instagram, label: contact.instagram, href: `https://instagram.com/${contact.instagram.replace('@', '')}` },
    contact.website  && { icon: Globe,     label: contact.website,  href: contact.website },
  ].filter(Boolean) as { icon: React.ElementType; label: string; href?: string }[]

  if (items.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map(({ icon: Icon, label, href }, i) =>
        href ? (
          <a
            key={i}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </a>
        ) : (
          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{label}</span>
          </div>
        )
      )}
    </div>
  )
}
