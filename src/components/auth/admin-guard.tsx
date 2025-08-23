'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Lock, UserX } from 'lucide-react'
import Link from 'next/link'

interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { user, profile, loading } = useAuth()

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="container px-4 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Checking access permissions...</p>
        </div>
      </div>
    )
  }

  // User is not logged in
  if (!user) {
    return fallback || (
      <div className="container px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You must be signed in to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is logged in but not an admin
  if (profile?.user_role !== 'admin') {
    return fallback || (
      <div className="container px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <Lock className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this page. This area is restricted to administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Current role: {profile?.user_role || 'user'}
            </div>
            <Button asChild variant="outline">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is authenticated and has admin role
  return <>{children}</>
}