'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { SportType } from '@/lib/supabase/types'
import { MatchService } from '@/lib/elo/match-service'
import { Plus, Trophy, Calendar, MapPin, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const SPORTS = ['tennis', 'basketball', 'volleyball', 'spikeball', 'badminton', 'squash', 'pickleball'] as const

const getMatchResult = (participant: any) => {
  const match = participant.matches
  const winner = match?.winner
  const userTeam = participant.team
  
  if (winner === 'draw') {
    return {
      text: 'Draw',
      variant: 'secondary' as const
    }
  }
  
  const won = winner === userTeam
  return {
    text: won ? 'Won' : 'Lost',
    variant: won ? 'default' as const : 'destructive' as const
  }
}

export default function MatchesPage() {
  const { user, profile } = useAuth()
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all')

  // Fetch user matches
  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['user-matches', user?.id],
    queryFn: () => user ? database.matches.getUserMatches(user.id) : [],
    enabled: !!user,
  })

  // Fetch match participants for detailed history
  const { data: matchHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['match-history', user?.id, selectedSport],
    queryFn: () => user ? database.matchParticipants.getUserMatchHistory(user.id, selectedSport === 'all' ? undefined : selectedSport) : [],
    enabled: !!user,
  })

  // Get player stats
  const { data: playerStats } = useQuery({
    queryKey: ['player-stats', user?.id, selectedSport],
    queryFn: () => user ? MatchService.getPlayerMatchStats(user.id, selectedSport === 'all' ? undefined : selectedSport) : null,
    enabled: !!user,
  })

  if (!user) {
    return (
      <div className="container px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to view your matches.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const filteredMatches = selectedSport === 'all'
    ? matches
    : matches.filter(match => match.sport === selectedSport)

  return (
    <div className="container px-4 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Matches</h1>
          <p className="text-muted-foreground">Track your game history and performance</p>
        </div>
        <Button asChild>
          <Link href="/matches/new">
            <Plus className="h-4 w-4 mr-2" />
            Log Match
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      {playerStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{playerStats.totalMatches}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {playerStats.totalMatches > 0 ? `${Math.round(playerStats.winRate * 100)}%` : '0%'}
              </div>
              <div className="text-xs text-muted-foreground">
                {playerStats.wins}W - {playerStats.losses}L - {playerStats.draws}D
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Elo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(playerStats.currentElo)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Elo Change</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-1 ${
                playerStats.averageEloChange > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {playerStats.averageEloChange > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {playerStats.averageEloChange > 0 ? '+' : ''}{Math.round(playerStats.averageEloChange)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sport Filter */}
      <div className="mb-6">
        <Select value={selectedSport} onValueChange={(value) => setSelectedSport(value as SportType | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All sports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sports</SelectItem>
            {SPORTS.map((sport) => (
              <SelectItem key={sport} value={sport}>
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Match History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Match History</h2>
        
        {historyLoading ? (
          <div className="text-center py-8">Loading match history...</div>
        ) : matchHistory.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No matches yet</h3>
              <p className="text-muted-foreground mb-4">
                Start playing and logging matches to see your history here.
              </p>
              <Button asChild>
                <Link href="/matches/new">Log Your First Match</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matchHistory.map((participant) => (
              <Card key={participant.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {(() => {
                          const result = getMatchResult(participant)
                          return (
                            <Badge variant={result.variant}>
                              {result.text}
                            </Badge>
                          )
                        })()}
                        <Badge variant="outline">
                          {(participant as any).matches?.sport}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          at {(participant as any).matches?.courts?.name || 'Unknown Court'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(participant.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {(participant as any).matches?.courts?.name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Elo Change</div>
                      <div className={`font-mono font-semibold ${
                        participant.elo_change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {participant.elo_change > 0 ? '+' : ''}{participant.elo_change}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {participant.elo_before} → {participant.elo_after}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}