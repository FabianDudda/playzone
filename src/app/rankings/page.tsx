'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { SportType } from '@/lib/supabase/types'
import { Trophy, Medal, Award, Crown, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const SPORTS = ['tennis', 'basketball', 'volleyball', 'spikeball', 'badminton', 'squash', 'pickleball'] as const

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />
    default:
      return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
  }
}

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'
    case 2:
      return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
    case 3:
      return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200'
    default:
      return 'bg-background'
  }
}

export default function RankingsPage() {
  const { user } = useAuth()
  const [selectedSport, setSelectedSport] = useState<SportType>('tennis')

  // Fetch leaderboard
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['leaderboard', selectedSport],
    queryFn: () => database.leaderboard.getLeaderboard(selectedSport, 100),
  })

  // Find current user's rank
  const userRank = user ? leaderboard.find(entry => entry.user_id === user.id) : null

  return (
    <div className="container px-4 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8" />
            Rankings
          </h1>
          <p className="text-muted-foreground">Compete and track your position on the leaderboards</p>
        </div>
        {!user && (
          <Button asChild>
            <Link href="/auth/signup">Join Rankings</Link>
          </Button>
        )}
      </div>

      {/* User's Current Rank Card */}
      {user && userRank && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Your Current Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getRankIcon(Number(userRank.rank))}
                  <span className="text-2xl font-bold">#{userRank.rank}</span>
                </div>
                <div>
                  <div className="font-semibold">{userRank.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {userRank.matches_played} matches played
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{userRank.elo}</div>
                <div className="text-sm text-muted-foreground">Elo Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sport Filter */}
      <div className="mb-6">
        <Select value={selectedSport} onValueChange={(value) => setSelectedSport(value as SportType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPORTS.map((sport) => (
              <SelectItem key={sport} value={sport}>
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1)} Leaderboard
          </CardTitle>
          <CardDescription>
            Top players in {selectedSport}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8">Loading rankings...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No rankings yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to play and appear on the leaderboard!
              </p>
              {user && (
                <Button asChild>
                  <Link href="/matches/new">Log Your First Match</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`p-4 border-b border-border last:border-b-0 ${getRankColor(Number(entry.rank))}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 min-w-[60px]">
                        {getRankIcon(Number(entry.rank))}
                      </div>
                      
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.avatar || undefined} alt={entry.name} />
                        <AvatarFallback>
                          {entry.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {entry.name}
                          {entry.user_id === user?.id && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.matches_played} matches played
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-bold">{entry.elo}</div>
                      <div className="text-sm text-muted-foreground">Elo Rating</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Elo System Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">How Elo Rankings Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• All players start with 1500 Elo points</p>
          <p>• Win against higher-rated players to gain more points</p>
          <p>• Team size affects point changes: Singles (±32), Small teams (±26), Large teams (±18)</p>
          <p>• Rankings update automatically after each match</p>
        </CardContent>
      </Card>
    </div>
  )
}