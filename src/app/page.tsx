import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Trophy, Plus, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="container px-4 py-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Find Courts, Play Matches, Track Rankings
        </h1>
        <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
          Discover sports courts near you, log your matches, and compete in Elo-based rankings across multiple sports.
        </p>
        <div className="flex gap-4">
          <Button size="lg" asChild>
            <Link href="/auth/signup">Get Started</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/map">Map</Link>
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Find Courts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Discover sports courts in your area with our interactive map. Filter by sport type and location.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Log Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Record your match results and automatically update player rankings with our Elo rating system.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Track Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Compete in sport-specific leaderboards and track your skill progression over time.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Join Community
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Connect with other players, form teams, and participate in tournaments.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Supported Sports */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-6">Supported Sports</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {['Tennis', 'Basketball', 'Volleyball', 'Spikeball', 'Badminton', 'Squash', 'Pickleball'].map((sport) => (
            <div
              key={sport}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
            >
              {sport}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
