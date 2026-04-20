'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EventContact } from '@/lib/supabase/types'

interface ContactEditorProps {
  value: EventContact
  onChange: (contact: EventContact) => void
}

export default function ContactEditor({ value, onChange }: ContactEditorProps) {
  const update = (field: keyof EventContact, val: string) =>
    onChange({ ...value, [field]: val || undefined })

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="contact-name" className="text-xs mb-1 block">Name</Label>
        <Input
          id="contact-name"
          placeholder="Max Mustermann"
          value={value.name || ''}
          onChange={e => update('name', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="contact-email" className="text-xs mb-1 block">E-Mail</Label>
        <Input
          id="contact-email"
          type="email"
          placeholder="max@example.com"
          value={value.email || ''}
          onChange={e => update('email', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="contact-phone" className="text-xs mb-1 block">Telefon</Label>
        <Input
          id="contact-phone"
          type="tel"
          placeholder="+49 ..."
          value={value.phone || ''}
          onChange={e => update('phone', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="contact-instagram" className="text-xs mb-1 block">Instagram</Label>
        <Input
          id="contact-instagram"
          placeholder="@benutzername"
          value={value.instagram || ''}
          onChange={e => update('instagram', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="contact-website" className="text-xs mb-1 block">Website</Label>
        <Input
          id="contact-website"
          type="url"
          placeholder="https://..."
          value={value.website || ''}
          onChange={e => update('website', e.target.value)}
        />
      </div>
    </div>
  )
}
