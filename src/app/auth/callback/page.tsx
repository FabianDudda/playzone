'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null
    let subscription: { unsubscribe: () => void } | null = null

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
          setError(`OAuth error: ${errorDescription || errorCode}`)
          setIsProcessing(false)
          return
        }

        // Use auth state change listener for more reliable callback handling
        timeout = setTimeout(() => {
          console.error('OAuth session creation timed out after 10 seconds')
          setError('Authentication is taking longer than expected. Please try again.')
          setIsProcessing(false)
        }, 10000) // 10 seconds timeout

        // Listen for auth state changes
        const { data } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state change:', event, session?.user?.id)
            
            if (event === 'SIGNED_IN' && session) {
              if (timeout) clearTimeout(timeout)
              console.log('Successfully signed in, redirecting to home...')
              router.push('/')
              return
            }
            
            if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
              if (timeout) clearTimeout(timeout)
              setError('Sign in was cancelled or failed. Please try again.')
              setIsProcessing(false)
              return
            }
          }
        )
        subscription = data.subscription

        // Also check if we already have a session (in case the event already fired)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          if (timeout) clearTimeout(timeout)
          console.log('Session already exists, redirecting to home...')
          router.push('/')
          return
        }
        
      } catch (err) {
        console.error('Callback processing error:', err)
        setError('Failed to process authentication. Please try again.')
        setIsProcessing(false)
      }
    }

    // Only run on client side
    if (typeof window !== 'undefined') {
      handleAuthCallback()
    }

    // Cleanup function
    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [router])

  if (error) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Sign In Failed
            </CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button 
              onClick={() => router.push('/auth/signin')}
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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