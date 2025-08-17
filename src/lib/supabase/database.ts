import { supabase } from './client'
import { Profile, Court, Match, MatchParticipant, SportType, MatchResult, LeaderboardEntry } from './types'

export const database = {
  // Profile operations
  profiles: {
    getProfile: async (userId: string): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      return data
    },

    getAllProfiles: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Error fetching profiles:', error)
        return []
      }
      return data || []
    },

    searchProfiles: async (query: string): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${query}%`)
        .order('name', { ascending: true })
        .limit(10)
      
      if (error) {
        console.error('Error searching profiles:', error)
        return []
      }
      return data || []
    },

    updateProfile: async (userId: string, updates: Partial<Profile>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      
      return { data, error }
    },

    updateElo: async (userId: string, sport: SportType, newElo: number) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('elo')
        .eq('id', userId)
        .single()
      
      if (!profile) throw new Error('Profile not found')
      
      const updatedElo = {
        ...profile.elo as any,
        [sport]: newElo
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ elo: updatedElo })
        .eq('id', userId)
        .select()
        .single()
      
      return { data, error }
    },
  },

  // Court operations
  courts: {
    getAllCourts: async (): Promise<Court[]> => {
      const { data, error } = await supabase
        .from('courts')
        .select(`
          *,
          profiles:added_by_user (
            name,
            avatar
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching courts:', error)
        return []
      }
      return data || []
    },

    getCourtsBySport: async (sport: SportType): Promise<Court[]> => {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .contains('sports', [sport])
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching courts by sport:', error)
        return []
      }
      return data || []
    },

    getCourt: async (courtId: string): Promise<Court | null> => {
      const { data, error } = await supabase
        .from('courts')
        .select(`
          *,
          profiles:added_by_user (
            name,
            avatar
          )
        `)
        .eq('id', courtId)
        .single()
      
      if (error) {
        console.error('Error fetching court:', error)
        return null
      }
      return data
    },

    addCourt: async (court: Omit<Court, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('courts')
        .insert(court)
        .select()
        .single()
      
      return { data, error }
    },

    updateCourt: async (courtId: string, updates: Partial<Court>) => {
      const { data, error } = await supabase
        .from('courts')
        .update(updates)
        .eq('id', courtId)
        .select()
        .single()
      
      return { data, error }
    },

    deleteCourt: async (courtId: string) => {
      const { data, error } = await supabase
        .from('courts')
        .delete()
        .eq('id', courtId)
      
      return { data, error }
    },
  },

  // Match operations
  matches: {
    getAllMatches: async (): Promise<Match[]> => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          courts (
            name,
            latitude,
            longitude
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching matches:', error)
        return []
      }
      return data || []
    },

    getMatchesBySport: async (sport: SportType): Promise<Match[]> => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          courts (
            name,
            latitude,
            longitude
          )
        `)
        .eq('sport', sport)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching matches by sport:', error)
        return []
      }
      return data || []
    },

    getUserMatches: async (userId: string): Promise<Match[]> => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          courts (
            name,
            latitude,
            longitude
          )
        `)
        .or(`team_a_players.cs.{${userId}},team_b_players.cs.{${userId}}`)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching user matches:', error)
        return []
      }
      return data || []
    },

    addMatch: async (match: Omit<Match, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('matches')
        .insert(match)
        .select()
        .single()
      
      return { data, error }
    },
  },

  // Match participant operations
  matchParticipants: {
    getMatchParticipants: async (matchId: string): Promise<MatchParticipant[]> => {
      const { data, error } = await supabase
        .from('match_participants')
        .select(`
          *,
          profiles (
            name,
            avatar
          )
        `)
        .eq('match_id', matchId)
      
      if (error) {
        console.error('Error fetching match participants:', error)
        return []
      }
      return data || []
    },

    addMatchParticipants: async (participants: Omit<MatchParticipant, 'id' | 'created_at'>[]) => {
      const { data, error } = await supabase
        .from('match_participants')
        .insert(participants)
        .select()
      
      return { data, error }
    },

    getUserMatchHistory: async (userId: string, sport?: SportType): Promise<MatchParticipant[]> => {
      if (sport) {
        // When filtering by sport, we need to join through matches table
        const { data, error } = await supabase
          .from('match_participants')
          .select(`
            *,
            matches!inner (
              sport,
              winner,
              created_at,
              courts (
                name
              )
            )
          `)
          .eq('user_id', userId)
          .eq('matches.sport', sport)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching user match history for sport:', error)
          return []
        }
        return data || []
      } else {
        // When not filtering by sport, get all matches
        const { data, error } = await supabase
          .from('match_participants')
          .select(`
            *,
            matches (
              sport,
              winner,
              created_at,
              courts (
                name
              )
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching user match history:', error)
          return []
        }
        return data || []
      }
    },
  },

  // Leaderboard operations
  leaderboard: {
    getLeaderboard: async (sport?: SportType, limit: number = 50): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .rpc('get_leaderboard', {
          sport_name: sport || null,
          limit_count: limit
        })
      
      if (error) {
        console.error('Error fetching leaderboard:', error)
        return []
      }
      return data || []
    },
  },
}

export default database