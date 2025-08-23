'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { SportType } from '@/lib/supabase/types'
import { MatchService, CreateMatchData } from '@/lib/elo/match-service'
import { parseScore, getScoreDescription } from '@/lib/utils/score-parser'
import { database } from '@/lib/supabase/database'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Trophy } from 'lucide-react'
import PlayerSelector from '@/components/forms/player-selector'
import { usePlayerNames } from '@/hooks/use-player-names'

const SPORTS = ['tennis', 'basketball', 'volleyball', 'spikeball', 'badminton', 'squash', 'pickleball'] as const

export default function NewMatchPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [selectedSport, setSelectedSport] = useState<SportType | 'none'>('none')
  const [selectedCourt, setSelectedCourt] = useState<string | 'none'>('none')
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([])
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([])
  const [winner, setWinner] = useState<'team_a' | 'team_b' | 'draw' | ''>('')
  const [manualWinnerOverride, setManualWinnerOverride] = useState(false)
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')

  // Auto-detect winner based on scores
  const scoreResult = parseScore(scoreA, scoreB)
  const autoDetectedWinner = scoreResult.result
  const effectiveWinner = manualWinnerOverride ? winner : (autoDetectedWinner || winner)

  // Get player names for display
  const allPlayerIds = [...teamAPlayers, ...teamBPlayers]
  const { data: playerNames = {} } = usePlayerNames(allPlayerIds)

  // Fetch courts
  const { data: courts = [] } = useQuery({
    queryKey: ['courts'],
    queryFn: () => database.courts.getAllCourts(),
  })


  // Create match mutation
  const createMatchMutation = useMutation({
    mutationFn: async (matchData: CreateMatchData) => {
      const result = await MatchService.createMatch(matchData)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create match')
      }
      return result
    },
    onSuccess: () => {
      toast({
        title: 'Match created successfully!',
        description: 'Elo ratings have been updated.',
      })
      // Invalidate all match-related queries
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      queryClient.invalidateQueries({ queryKey: ['user-matches'] })
      queryClient.invalidateQueries({ queryKey: ['match-history'] })
      queryClient.invalidateQueries({ queryKey: ['player-stats'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      // Also invalidate profiles to update Elo ratings
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      router.push('/matches')
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating match',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Preview Elo changes
  const { data: eloPreview } = useQuery({
    queryKey: ['elo-preview', teamAPlayers, teamBPlayers, selectedSport, effectiveWinner],
    queryFn: () => {
      if (teamAPlayers.length > 0 && teamBPlayers.length > 0 && selectedSport !== 'none' && effectiveWinner) {
        return MatchService.previewEloChanges(
          teamAPlayers,
          teamBPlayers,
          selectedSport,
          effectiveWinner
        )
      }
      return null
    },
    enabled: teamAPlayers.length > 0 && teamBPlayers.length > 0 && selectedSport !== 'none' && !!effectiveWinner,
  })

  const handleAddPlayerToTeamA = (playerId: string, playerName: string) => {
    if (!teamAPlayers.includes(playerId)) {
      setTeamAPlayers([...teamAPlayers, playerId])
    }
  }

  const handleAddPlayerToTeamB = (playerId: string, playerName: string) => {
    if (!teamBPlayers.includes(playerId)) {
      setTeamBPlayers([...teamBPlayers, playerId])
    }
  }

  const handleRemovePlayer = (playerId: string, team: 'a' | 'b') => {
    if (team === 'a') {
      setTeamAPlayers(teamAPlayers.filter(id => id !== playerId))
    } else {
      setTeamBPlayers(teamBPlayers.filter(id => id !== playerId))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to create a match.',
        variant: 'destructive',
      })
      return
    }

    if (selectedSport === 'none' || teamAPlayers.length === 0 || teamBPlayers.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields (sport, players).',
        variant: 'destructive',
      })
      return
    }

    if (!effectiveWinner) {
      toast({
        title: 'Missing winner information',
        description: 'Please enter scores for both teams to automatically determine the winner.',
        variant: 'destructive',
      })
      return
    }

    const matchData: CreateMatchData = {
      courtId: selectedCourt === 'none' ? null : selectedCourt,
      sport: selectedSport,
      teamAPlayerIds: teamAPlayers,
      teamBPlayerIds: teamBPlayers,
      result: effectiveWinner,
      score: scoreA && scoreB ? { teamA: scoreA, teamB: scoreB } : null,
    }

    createMatchMutation.mutate(matchData)
  }

  if (!user) {
    return (
      <div className="container px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to create a match.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log New Match
          </CardTitle>
          <CardDescription>
            Record a match result and update player rankings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sport Selection */}
            <div className="space-y-2">
              <Label htmlFor="sport">Sport *</Label>
              <Select value={selectedSport} onValueChange={(value) => setSelectedSport(value as SportType | 'none')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select a sport
                  </SelectItem>
                  {SPORTS.map((sport) => (
                    <SelectItem key={sport} value={sport}>
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team A */}
              <div className="space-y-4">
                <h3 className="font-semibold">Team A</h3>
                <PlayerSelector
                  onPlayerSelect={handleAddPlayerToTeamA}
                  selectedPlayers={[...teamAPlayers, ...teamBPlayers]}
                  placeholder="Add player to Team A"
                />
                <div className="flex flex-wrap gap-2">
                  {teamAPlayers.map((playerId) => (
                    <Badge key={playerId} variant="secondary" className="flex items-center gap-1">
                      {playerNames[playerId] || playerId}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemovePlayer(playerId, 'a')}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Team B */}
              <div className="space-y-4">
                <h3 className="font-semibold">Team B</h3>
                <PlayerSelector
                  onPlayerSelect={handleAddPlayerToTeamB}
                  selectedPlayers={[...teamAPlayers, ...teamBPlayers]}
                  placeholder="Add player to Team B"
                />
                <div className="flex flex-wrap gap-2">
                  {teamBPlayers.map((playerId) => (
                    <Badge key={playerId} variant="secondary" className="flex items-center gap-1">
                      {playerNames[playerId] || playerId}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemovePlayer(playerId, 'b')}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Score (Optional) */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scoreA">Team A Score (Optional)</Label>
                  <Input
                    id="scoreA"
                    type="text"
                    placeholder="e.g., 6-4, 21"
                    value={scoreA}
                    onChange={(e) => {
                      setScoreA(e.target.value)
                      setManualWinnerOverride(false)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scoreB">Team B Score (Optional)</Label>
                  <Input
                    id="scoreB"
                    type="text"
                    placeholder="e.g., 6-2, 19"
                    value={scoreB}
                    onChange={(e) => {
                      setScoreB(e.target.value)
                      setManualWinnerOverride(false)
                    }}
                  />
                </div>
              </div>
              {/* Score Detection Feedback */}
              {(scoreA || scoreB) && autoDetectedWinner && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {autoDetectedWinner === 'team_a' ? 'Team A Wins' : 
                     autoDetectedWinner === 'team_b' ? 'Team B Wins' : 
                     'Draw'}
                  </p>
                </div>
              )}
            </div>


            {/* Court Selection */}
            <div className="space-y-2">
              <Label htmlFor="court">Court (Optional)</Label>
              <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a court or leave empty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific court</SelectItem>
                  {courts.map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty if the match wasn&apos;t played at a registered court
              </p>
            </div>

            {/* Elo Preview */}
            {eloPreview?.success && eloPreview.eloUpdates && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4" />
                    Elo Rating Changes Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {eloPreview.eloUpdates.map((update) => (
                    <div key={update.playerId} className="flex justify-between items-center">
                      <span className="font-medium">{playerNames[update.playerId] || update.playerId}</span>
                      <span className={`font-mono ${update.eloChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {update.eloBefore} → {update.eloAfter} ({update.eloChange > 0 ? '+' : ''}{update.eloChange})
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={createMatchMutation.isPending}
            >
              {createMatchMutation.isPending ? 'Creating Match...' : 'Create Match'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}