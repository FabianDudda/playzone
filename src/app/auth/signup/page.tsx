'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { auth } from '@/lib/supabase/auth'
import { Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react'

const ADJECTIVES = ['swift', 'brave', 'calm', 'bold', 'keen', 'wild', 'cool', 'free', 'sharp', 'bright']
const NOUNS = ['falcon', 'panda', 'tiger', 'eagle', 'wolf', 'fox', 'bear', 'hawk', 'lion', 'koala']

function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj}-${noun}`
}

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password.length < 6) {
      console.warn('[SignUp] Validation failed: password too short')
      toast({
        title: 'Passwort zu kurz',
        description: 'Das Passwort muss mindestens 6 Zeichen lang sein.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    // console.log('[SignUp] Sign-up attempt for:', email)

    try {
      const { data, error } = await auth.signUp(email, password, generateRandomName())

      if (error) {
        console.error('[SignUp] Sign-up error:', error.message)
        toast({
          title: 'Registrierung fehlgeschlagen',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        // console.log('[SignUp] Sign-up success:', { id: data.user?.id, email: data.user?.email })
        toast({
          title: 'Willkommen!',
          description: 'Dein Konto wurde erfolgreich erstellt.',
        })
        router.push('/')
      }
    } catch (error) {
      console.error('[SignUp] Unexpected error during sign-up:', error)
      toast({
        title: 'Ein Fehler ist aufgetreten',
        description: 'Bitte versuche es später erneut.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    // console.log('[SignUp] Google sign-up attempt')

    try {
      const { error } = await auth.signInWithGoogle()

      if (error) {
        console.error('[SignUp] Google sign-up error:', error.message)
        toast({
          title: 'Registrierung fehlgeschlagen',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        // console.log('[SignUp] Google sign-up redirect initiated')
      }
    } catch (error) {
      console.error('[SignUp] Unexpected error during Google sign-up:', error)
      toast({
        title: 'Ein Fehler ist aufgetreten',
        description: 'Bitte versuche es später erneut.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <UserPlus className="h-5 w-5" />
            Registrieren
          </CardTitle>
          <CardDescription>
            Erstelle dein Konto, um Spiele und Ranglisten zu verfolgen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Mit Google fortfahren
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Oder</span>
            </div>
          </div>

          {/* Email Sign Up Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="E-Mail eingeben"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Passwort erstellen"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Das Passwort muss mindestens 6 Zeichen lang sein.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Konto wird erstellt...' : 'Konto erstellen'}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Bereits ein Konto? </span>
            <Link href="/auth/signin" className="text-primary hover:underline">
              Anmelden
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}