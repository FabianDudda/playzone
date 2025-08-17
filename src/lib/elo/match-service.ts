import { supabase } from '../supabase/client'
import { database } from '../supabase/database'
import { SportType, MatchResult as DBMatchResult, Profile } from '../supabase/types'
import { EloCalculator, Player, Team, MatchResult, EloUpdate } from './calculator'

export interface CreateMatchData {
  courtId?: string | null
  sport: SportType
  teamAPlayerIds: string[]
  teamBPlayerIds: string[]
  result: 'team_a' | 'team_b' | 'draw'
  score?: any
}

export class MatchService {
  /**
   * Convert database profile to calculator player format
   */
  private static profileToPlayer(profile: Profile): Player {
    return {
      id: profile.id,
      name: profile.name,
      elo: profile.elo as any
    }
  }

  /**
   * Create a new match and update player Elos
   */
  static async createMatch(matchData: CreateMatchData): Promise<{
    success: boolean
    match?: any
    eloUpdates?: EloUpdate[]
    error?: string
  }> {
    try {
      // Fetch all player profiles
      const allPlayerIds = [...matchData.teamAPlayerIds, ...matchData.teamBPlayerIds]
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allPlayerIds)

      if (profileError || !profiles || profiles.length !== allPlayerIds.length) {
        return {
          success: false,
          error: 'Could not fetch all player profiles'
        }
      }

      // Convert profiles to players and create teams
      const teamAPlayers = matchData.teamAPlayerIds.map(id => {
        const profile = profiles.find(p => p.id === id)!
        return this.profileToPlayer(profile)
      })

      const teamBPlayers = matchData.teamBPlayerIds.map(id => {
        const profile = profiles.find(p => p.id === id)!
        return this.profileToPlayer(profile)
      })

      const teamA: Team = { players: teamAPlayers }
      const teamB: Team = { players: teamBPlayers }

      // Calculate Elo updates
      const matchResult: MatchResult = {
        teamA,
        teamB,
        sport: matchData.sport,
        result: matchData.result
      }

      const eloUpdates = EloCalculator.updateTeamElo(matchResult)

      // Start a transaction
      const insertData = {
        court_id: matchData.courtId,
        sport: matchData.sport,
        team_a_players: matchData.teamAPlayerIds,
        team_b_players: matchData.teamBPlayerIds,
        winner: matchData.result,
        score: matchData.score || null
      }
      
      console.log('Inserting match data:', insertData)
      
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert(insertData)
        .select()
        .single()

      if (matchError || !match) {
        console.error('Match creation error:', matchError)
        return {
          success: false,
          error: `Failed to create match record: ${matchError?.message || 'Unknown error'}`
        }
      }

      // Update player Elos
      const eloUpdatePromises = eloUpdates.map(update => {
        const player = [...teamAPlayers, ...teamBPlayers].find(p => p.id === update.playerId)!
        const newEloRatings = {
          ...player.elo,
          [matchData.sport]: update.eloAfter
        }

        return supabase
          .from('profiles')
          .update({ elo: newEloRatings })
          .eq('id', update.playerId)
      })

      await Promise.all(eloUpdatePromises)

      // Create match participant records
      const participantRecords = eloUpdates.map(update => ({
        match_id: match.id,
        user_id: update.playerId,
        team: matchData.teamAPlayerIds.includes(update.playerId) ? 'team_a' : 'team_b',
        elo_before: update.eloBefore,
        elo_after: update.eloAfter,
        elo_change: update.eloChange
      }))

      const { error: participantError } = await supabase
        .from('match_participants')
        .insert(participantRecords)

      if (participantError) {
        console.error('Failed to create match participant records:', participantError)
        // This is not a critical error, the match is still valid
      }

      return {
        success: true,
        match,
        eloUpdates
      }

    } catch (error) {
      console.error('Error creating match:', error)
      return {
        success: false,
        error: 'Unexpected error occurred'
      }
    }
  }

  /**
   * Preview Elo changes without creating a match
   */
  static async previewEloChanges(
    teamAPlayerIds: string[],
    teamBPlayerIds: string[],
    sport: SportType,
    result: 'team_a' | 'team_b' | 'draw'
  ): Promise<{
    success: boolean
    eloUpdates?: EloUpdate[]
    prediction?: {
      teamAWinProbability: number
      teamBWinProbability: number
      eloAdvantage: number
    }
    error?: string
  }> {
    try {
      // Fetch all player profiles
      const allPlayerIds = [...teamAPlayerIds, ...teamBPlayerIds]
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allPlayerIds)

      if (profileError || !profiles || profiles.length !== allPlayerIds.length) {
        return {
          success: false,
          error: 'Could not fetch all player profiles'
        }
      }

      // Convert profiles to players and create teams
      const teamAPlayers = teamAPlayerIds.map(id => {
        const profile = profiles.find(p => p.id === id)!
        return this.profileToPlayer(profile)
      })

      const teamBPlayers = teamBPlayerIds.map(id => {
        const profile = profiles.find(p => p.id === id)!
        return this.profileToPlayer(profile)
      })

      const teamA: Team = { players: teamAPlayers }
      const teamB: Team = { players: teamBPlayers }

      // Calculate prediction
      const prediction = EloCalculator.predictMatchOutcome(teamA, teamB, sport)

      // Simulate Elo changes
      const eloUpdates = EloCalculator.simulateEloChange(teamA, teamB, sport, result)

      return {
        success: true,
        eloUpdates,
        prediction
      }

    } catch (error) {
      console.error('Error previewing Elo changes:', error)
      return {
        success: false,
        error: 'Unexpected error occurred'
      }
    }
  }

  /**
   * Get match statistics for a player
   */
  static async getPlayerMatchStats(userId: string, sport?: SportType): Promise<{
    totalMatches: number
    wins: number
    losses: number
    draws: number
    winRate: number
    averageEloChange: number
    currentElo: number
  }> {
    try {
      // Get player profile for current Elo
      const profile = await database.profiles.getProfile(userId)
      if (!profile) throw new Error('Profile not found')

      // Get match history with winner information
      const matchHistory = await database.matchParticipants.getUserMatchHistory(userId, sport)

      const totalMatches = matchHistory.length
      if (totalMatches === 0) {
        return {
          totalMatches: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
          averageEloChange: 0,
          currentElo: sport ? (profile.elo as any)[sport] : 1500
        }
      }

      // Calculate wins, losses, and draws based on actual match results
      const wins = matchHistory.filter(match => {
        const winner = (match as any).matches?.winner
        const userTeam = match.team
        return winner === userTeam
      }).length
      
      const draws = matchHistory.filter(match => {
        const winner = (match as any).matches?.winner
        return winner === 'draw'
      }).length
      
      const losses = totalMatches - wins - draws
      const winRate = wins / totalMatches
      const averageEloChange = matchHistory.reduce((sum, match) => sum + match.elo_change, 0) / totalMatches
      const currentElo = sport ? (profile.elo as any)[sport] : 1500

      return {
        totalMatches,
        wins,
        losses,
        draws,
        winRate,
        averageEloChange,
        currentElo
      }

    } catch (error) {
      console.error('Error getting player match stats:', error)
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        averageEloChange: 0,
        currentElo: 1500
      }
    }
  }
}

export default MatchService