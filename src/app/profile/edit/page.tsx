'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { supabase } from '@/lib/supabase/client'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import BackButton from '@/components/layout/back-button'

export default function EditProfilePage() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { name?: string }) => {
      if (!user) throw new Error('No user found')
      const { data, error } = await database.profiles.updateProfile(user.id, updates)
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      toast({ title: 'Profil aktualisiert', description: 'Deine Änderungen wurden gespeichert.' })
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Aktualisierung fehlgeschlagen', description: error.message, variant: 'destructive' })
    },
  })

  const updateEmailMutation = useMutation({
    mutationFn: async (newEmail: string) => {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast({ title: 'Bestätigung gesendet', description: 'Überprüfe deine neue E-Mail-Adresse, um die Änderung zu bestätigen.' })
    },
    onError: (error: Error) => {
      toast({ title: 'E-Mail-Aktualisierung fehlgeschlagen', description: error.message, variant: 'destructive' })
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast({ title: 'Passwort aktualisiert', description: 'Dein Passwort wurde geändert.' })
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: Error) => {
      toast({ title: 'Passwort-Aktualisierung fehlgeschlagen', description: error.message, variant: 'destructive' })
    },
  })

  if (!user || !profile) {
    return (
      <div className="container px-4 py-4 overflow-x-hidden">
        <div className="max-w-xl mx-auto">
          <p className="text-muted-foreground">Melde dich an, um dein Profil zu bearbeiten.</p>
        </div>
      </div>
    )
  }

  const hasNameChanges = name.trim() !== profile.name
  const hasEmailChanges = email.trim() !== user.email
  const passwordsMatch = newPassword === confirmPassword
  const canSavePassword = newPassword.length >= 6 && passwordsMatch

  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">Profil bearbeiten</h1>
        </div>

        {/* Member since */}
        <Card>
          <CardContent className="px-4 py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="text-sm">Mitglied seit {new Date(profile.created_at).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Account info */}
        <Card>
          <CardContent className="px-4 py-4 space-y-4">
            <div>
              <Label>Anzeigename</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="Dein Name"
              />
            </div>

            <div>
              <Label>E-Mail-Adresse</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
              {hasEmailChanges && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ein Bestätigungslink wird an deine neue E-Mail-Adresse gesendet.
                </p>
              )}
            </div>

            <Button
              className="w-full"
              disabled={(!hasNameChanges && !hasEmailChanges) || updateProfileMutation.isPending || updateEmailMutation.isPending}
              onClick={() => {
                if (hasNameChanges) updateProfileMutation.mutate({ name: name.trim() })
                if (hasEmailChanges) updateEmailMutation.mutate(email.trim())
              }}
            >
              {(updateProfileMutation.isPending || updateEmailMutation.isPending) ? 'Speichern...' : 'Änderungen speichern'}
            </Button>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardContent className="px-4 py-4 space-y-4">
            <div>
              <Label>Neues Passwort</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                placeholder="Mind. 6 Zeichen"
              />
            </div>

            <div>
              <Label>Neues Passwort bestätigen</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                placeholder="Neues Passwort wiederholen"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive mt-1">Passwörter stimmen nicht überein.</p>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!canSavePassword || updatePasswordMutation.isPending}
              onClick={() => updatePasswordMutation.mutate(newPassword)}
            >
              {updatePasswordMutation.isPending ? 'Aktualisieren...' : 'Passwort aktualisieren'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
