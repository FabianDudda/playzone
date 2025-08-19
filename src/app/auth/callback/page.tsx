'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Starting OAuth callback processing...')
        console.log('Current URL:', window.location.href)
        
        // Check for OAuth errors in URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const errorCode = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')
        
        if (errorCode) {
          console.error('OAuth error from provider:', errorCode, errorDescription)
          router.push(`/auth/signin?error=oauth_${errorCode}`)
          return
        }
        
        // Let Supabase handle OAuth automatically, wait for session to be available
        console.log('Waiting for Supabase to automatically process OAuth callback...')
        
        // Wait up to 5 seconds for Supabase to automatically handle the OAuth
        let attempts = 0
        const maxAttempts = 10
        
        const checkSession = async () => {
          attempts++
          console.log(`Checking session attempt ${attempts}/${maxAttempts}...`)
          
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            console.log('Session found after automatic processing, redirecting to home...')
            router.push('/')
            return true
          }
          
          if (attempts < maxAttempts) {
            setTimeout(checkSession, 500)
          } else {
            console.error('OAuth session creation timed out after 5 seconds')
            router.push('/auth/signin?error=oauth_timeout')
          }
          return false
        }
        
        checkSession()
        
      } catch (err) {
        console.error('Callback processing error:', err)
        router.push('/auth/signin?error=processing_failed')
      }
    }

    // Only run on client side
    if (typeof window !== 'undefined') {
      handleAuthCallback()
    }
  }, [router])

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Completing Sign In
          </CardTitle>
          <CardDescription>
            Please wait while we finish setting up your account...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>This should only take a moment.</p>
        </CardContent>
      </Card>
    </div>
  )
}