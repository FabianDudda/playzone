import { supabase } from './client'
import { Profile, Place, Court, LegacyCourt, PlaceWithCourts, Match, MatchParticipant, SportType, MatchResult, LeaderboardEntry, ModerationStatus, PendingPlaceChange, PlaceChangeType, Event, EventParticipant, EventStatus, SkillLevel, EventWithDetails } from './types'

// Helper function to fetch all records with automatic pagination
async function fetchAllRecords<T>(queryBuilder: any): Promise<T[]> {
  const allRecords: T[] = []
  let start = 0
  const limit = 1000 // Use 1000 as the safe batch size
  
  while (true) {
    const { data, error } = await queryBuilder.range(start, start + limit - 1)
    
    if (error) {
      console.error('Error in paginated query:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      break
    }
    
    allRecords.push(...data)
    
    // If we got fewer records than the limit, we've reached the end
    if (data.length < limit) {
      break
    }
    
    start += limit
  }
  
  console.log(`📊 fetchAllRecords completed: fetched ${allRecords.length} total records`)
  return allRecords
}

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

  // Place operations (legacy "courts" API - for backward compatibility)
  courts: {
    // Returns places with their courts - maintains backward compatibility
    getAllCourts: async (includeModeration = false): Promise<PlaceWithCourts[]> => {
      try {
        let query = supabase
          .from('places')
          .select(`
            *,
            courts (
              id,
              place_id,
              sport,
              quantity,
              surface,
              notes,
              created_at
            ),
            profiles:added_by_user (
              name,
              avatar
            )
          `)
        
        // Only show approved places unless specifically requesting moderation view
        if (!includeModeration) {
          query = query.eq('moderation_status', 'approved')
        }
        
        query = query.order('created_at', { ascending: false })
        
        // Use automatic pagination to get ALL records
        const data = await fetchAllRecords<PlaceWithCourts>(query)
        
        console.log(`📊 getAllCourts returned ${data.length} places (includeModeration: ${includeModeration})`)
        return data
      } catch (error) {
        console.error('Error fetching places:', error)
        return []
      }
    },

    getCourtsBySport: async (sport: SportType, includeModeration = false): Promise<PlaceWithCourts[]> => {
      try {
        let query = supabase
          .from('places')
          .select(`
            *,
            courts!inner (
              id,
              sport,
              quantity,
              surface,
              notes
            ),
            profiles:added_by_user (
              name,
              avatar
            )
          `)
          .eq('courts.sport', sport)
        
        // Only show approved places unless specifically requesting moderation view
        if (!includeModeration) {
          query = query.eq('moderation_status', 'approved')
        }
        
        query = query.order('created_at', { ascending: false })
        
        // Use automatic pagination to get ALL records
        const data = await fetchAllRecords<PlaceWithCourts>(query)
        
        console.log(`📊 getCourtsBySport returned ${data.length} places for sport: ${sport}`)
        return data
      } catch (error) {
        console.error('Error fetching places by sport:', error)
        return []
      }
    },

    getCourt: async (placeId: string, includeModeration = false): Promise<PlaceWithCourts | null> => {
      let query = supabase
        .from('places')
        .select(`
          *,
          courts (
            id,
            place_id,
            sport,
            quantity,
            surface,
            notes,
            created_at
          ),
          profiles:added_by_user (
            name,
            avatar
          )
        `)
        .eq('id', placeId)
      
      // For individual place viewing, we might want to show pending places to owners/admins
      if (!includeModeration) {
        query = query.eq('moderation_status', 'approved')
      }
      
      const { data, error } = await query.single()
      
      if (error) {
        console.error('Error fetching place:', error)
        return null
      }
      return data
    },

    addCourt: async (place: Omit<Place, 'id' | 'created_at' | 'import_date' | 'moderation_status' | 'moderated_by' | 'moderated_at' | 'rejection_reason'>) => {
      const { data, error } = await supabase
        .from('places')
        .insert({
          ...place,
          moderation_status: 'pending'
        })
        .select()
        .single()
      
      return { data, error }
    },

    updateCourt: async (placeId: string, updates: Partial<Place>) => {
      const { data, error } = await supabase
        .from('places')
        .update(updates)
        .eq('id', placeId)
        .select()
        .single()
      
      return { data, error }
    },

    deleteCourt: async (placeId: string) => {
      const { data, error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId)
      
      return { data, error }
    },
  },

  // New place operations
  places: {
    getAllPlaces: async (): Promise<PlaceWithCourts[]> => {
      return database.courts.getAllCourts()
    },

    getPlace: async (placeId: string): Promise<PlaceWithCourts | null> => {
      return database.courts.getCourt(placeId)
    },

    addPlace: async (place: Omit<Place, 'id' | 'created_at' | 'import_date'>) => {
      return database.courts.addCourt(place)
    },

    bulkImport: async (places: Array<{
      place: Omit<Place, 'id' | 'created_at'>,
      courts: Array<{
        sport: SportType,
        quantity: number,
        surface?: string | null,
        notes?: string | null
      }>
    }>) => {
      const results = {
        success: [] as string[],
        errors: [] as { place: string, error: any }[],
        duplicates: [] as string[]
      }

      for (const { place, courts } of places) {
        try {
          // Check for duplicates (within ~10m radius)
          const { data: existing } = await supabase
            .from('places')
            .select('id, name')
            .gte('latitude', place.latitude - 0.0001)
            .lte('latitude', place.latitude + 0.0001)
            .gte('longitude', place.longitude - 0.0001) 
            .lte('longitude', place.longitude + 0.0001)

          if (existing && existing.length > 0) {
            results.duplicates.push(place.name)
            continue
          }

          // Insert place
          const { data: insertedPlace, error: placeError } = await supabase
            .from('places')
            .insert(place)
            .select()
            .single()

          if (placeError) {
            results.errors.push({ place: place.name, error: placeError })
            continue
          }

          // Insert courts if any
          if (courts.length > 0) {
            const courtData = courts.map(court => ({
              place_id: insertedPlace.id,
              sport: court.sport,
              quantity: court.quantity,
              surface: court.surface || null,
              notes: court.notes || null
            }))

            const { error: courtsError } = await supabase
              .from('courts')
              .insert(courtData)

            if (courtsError) {
              console.warn(`Warning: Failed to insert some courts for ${place.name}:`, courtsError)
            }
          }

          results.success.push(place.name)
        } catch (error) {
          results.errors.push({ place: place.name, error })
        }
      }

      return results
    },
  },

  // Individual court operations  
  courtDetails: {
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
            id,
            sport,
            surface,
            places (
              name,
              latitude,
              longitude
            )
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
            id,
            sport,
            surface,
            places (
              name,
              latitude,
              longitude
            )
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
            id,
            sport,
            surface,
            places (
              name,
              latitude,
              longitude
            )
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
                sport,
                surface,
                places (
                  name
                )
              )
            )
          `)
          .eq('user_id', userId)
          .eq('matches.sport', sport)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching user match history for sport:', sport, error)
          console.error('Full error details:', JSON.stringify(error, null, 2))
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
                sport,
                surface,
                places (
                  name
                )
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

  // Event operations
  events: {
    getAllEvents: async (userId?: string): Promise<EventWithDetails[]> => {
      try {
        const { data, error } = await supabase
          .rpc('get_events_with_details', {
            user_id_param: userId || null
          })
        
        if (error) {
          console.error('Error fetching events:', error)
          return []
        }
        return data || []
      } catch (error) {
        console.error('Error fetching events:', error)
        return []
      }
    },

    getEventsBySport: async (sport: SportType, userId?: string): Promise<EventWithDetails[]> => {
      try {
        const { data, error } = await supabase
          .rpc('get_events_with_details', {
            user_id_param: userId || null
          })
          .eq('sport', sport)
        
        if (error) {
          console.error('Error fetching events by sport:', error)
          return []
        }
        return data || []
      } catch (error) {
        console.error('Error fetching events by sport:', error)
        return []
      }
    },

    getEventsByPlace: async (placeId: string, userId?: string): Promise<EventWithDetails[]> => {
      try {
        const { data, error } = await supabase
          .rpc('get_events_with_details', {
            user_id_param: userId || null
          })
          .eq('place_id', placeId)
          .eq('status', 'active')
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true })
        
        if (error) {
          console.error('Error fetching events by place:', error)
          return []
        }
        return data || []
      } catch (error) {
        console.error('Error fetching events by place:', error)
        return []
      }
    },

    getEvent: async (eventId: string, userId?: string): Promise<EventWithDetails | null> => {
      try {
        const { data, error } = await supabase
          .rpc('get_events_with_details', {
            user_id_param: userId || null
          })
          .eq('id', eventId)
          .single()
        
        if (error) {
          console.error('Error fetching event:', error)
          return null
        }

        // Fetch participants separately to get detailed info
        const { data: participants } = await supabase
          .from('event_participants')
          .select(`
            *,
            profiles (
              name,
              avatar
            )
          `)
          .eq('event_id', eventId)

        // Fetch place details separately for the place object
        const { data: place } = await supabase
          .from('places')
          .select(`
            *,
            courts (*)
          `)
          .eq('id', data.place_id)
          .single()

        return {
          ...data,
          participants: participants || [],
          place: place || null
        } as EventWithDetails
      } catch (error) {
        console.error('Error fetching event:', error)
        return null
      }
    },

    getUserEvents: async (userId: string): Promise<EventWithDetails[]> => {
      try {
        const { data, error } = await supabase
          .rpc('get_events_with_details', {
            user_id_param: userId
          })
          .or(`creator_id.eq.${userId},user_joined.eq.true`)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true })
        
        if (error) {
          console.error('Error fetching user events:', error)
          return []
        }
        return data || []
      } catch (error) {
        console.error('Error fetching user events:', error)
        return []
      }
    },

    createEvent: async (event: Omit<Event, 'id' | 'created_at' | 'updated_at'> & { extra_players?: number }) => {
      const { data, error } = await supabase.rpc('create_event_with_creator_participation', {
        event_title: event.title,
        event_description: event.description || '',
        event_place_id: event.place_id,
        event_sport: event.sport,
        event_date: event.event_date,
        event_time: event.event_time,
        event_min_players: event.min_players,
        event_max_players: event.max_players,
        event_skill_level: event.skill_level,
        event_creator_id: event.creator_id,
        extra_players: event.extra_players || 0
      })
      
      if (error) {
        return { data: null, error }
      }
      
      // Return the created event data
      const eventData = {
        id: data[0].event_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...event
      }
      
      return { data: eventData, error: null }
    },

    updateEvent: async (eventId: string, updates: Partial<Event>) => {
      const { data, error } = await supabase
        .from('events')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .select()
        .single()
      
      return { data, error }
    },

    deleteEvent: async (eventId: string) => {
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
      
      return { data, error }
    },

    joinEvent: async (eventId: string, userId: string, extraParticipants: number = 0) => {
      const { data, error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: userId,
          extra_participants_count: extraParticipants
        })
        .select()
        .single()
      
      return { data, error }
    },

    leaveEvent: async (eventId: string, userId: string) => {
      const { data, error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId)
      
      return { data, error }
    },

    getEventParticipants: async (eventId: string): Promise<EventParticipant[]> => {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          profiles (
            name,
            avatar
          )
        `)
        .eq('event_id', eventId)
      
      if (error) {
        console.error('Error fetching event participants:', error)
        return []
      }
      return data || []
    },

    removeParticipant: async (eventId: string, userId: string, removedBy: string) => {
      // Check if the person removing is the event creator
      const { data: event } = await supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single()
      
      if (event?.creator_id !== removedBy && removedBy !== userId) {
        return { data: null, error: { message: 'Not authorized to remove participant' } }
      }

      const { data, error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId)
      
      return { data, error }
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

  // Moderation operations
  moderation: {
    // Get all pending places for admin review
    getPendingPlaces: async (): Promise<PlaceWithCourts[]> => {
      try {
        const query = supabase
          .from('places')
          .select(`
            *,
            courts (
              id,
              place_id,
              sport,
              quantity,
              surface,
              notes,
              created_at
            ),
            profiles:added_by_user (
              name,
              avatar
            )
          `)
          .eq('moderation_status', 'pending')
          .order('created_at', { ascending: true })
        
        // Use automatic pagination to get ALL pending places
        const data = await fetchAllRecords<PlaceWithCourts>(query)
        
        console.log(`📊 getPendingPlaces returned ${data.length} pending places`)
        return data
      } catch (error) {
        console.error('Error fetching pending places:', error)
        return []
      }
    },

    // Get places by moderation status
    getPlacesByStatus: async (status: ModerationStatus): Promise<PlaceWithCourts[]> => {
      try {
        const query = supabase
          .from('places')
          .select(`
            *,
            courts (
              id,
              place_id,
              sport,
              quantity,
              surface,
              notes,
              created_at
            ),
            profiles:added_by_user (
              name,
              avatar
            )
          `)
          .eq('moderation_status', status)
          .order('created_at', { ascending: false })
        
        // Use automatic pagination to get ALL places with this status
        const data = await fetchAllRecords<PlaceWithCourts>(query)
        
        console.log(`📊 getPlacesByStatus(${status}) returned ${data.length} places`)
        return data
      } catch (error) {
        console.error('Error fetching places by status:', error)
        return []
      }
    },

    // Approve a place
    approvePlace: async (placeId: string, moderatorId: string) => {
      console.log('🔍 Approving place:', { placeId, moderatorId })
      
      // Check current user info for debugging RLS issues
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Current user for approval:', { 
        userId: user?.id, 
        role: user?.role,
        userMetadata: user?.user_metadata 
      })
      
      // First check if place exists and what its current status is
      const { data: existingPlace, error: fetchError } = await supabase
        .from('places')
        .select('id, moderation_status, name')
        .eq('id', placeId)
        .single()
      
      if (fetchError) {
        console.error('❌ Error fetching place before approval:', fetchError)
        return { data: null, error: fetchError }
      }
      
      console.log('📍 Found place to approve:', existingPlace)
      
      const { data, error } = await supabase
        .from('places')
        .update({
          moderation_status: 'approved',
          moderated_by: moderatorId,
          moderated_at: new Date().toISOString()
        })
        .eq('id', placeId)
        .select()
      
      if (error) {
        console.error('❌ Error approving place:', error)
        return { data: null, error }
      } else {
        console.log('✅ Place approved successfully:', data)
      }
      
      // If we get an empty array, it means the update worked but RLS prevents seeing the result
      // Let's do a separate fetch to verify the update worked
      if (!data || data.length === 0) {
        console.log('⚠️ Update returned empty - checking if place was actually updated')
        const { data: verifyData, error: verifyError } = await supabase
          .from('places')
          .select('id, moderation_status, name')
          .eq('id', placeId)
          .single()
        
        console.log('🔍 Verification result:', { verifyData, verifyError })
        
        // Return success with the existing place data if update worked
        return { data: { ...existingPlace, moderation_status: 'approved' }, error: null }
      }
      
      return { data: data[0], error }
    },

    // Bulk approve multiple places
    bulkApprovePlace: async (placeIds: string[], moderatorId: string) => {
      console.log('🔍 Bulk approving places:', { placeIds, moderatorId })
      
      const results = await Promise.allSettled(
        placeIds.map(async (placeId) => {
          const { data, error } = await supabase
            .from('places')
            .update({
              moderation_status: 'approved',
              moderated_by: moderatorId,
              moderated_at: new Date().toISOString()
            })
            .eq('id', placeId)
            .select('id, name')
            .single()
          
          if (error) {
            console.error(`❌ Error approving place ${placeId}:`, error)
            return { placeId, success: false, error: error.message }
          }
          
          console.log(`✅ Place approved successfully:`, data)
          return { placeId, success: true, data }
        })
      )
      
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).map(result => (result as any).value)
      
      const failed = results.filter(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && !result.value.success)
      ).map(result => 
        result.status === 'rejected' 
          ? { placeId: 'unknown', success: false, error: result.reason }
          : (result as any).value
      )
      
      console.log(`📊 Bulk approval results: ${successful.length} successful, ${failed.length} failed`)
      
      return {
        successful,
        failed,
        totalCount: placeIds.length,
        successCount: successful.length,
        failureCount: failed.length
      }
    },

    // Reject a place (delete it from database)
    rejectPlace: async (placeId: string, moderatorId: string, reason: string) => {
      // First delete any related courts
      await supabase
        .from('courts')
        .delete()
        .eq('place_id', placeId)
      
      // Then delete the place itself
      const { data, error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId)
        .select()
        .single()
      
      return { data, error }
    },

    // Get user's submitted places with status
    getUserPlaces: async (userId: string): Promise<PlaceWithCourts[]> => {
      try {
        const query = supabase
          .from('places')
          .select(`
            *,
            courts (
              id,
              place_id,
              sport,
              quantity,
              surface,
              notes,
              created_at
            ),
            profiles:added_by_user (
              name,
              avatar
            )
          `)
          .eq('added_by_user', userId)
          .order('created_at', { ascending: false })
        
        // Use automatic pagination to get ALL user places
        const data = await fetchAllRecords<PlaceWithCourts>(query)
        
        console.log(`📊 getUserPlaces returned ${data.length} places for user: ${userId}`)
        return data
      } catch (error) {
        console.error('Error fetching user places:', error)
        return []
      }
    },

    // Get moderation stats
    getModerationStats: async () => {
      const [pendingResult, approvedResult, communityEditsResult] = await Promise.all([
        supabase.from('places').select('id', { count: 'exact' }).eq('moderation_status', 'pending'),
        supabase.from('places').select('id', { count: 'exact' }).eq('moderation_status', 'approved'),
        supabase.from('pending_place_changes').select('id', { count: 'exact' }).eq('status', 'pending')
      ])
      
      return {
        pending: pendingResult.count || 0,
        approved: approvedResult.count || 0,
        community_edits: communityEditsResult.count || 0,
        total: (pendingResult.count || 0) + (approvedResult.count || 0)
      }
    }
  },

  // Community editing operations
  community: {
    // Get place for community editing (accessible to all users)
    getPlaceForEdit: async (placeId: string): Promise<PlaceWithCourts | null> => {
      const { data, error } = await supabase
        .from('places')
        .select(`
          *,
          courts (
            id,
            place_id,
            sport,
            quantity,
            surface,
            notes,
            created_at
          ),
          profiles:added_by_user (
            name,
            avatar
          )
        `)
        .eq('id', placeId)
        .single()
      
      if (error) {
        console.error('Error fetching place for edit:', error)
        return null
      }
      return data
    },

    // Submit a place edit as community contribution
    submitPlaceEdit: async (placeId: string, proposedData: Partial<Place>, courts: Partial<Court>[], userId: string) => {
      // Get current place data for comparison
      const currentPlace = await database.community.getPlaceForEdit(placeId)
      if (!currentPlace) {
        throw new Error('Place not found')
      }

      // Create the pending change record
      const { data, error } = await supabase
        .from('pending_place_changes')
        .insert({
          place_id: placeId,
          submitted_by: userId,
          change_type: 'update',
          proposed_data: {
            place: proposedData,
            courts: courts
          },
          current_data: {
            place: currentPlace,
            courts: currentPlace.courts
          },
          status: 'pending'
        })
        .select()
        .single()
      
      return { data, error }
    },

    // Get all pending place changes for admin review
    getPendingPlaceChanges: async (): Promise<PendingPlaceChange[]> => {
      try {
        const query = supabase
          .from('pending_place_changes')
          .select(`
            *,
            places (
              name,
              latitude,
              longitude
            ),
            profiles:submitted_by (
              name,
              avatar
            )
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
        
        // Use automatic pagination to get ALL pending changes
        const data = await fetchAllRecords<PendingPlaceChange>(query)
        
        console.log(`📊 getPendingPlaceChanges returned ${data.length} pending changes`)
        return data
      } catch (error) {
        console.error('Error fetching pending changes:', error)
        return []
      }
    },

    // Approve a community place edit
    approvePlaceEdit: async (changeId: string, moderatorId: string) => {
      // Get the pending change
      const { data: change, error: changeError } = await supabase
        .from('pending_place_changes')
        .select('*')
        .eq('id', changeId)
        .single()
      
      if (changeError || !change) {
        throw new Error('Pending change not found')
      }

      const proposedData = change.proposed_data as any
      
      // Apply the changes to the place
      if (change.place_id && proposedData.place) {
        const { error: placeUpdateError } = await supabase
          .from('places')
          .update({
            ...proposedData.place,
            updated_at: new Date().toISOString()
          })
          .eq('id', change.place_id)
        
        if (placeUpdateError) {
          throw new Error('Failed to update place: ' + placeUpdateError.message)
        }

        // Update courts if provided
        if (proposedData.courts && Array.isArray(proposedData.courts)) {
          // Delete existing courts for this place
          await supabase
            .from('courts')
            .delete()
            .eq('place_id', change.place_id)
          
          // Insert new courts
          if (proposedData.courts.length > 0) {
            const { error: courtsError } = await supabase
              .from('courts')
              .insert(
                proposedData.courts.map((court: any) => ({
                  ...court,
                  place_id: change.place_id
                }))
              )
            
            if (courtsError) {
              console.error('Failed to update courts:', courtsError)
            }
          }
        }
      }

      // Mark the change as approved
      const { data, error } = await supabase
        .from('pending_place_changes')
        .update({
          status: 'approved',
          reviewed_by: moderatorId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', changeId)
        .select()
        .single()
      
      return { data, error }
    },

    // Reject a community place edit
    rejectPlaceEdit: async (changeId: string, moderatorId: string, reason: string) => {
      const { data, error } = await supabase
        .from('pending_place_changes')
        .update({
          status: 'rejected',
          reviewed_by: moderatorId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', changeId)
        .select()
        .single()
      
      return { data, error }
    },

    // Get community contributors for a place
    getPlaceContributors: async (placeId: string) => {
      const { data, error } = await supabase
        .from('pending_place_changes')
        .select(`
          submitted_by,
          status,
          created_at,
          profiles:submitted_by (
            name,
            avatar
          )
        `)
        .eq('place_id', placeId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching contributors:', error)
        return []
      }
      return data || []
    }
  },
}

export default database