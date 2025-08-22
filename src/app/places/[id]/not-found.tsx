import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, ArrowLeft, Home } from 'lucide-react'

export default function PlaceNotFound() {
  return (
    <div className="container px-4 py-6 max-w-2xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <Link 
          href="/map" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courts
        </Link>
      </div>

      {/* Not Found Card */}
      <Card className="text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Place Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The place you're looking for doesn't exist or may have been removed.
          </p>
          <p className="text-sm text-muted-foreground">
            This could happen if:
          </p>
          <ul className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-1">
            <li>• The place ID in the URL is incorrect</li>
            <li>• The place has been deleted</li>
            <li>• You don't have permission to view this place</li>
          </ul>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild>
              <Link href="/map" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Browse All Courts
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}