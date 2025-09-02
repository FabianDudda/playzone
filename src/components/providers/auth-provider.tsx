'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/lib/supabase/types'
import { database } from '@/lib/supabase/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  error: string | null
  signOut: () => Promise<void>
  retry: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  error: null,
  signOut: async () => {},
  retry: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const userProfile = await database.profiles.getProfile(userId)
      setError(null) // Clear any previous errors
      return userProfile
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setError('Failed to load user profile. Some features may not work properly.')
      return null
    }
  }

  const initializeAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Error getting session:', sessionError)
        setError('Failed to restore your session. Please sign in again.')
        setLoading(false)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id)
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Auth initialization error:', err)
      setError('Failed to initialize authentication. Please refresh the page.')
      setLoading(false)
    }
  }

  const retry = async () => {
    await initializeAuth()
  }

  useEffect(() => {
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event)
        
        try {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            const userProfile = await fetchProfile(session.user.id)
            setProfile(userProfile)
          } else {
            setProfile(null)
            setError(null) // Clear errors when signing out
          }
          
          // Only set loading to false after we've processed the profile
          if (event !== 'INITIAL_SESSION') {
            setLoading(false)
          }
        } catch (err) {
          console.error('Error handling auth state change:', err)
          setError('Authentication error occurred. Please try signing in again.')
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        setError('Failed to sign out. Please try again.')
      }
    } catch (err) {
      console.error('Sign out error:', err)
      setError('Failed to sign out. Please try again.')
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    isAdmin: profile?.user_role === 'admin',
    error,
    signOut,
    retry,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}