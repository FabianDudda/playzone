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
        // Handle URL fragments (modern Supabase OAuth)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          // Set the session using the tokens from URL fragments
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (error) {
            console.error('Error setting session:', error)
            router.push('/auth/signin?error=session_failed')
            return
          }
          
          if (data.session) {
            // Success! Redirect to main app
            router.push('/')
            return
          }
        }
        
        // Fallback: Handle query parameters (traditional OAuth)
        const { data, error } = await supabase.auth.getSessionFromUrl()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/signin?error=callback_failed')
          return
        }
        
        if (data.session) {
          // Success! Redirect to main app
          router.push('/')
        } else {
          // No session found
          router.push('/auth/signin?error=no_session')
        }
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