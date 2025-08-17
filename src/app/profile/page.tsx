'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { MatchService } from '@/lib/elo/match-service'
import { SportType, EloRatings } from '@/lib/supabase/types'
import { User, Mail, Trophy, TrendingUp, Calendar, Target, Edit2, Save, X } from 'lucide-react'

const SPORTS = ['tennis', 'basketball', 'volleyball', 'spikeball', 'badminton', 'squash', 'pickleball'] as const

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(profile?.name || '')

  // Get user statistics for each sport
  const { data: allStats = {} } = useQuery({
    queryKey: ['user-stats-all', user?.id],
    queryFn: async () => {
      if (!user) return {}
      const stats: Record<string, any> = {}
      
      // Get stats for each sport
      const promises = SPORTS.map(async (sport) => {
        const sportStats = await MatchService.getPlayerMatchStats(user.id, sport)
        return [sport, sportStats]
      })
      
      const results = await Promise.all(promises)
      results.forEach(([sport, sportStats]) => {
        stats[sport as string] = sportStats
      })
      
      return stats
    },
    enabled: !!user,
  })

  // Get overall stats (all sports combined)
  const { data: overallStats } = useQuery({
    queryKey: ['user-stats-overall', user?.id],
    queryFn: () => user ? MatchService.getPlayerMatchStats(user.id) : null,
    enabled: !!user,
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { name?: string; avatar?: string }) => {
      if (!user) throw new Error('No user found')
      const { data, error } = await database.profiles.updateProfile(user.id, updates)
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setIsEditing(false)
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSaveName = () => {
    if (editName.trim() && editName !== profile?.name) {
      updateProfileMutation.mutate({ name: editName.trim() })
    } else {
      setIsEditing(false)
    }
  }

  const getHighestEloSport = () => {
    if (!profile?.elo) return null
    const eloRatings = profile.elo as unknown as EloRatings
    const highest = Object.entries(eloRatings).reduce((max, [sport, rating]) => 
      rating > max.rating ? { sport, rating } : max, 
      { sport: '', rating: 0 }
    )
    return highest.rating > 1500 ? highest : null
  }

  const getTotalMatches = () => {
    return Object.values(allStats).reduce((total: number, stats: any) => 
      total + (stats?.totalMatches || 0), 0
    )
  }

  const getOverallWinRate = () => {
    const totalMatches = getTotalMatches()
    const totalWins = Object.values(allStats).reduce((total: number, stats: any) => 
      total + (stats?.wins || 0), 0
    )
    return totalMatches > 0 ? totalWins / totalMatches : 0
  }

  if (!user || !profile) {
    return (
      <div className="container px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to view your profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const highestElo = getHighestEloSport()
  const totalMatches = getTotalMatches()
  const overallWinRate = getOverallWinRate()

  return (
    <div className="container px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar || undefined} alt={profile.name} />
                <AvatarFallback className="text-2xl">
                  {profile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-2xl font-bold h-auto py-1"
                        />
                        <Button size="sm" onClick={handleSaveName}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setEditName(profile.name)
                            setIsEditing(false)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-3xl font-bold">{profile.name}</h1>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {highestElo && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      Best: {highestElo.sport} ({Math.round(highestElo.rating)})
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {totalMatches} matches played
                  </Badge>
                  {totalMatches > 0 && (
                    <Badge variant="outline">
                      {Math.round(overallWinRate * 100)}% win rate
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Statistics */}
        {overallStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Overall Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{overallStats.totalMatches}</div>
                  <div className="text-sm text-muted-foreground">Total Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{overallStats.wins}</div>
                  <div className="text-sm text-muted-foreground">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{overallStats.losses}</div>
                  <div className="text-sm text-muted-foreground">Losses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {overallStats.totalMatches > 0 ? `${Math.round(overallStats.winRate * 100)}%` : '0%'}
                  </div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Elo Ratings by Sport */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Elo Ratings by Sport
            </CardTitle>
            <CardDescription>
              Your current skill ratings across different sports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SPORTS.map((sport) => {
                const elo = (profile.elo as unknown as EloRatings)[sport]
                const stats = allStats[sport]
                
                return (
                  <Card key={sport} className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold capitalize">{sport}</h3>
                        <div className="text-right">
                          <div className="text-xl font-bold">{Math.round(elo)}</div>
                          <div className="text-xs text-muted-foreground">Rating</div>
                        </div>
                      </div>
                      
                      {stats && stats.totalMatches > 0 && (
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span>Matches:</span>
                            <span>{stats.totalMatches}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Win Rate:</span>
                            <span>{Math.round(stats.winRate * 100)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Avg Change:</span>
                            <span className={stats.averageEloChange > 0 ? 'text-green-600' : 'text-red-600'}>
                              {stats.averageEloChange > 0 ? '+' : ''}{Math.round(stats.averageEloChange)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {(!stats || stats.totalMatches === 0) && (
                        <div className="text-xs text-muted-foreground">
                          No matches played yet
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email Address</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={user.email || ''} disabled />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>
              
              <div>
                <Label>Member Since</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}