import { supabase } from './client'
import { Profile, Place, Court, LegacyCourt, PlaceWithCourts, PlaceMarker, Match, MatchParticipant, SportType, MatchResult, LeaderboardEntry, ModerationStatus, PendingPlaceChange, PlaceChangeType, Event, EventWithDetails, EventBookmark, EventSchedule, UserFavorite, PlaceAttribute, CourtAttribute, Organizer, OrganizerImage, TablesInsert, TablesUpdate, InlineLocation, LocationType, AgeRestriction, GenderRestriction, OrganizerSummary } from './types'

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
  
  // console.log(`📊 fetchAllRecords completed: fetched ${allRecords.length} total records`)
  return allRecords
}

function normalizeSchedule(schedule: any): any {
  if (!schedule) return schedule
  if (schedule.type === 'recurring' && Array.isArray(schedule.slots)) {
    return {
      ...schedule,
      slots: schedule.slots.map((s: any) => ({
        ...s,
        start_time: s.start_time ?? s.time ?? '',
        end_time: s.end_time ?? '',
      })),
    }
  }
  if (Array.isArray(schedule.dates)) {
    return {
      ...schedule,
      dates: schedule.dates.map((d: any) => ({
        ...d,
        start_time: d.start_time ?? d.time ?? '',
        end_time: d.end_time ?? '',
      })),
    }
  }
  return schedule
}

async function enrichEventsWithOrganizers(events: EventWithDetails[]): Promise<EventWithDetails[]> {
  const allIds = [...new Set(events.flatMap(e => e.organizer_ids).filter(Boolean))]
  if (allIds.length === 0) return events.map(e => ({ ...e, event_organizers: [] }))

  const { data: orgs } = await supabase
    .from('organizers')
    .select('id, name, color, logo_url, website, instagram, email, phone')
    .in('id', allIds)

  const orgMap = new Map((orgs || []).map((o: OrganizerSummary) => [o.id, o]))

  return events.map(e => ({
    ...e,
    event_organizers: e.organizer_ids
      .map(id => orgMap.get(id))
      .filter((o): o is OrganizerSummary => !!o),
  }))
}

function mapToEventWithDetails(event: any, isBookmarked = false): EventWithDetails {
  return {
    id: event.id,
    created_at: event.created_at,
    updated_at: event.updated_at,
    title: event.title,
    description: event.description ?? null,
    event_type: event.event_type || 'session',
    place_id: event.place_id,
    sports: event.sports ?? [],
    schedule: normalizeSchedule(event.schedule),
    contact: event.contact || {},
    image_url: event.image_url ?? null,
    creator_id: event.creator_id,
    status: event.status || 'active',
    organizer_id: event.organizer_id ?? null,
    moderation_status: event.moderation_status || 'pending',
    moderated_by: event.moderated_by ?? null,
    moderated_at: event.moderated_at ?? null,
    rejection_reason: event.rejection_reason ?? null,
    pending_changes: event.pending_changes ?? null,
    creator_name: event.profiles?.name || '',
    creator_avatar: event.profiles?.avatar || null,
    creator_email: null,
    place_name: event.places?.name || '',
    place_latitude: event.places?.latitude || 0,
    place_longitude: event.places?.longitude || 0,
    place_street: event.places?.street || null,
    place_house_number: event.places?.house_number || null,
    place_city: event.places?.city || null,
    place_postcode: event.places?.postcode || null,
    place_district: event.places?.district || null,
    is_bookmarked: isBookmarked,
    organizer_ids: event.organizer_ids ?? [],
    organizer_name: event.organizers?.name ?? null,
    organizer_color: event.organizers?.color ?? null,
    organizer_logo_url: event.organizers?.logo_url ?? null,
    organizer_slug: event.organizers?.slug ?? null,
    organizer_website: event.organizers?.website ?? null,
    organizer_instagram: event.organizers?.instagram ?? null,
    place_is_event_only: event.places?.is_event_only ?? false,
    inline_location: (event.inline_location as InlineLocation) ?? null,
    location_type: (event.location_type as LocationType) ?? null,
    age_restriction: (event.age_restriction as AgeRestriction) ?? null,
    gender_restriction: (event.gender_restriction as GenderRestriction) ?? null,
    event_organizers: [],
  }
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
    // Lightweight query — only marker fields. Use this for the map pin layer.
    getAllPlacesLightweight: async (): Promise<PlaceMarker[]> => {
      try {
        const data = await fetchAllRecords<PlaceMarker>(
          supabase
            .from('places')
            .select('id, name, latitude, longitude, sports, place_type, city, organizer_id, is_event_only, organizers(name, color, logo_url, slug)')
            .eq('moderation_status', 'approved')
            .order('created_at', { ascending: false })
        )
        return data
      } catch (error) {
        console.error('Error fetching lightweight places:', error)
        return []
      }
    },

    // Single-batch fetch for progressive loading. from/to are inclusive row indices.
    getAllPlacesLightweightBatch: async (from: number, to: number): Promise<PlaceMarker[]> => {
      const { data, error } = await supabase
        .from('places')
        .select('id, name, latitude, longitude, sports, place_type, city, organizer_id, is_event_only, organizers(name, color, logo_url, slug)')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return data || []
    },

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
              custom_sport_name,
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
        
        // console.log(`📊 getAllCourts returned ${data.length} places (includeModeration: ${includeModeration})`)
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
        
        // console.log(`📊 getCourtsBySport returned ${data.length} places for sport: ${sport}`)
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
            custom_sport_name,
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

    // Paginated + server-side filtered query for admin data tools and moderation tabs
    getPlacesAdminPaged: async (filters: {
      city?: string
      sport?: string
      sources?: string[]
      addressStatus?: 'all' | 'enriched' | 'coordinates-only'
      // Moderation tab filters
      moderationStatus?: ModerationStatus
      country?: string
      district?: string
      placeType?: string
      source?: string
      ids?: string[]
      page: number
      pageSize: number
    }): Promise<{ data: PlaceWithCourts[]; count: number }> => {
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
              custom_sport_name,
              created_at
            ),
            profiles:added_by_user (
              name,
              avatar,
              user_role
            )
          `, { count: 'exact' })

        if (filters.moderationStatus) query = query.eq('moderation_status', filters.moderationStatus)
        if (filters.city) query = query.eq('city', filters.city)
        if (filters.country) query = query.eq('country', filters.country)
        if (filters.district) query = query.eq('district', filters.district)
        if (filters.placeType) query = query.eq('place_type', filters.placeType)
        if (filters.source) query = query.eq('source', filters.source)
        if (filters.sources && filters.sources.length > 0) query = query.in('source', filters.sources)
        if (filters.ids !== undefined) {
          if (filters.ids.length === 0) return { data: [], count: 0 }
          query = query.in('id', filters.ids)
        }
        if (filters.addressStatus === 'enriched') {
          query = query.not('street', 'is', null).not('city', 'is', null)
        } else if (filters.addressStatus === 'coordinates-only') {
          query = query.or('street.is.null,city.is.null')
        }
        if (filters.sport) {
          query = query.contains('sports', [filters.sport])
        }

        const start = filters.page * filters.pageSize
        const end = start + filters.pageSize - 1
        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(start, end)

        if (error) throw error
        return { data: data ?? [], count: count ?? 0 }
      } catch (error) {
        console.error('Error fetching admin places:', error)
        return { data: [], count: 0 }
      }
    },

    // Lightweight meta query for moderation tab filter dropdowns
    getModerationMeta: async (status: ModerationStatus): Promise<{
      countries: string[]
      cities: string[]
      districts: string[]
      sources: string[]
      placeTypes: string[]
      sports: string[]
    }> => {
      try {
        const data = await fetchAllRecords<{
          country: string | null
          city: string | null
          district: string | null
          source: string | null
          place_type: string | null
          sports: string[] | null
        }>(
          supabase
            .from('places')
            .select('country, city, district, source, place_type, sports')
            .eq('moderation_status', status)
        )

        const toSortedUnique = (vals: (string | null)[]): string[] =>
          Array.from(new Set(vals.filter((v): v is string => !!v))).sort()

        return {
          countries:  toSortedUnique(data.map(p => p.country)),
          cities:     toSortedUnique(data.map(p => p.city)),
          districts:  toSortedUnique(data.map(p => p.district)),
          sources:    toSortedUnique(data.map(p => p.source)),
          placeTypes: toSortedUnique(data.map(p => p.place_type)),
          sports:     toSortedUnique(data.flatMap(p => p.sports ?? [])),
        }
      } catch (error) {
        console.error('Error fetching moderation meta:', error)
        return { countries: [], cities: [], districts: [], sources: [], placeTypes: [], sports: [] }
      }
    },

    // Lightweight meta query — counts per city/source/sport + address stats for filter dropdowns
    getPlacesAdminMeta: async (): Promise<{
      cities: { name: string; count: number }[]
      sources: { name: string; count: number }[]
      sports: { name: string; count: number }[]
      addressStats: { total: number; enriched: number; coordinatesOnly: number }
    }> => {
      try {
        const data = await fetchAllRecords<{ city: string | null; source: string | null; sports: string[] | null; street: string | null }>(
          supabase.from('places').select('city, source, sports, street')
        )

        const cityMap: Record<string, number> = {}
        const sourceMap: Record<string, number> = {}
        const sportMap: Record<string, number> = {}
        let enriched = 0

        for (const p of data ?? []) {
          if (p.city)   cityMap[p.city]     = (cityMap[p.city]   ?? 0) + 1
          if (p.source) sourceMap[p.source] = (sourceMap[p.source] ?? 0) + 1
          for (const s of (p.sports ?? []) as string[]) if (s) sportMap[s] = (sportMap[s] ?? 0) + 1
          if (p.street && p.city) enriched++
        }

        const total = (data ?? []).length

        return {
          cities:  Object.entries(cityMap).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count })),
          sources: Object.entries(sourceMap).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count })),
          sports:  Object.entries(sportMap).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count })),
          addressStats: { total, enriched, coordinatesOnly: total - enriched },
        }
      } catch (error) {
        console.error('Error fetching admin meta:', error)
        return { cities: [], sources: [], sports: [], addressStats: { total: 0, enriched: 0, coordinatesOnly: 0 } }
      }
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

  // Attribute operations
  attributes: {
    getPlaceAttributes: async (placeId: string): Promise<PlaceAttribute[]> => {
      const { data, error } = await supabase
        .from('place_attributes')
        .select('*')
        .eq('place_id', placeId)
      if (error) {
        console.error('Error fetching place attributes:', error)
        return []
      }
      return data ?? []
    },

    getCourtAttributes: async (courtIds: string[]): Promise<CourtAttribute[]> => {
      if (courtIds.length === 0) return []
      const { data, error } = await supabase
        .from('court_attributes')
        .select('*')
        .in('court_id', courtIds)
      if (error) {
        console.error('Error fetching court attributes:', error)
        return []
      }
      return data ?? []
    },

    /** Upsert (replace all) place attributes for a place. */
    savePlaceAttributes: async (placeId: string, attrs: Record<string, boolean>): Promise<void> => {
      // Delete existing then insert new ones that are true
      await supabase.from('place_attributes').delete().eq('place_id', placeId)
      const rows = Object.entries(attrs)
        .filter(([, v]) => v)
        .map(([key]) => ({ place_id: placeId, key, value: 'true' }))
      if (rows.length > 0) {
        await supabase.from('place_attributes').insert(rows)
      }
    },

    /** Upsert (replace all) court attributes for a list of court IDs sharing the same attribute map. */
    saveCourtAttributes: async (courtIds: string[], attrs: Record<string, boolean>): Promise<void> => {
      if (courtIds.length === 0) return
      await supabase.from('court_attributes').delete().in('court_id', courtIds)
      const rows = courtIds.flatMap(courtId =>
        Object.entries(attrs)
          .filter(([, v]) => v)
          .map(([key]) => ({ court_id: courtId, key, value: 'true' }))
      )
      if (rows.length > 0) {
        await supabase.from('court_attributes').insert(rows)
      }
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
          .from('events')
          .select(`
            *,
            profiles:creator_id ( name, avatar ),
            places:place_id ( name, latitude, longitude, street, house_number, city, postcode, district, is_event_only ),
            organizers:organizer_id ( name, color, logo_url, slug, website, instagram )
          `)
          .eq('status', 'active')
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching events:', error)
          return []
        }

        const now = new Date()
        const active = ((data || []) as any[]).filter(event => {
          const schedule = event.schedule as EventSchedule
          if (!schedule || schedule.type === 'recurring') return true
          return (schedule.dates || []).some((d: { date: string; start_time?: string }) =>
            new Date(`${d.date}T${d.start_time || '23:59'}`) > now
          )
        })

        let bookmarkedIds = new Set<string>()
        if (userId) {
          const { data: bk } = await (supabase as any)
            .from('event_bookmarks')
            .select('event_id')
            .eq('user_id', userId)
          bookmarkedIds = new Set(((bk || []) as any[]).map((b: any) => b.event_id))
        }

        return enrichEventsWithOrganizers(active.map((event: any) => mapToEventWithDetails(event, bookmarkedIds.has(event.id))))
      } catch (error) {
        console.error('Error fetching events:', error)
        return []
      }
    },

    getEvent: async (eventId: string, userId?: string): Promise<EventWithDetails | null> => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            profiles:creator_id ( name, avatar ),
            places:place_id ( name, latitude, longitude, street, house_number, city, postcode, district ),
            organizers:organizer_id ( name, color, logo_url, slug, website, instagram )
          `)
          .eq('id', eventId)
          .single()

        if (error) {
          console.error('Error fetching event:', error)
          return null
        }

        let isBookmarked = false
        if (userId) {
          const { data: bk } = await (supabase as any)
            .from('event_bookmarks')
            .select('id')
            .eq('user_id', userId)
            .eq('event_id', eventId)
            .maybeSingle()
          isBookmarked = !!bk
        }

        const events = await enrichEventsWithOrganizers([mapToEventWithDetails(data as any, isBookmarked)])
        return events[0] ?? null
      } catch (error) {
        console.error('Error fetching event:', error)
        return null
      }
    },

    getEventsByPlace: async (placeId: string, userId?: string): Promise<EventWithDetails[]> => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            profiles:creator_id ( name, avatar ),
            places:place_id ( name, latitude, longitude, street, house_number, city, postcode, district, is_event_only ),
            organizers:organizer_id ( name, color, logo_url, slug, website, instagram )
          `)
          .eq('place_id', placeId)
          .eq('status', 'active')
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching events by place:', error)
          return []
        }

        const now = new Date()
        const active = ((data || []) as any[]).filter(event => {
          const schedule = event.schedule as EventSchedule
          if (!schedule || schedule.type === 'recurring') return true
          return (schedule.dates || []).some((d: { date: string; start_time?: string }) =>
            new Date(`${d.date}T${d.start_time || '23:59'}`) > now
          )
        })

        let bookmarkedIds = new Set<string>()
        if (userId) {
          const { data: bk } = await (supabase as any)
            .from('event_bookmarks')
            .select('event_id')
            .eq('user_id', userId)
          bookmarkedIds = new Set(((bk || []) as any[]).map((b: any) => b.event_id))
        }

        return enrichEventsWithOrganizers(active.map((event: any) => mapToEventWithDetails(event, bookmarkedIds.has(event.id))))
      } catch (error) {
        console.error('Error fetching events by place:', error)
        return []
      }
    },

    getPlaceIdsWithEvents: async (): Promise<string[]> => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('place_id, schedule')
          .eq('status', 'active')
          .eq('moderation_status', 'approved')

        if (error) {
          console.error('Error fetching place IDs with events:', error)
          return []
        }

        const now = new Date()
        const active = ((data || []) as any[]).filter((e: any) => {
          if (!e.place_id) return false
          const schedule = e.schedule as EventSchedule
          if (!schedule || schedule.type === 'recurring') return true
          return (schedule.dates || []).some((d: { date: string; start_time?: string }) =>
            new Date(`${d.date}T${d.start_time || '23:59'}`) > now
          )
        })

        return [...new Set(active.map((e: any) => e.place_id as string))]
      } catch (error) {
        console.error('Error fetching place IDs with events:', error)
        return []
      }
    },

    getInlineLocationEvents: async (): Promise<PlaceMarker[]> => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, sports, inline_location')
          .eq('status', 'active')
          .eq('moderation_status', 'approved')
          .is('place_id', null)
          .not('inline_location', 'is', null)

        if (error) return []

        return ((data || []) as any[])
          .filter((e: any) => e.inline_location?.latitude && e.inline_location?.longitude)
          .map((e: any) => ({
            id: e.id,
            name: e.title,
            latitude: e.inline_location.latitude,
            longitude: e.inline_location.longitude,
            sports: e.sports ?? [],
            is_event_only: true,
          }))
      } catch {
        return []
      }
    },

    getUserEvents: async (userId: string): Promise<EventWithDetails[]> => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            profiles:creator_id ( name, avatar ),
            places:place_id ( name, latitude, longitude, street, house_number, city, postcode, district ),
            organizers:organizer_id ( name, color, logo_url, slug, website, instagram )
          `)
          .eq('creator_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching user events:', error)
          return []
        }

        return enrichEventsWithOrganizers(((data || []) as any[]).map((event: any) => mapToEventWithDetails(event, false)))
      } catch (error) {
        console.error('Error fetching user events:', error)
        return []
      }
    },

    createEvent: async (event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...event,
          updated_at: new Date().toISOString(),
        } as any)
        .select()
        .single()

      return { data: data as Event | null, error }
    },

    updateEvent: async (eventId: string, updates: Partial<Event>) => {
      const { data, error } = await supabase
        .from('events')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', eventId)
        .select()
        .single()

      return { data: data as Event | null, error }
    },

    submitUpdate: async (eventId: string, changes: Record<string, any>) => {
      const { error } = await supabase
        .from('events')
        .update({ pending_changes: changes, updated_at: new Date().toISOString() } as any)
        .eq('id', eventId)
      return { error }
    },

    getWithPendingChanges: async (): Promise<EventWithDetails[]> => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            profiles:creator_id ( name, avatar ),
            places:place_id ( name, latitude, longitude, street, house_number, city, postcode, district, is_event_only ),
            organizers:organizer_id ( name, color, logo_url, slug, website, instagram )
          `)
          .not('pending_changes', 'is', null)
          .order('updated_at', { ascending: false })
        if (error) { console.error('Error fetching events with pending changes:', error); return [] }
        return enrichEventsWithOrganizers(((data || []) as any[]).map((e: any) => mapToEventWithDetails(e, false)))
      } catch { return [] }
    },

    deleteEvent: async (eventId: string) => {
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      return { data, error }
    },

    // Admin: fetch events by moderation status
    getForAdmin: async (moderationStatus?: 'pending' | 'approved' | 'rejected'): Promise<EventWithDetails[]> => {
      try {
        let query = supabase
          .from('events')
          .select(`
            *,
            profiles:creator_id ( name, avatar ),
            places:place_id ( name, latitude, longitude, street, house_number, city, postcode, district, is_event_only ),
            organizers:organizer_id ( name, color, logo_url, slug, website, instagram )
          `)
          .order('created_at', { ascending: false })

        if (moderationStatus) {
          query = query.eq('moderation_status', moderationStatus)
        }

        const { data, error } = await query
        if (error) {
          console.error('Error fetching events for admin:', error)
          return []
        }
        return enrichEventsWithOrganizers(((data || []) as any[]).map((e: any) => mapToEventWithDetails(e, false)))
      } catch (error) {
        console.error('Error fetching events for admin (catch):', error)
        return []
      }
    },

    // Admin: approve or reject an event
    moderate: async (
      eventId: string,
      status: 'approved' | 'rejected',
      moderatedBy: string,
      rejectionReason?: string
    ) => {
      const { error } = await supabase
        .from('events')
        .update({
          moderation_status: status,
          moderated_by: moderatedBy,
          moderated_at: new Date().toISOString(),
          rejection_reason: rejectionReason ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
      return { data: null, error }
    },
  },

  // Event bookmark operations
  eventBookmarks: {
    bookmarkEvent: async (userId: string, eventId: string): Promise<void> => {
      await (supabase as any)
        .from('event_bookmarks')
        .insert({ user_id: userId, event_id: eventId })
    },

    unbookmarkEvent: async (userId: string, eventId: string): Promise<void> => {
      await (supabase as any)
        .from('event_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId)
    },

    getUserBookmarks: async (userId: string): Promise<EventWithDetails[]> => {
      try {
        const { data: bookmarks } = await (supabase as any)
          .from('event_bookmarks')
          .select('event_id')
          .eq('user_id', userId)

        if (!bookmarks || bookmarks.length === 0) return []

        const eventIds = (bookmarks as any[]).map((b: any) => b.event_id)

        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            profiles:creator_id ( name, avatar ),
            places:place_id ( name, latitude, longitude, street, house_number, city, postcode, district ),
            organizers:organizer_id ( name, color, logo_url, slug, website, instagram )
          `)
          .in('id', eventIds)

        if (error || !data) return []

        return enrichEventsWithOrganizers((data as any[]).map((event: any) => mapToEventWithDetails(event, true)))
      } catch (error) {
        console.error('Error fetching user bookmarks:', error)
        return []
      }
    },

    isBookmarked: async (userId: string, eventId: string): Promise<boolean> => {
      const { data } = await (supabase as any)
        .from('event_bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle()
      return !!data
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
              custom_sport_name,
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
        
        // console.log(`📊 getPendingPlaces returned ${data.length} pending places`)
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
              custom_sport_name,
              created_at
            ),
            profiles:added_by_user (
              name,
              avatar,
              user_role
            )
          `)
          .eq('moderation_status', status)
          .order('created_at', { ascending: false })
        
        // Use automatic pagination to get ALL places with this status
        const data = await fetchAllRecords<PlaceWithCourts>(query)
        
        // console.log(`📊 getPlacesByStatus(${status}) returned ${data.length} places`)
        return data
      } catch (error) {
        console.error('Error fetching places by status:', error)
        return []
      }
    },

    // Approve a place
    approvePlace: async (placeId: string, moderatorId: string) => {
      // console.log('🔍 Approving place:', { placeId, moderatorId })
      
      // Check current user info for debugging RLS issues
      const { data: { user } } = await supabase.auth.getUser()
      // console.log('👤 Current user for approval:', {
      //   userId: user?.id,
      //   role: user?.role,
      //   userMetadata: user?.user_metadata
      // })
      
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
      
      // console.log('📍 Found place to approve:', existingPlace)
      
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
        // console.log('✅ Place approved successfully:', data)
      }
      
      // If we get an empty array, it means the update worked but RLS prevents seeing the result
      // Let's do a separate fetch to verify the update worked
      if (!data || data.length === 0) {
        // console.log('⚠️ Update returned empty - checking if place was actually updated')
        const { data: verifyData, error: verifyError } = await supabase
          .from('places')
          .select('id, moderation_status, name')
          .eq('id', placeId)
          .single()
        
        // console.log('🔍 Verification result:', { verifyData, verifyError })
        
        // Return success with the existing place data if update worked
        return { data: { ...existingPlace, moderation_status: 'approved' }, error: null }
      }
      
      return { data: data[0], error }
    },

    // Get IDs of pending places that have no nearby place with an overlapping sport within radiusMeters.
    // includePending=true also checks other pending places (not just approved).
    // Runs as a server-side RPC to avoid downloading and comparing all places in JS.
    getIsolatedPendingIds: async (radiusMeters: number, includePending: boolean): Promise<string[]> => {
      try {
        const { data, error } = await supabase.rpc('get_isolated_pending_ids', {
          radius_meters: radiusMeters,
          include_pending: includePending,
        })

        if (error) throw error
        return (data as { id: string }[]).map(r => r.id)
      } catch (error) {
        console.error('Error fetching isolated pending IDs via RPC:', error)
        return []
      }
    },

    // Bulk delete multiple places
    bulkDeletePlaces: async (placeIds: string[]) => {
      const results = await Promise.allSettled(
        placeIds.map(async (placeId) => {
          const { error } = await supabase
            .from('places')
            .delete()
            .eq('id', placeId)
          if (error) return { placeId, success: false, error: error.message }
          return { placeId, success: true }
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success)
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
        .map(r => r.status === 'rejected' ? { placeId: 'unknown', success: false, error: r.reason } : (r as any).value)

      return {
        successful,
        failed,
        totalCount: placeIds.length,
        successCount: successful.length,
        failureCount: failed.length,
      }
    },

    // Bulk approve multiple places
    bulkApprovePlace: async (placeIds: string[], moderatorId: string) => {
      // console.log('🔍 Bulk approving places:', { placeIds, moderatorId })
      
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
          
          // console.log(`✅ Place approved successfully:`, data)
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
      
      // console.log(`📊 Bulk approval results: ${successful.length} successful, ${failed.length} failed`)
      
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
      const { data, error } = await supabase
        .from('places')
        .update({
          moderation_status: 'rejected',
          rejection_reason: reason,
          moderated_by: moderatorId,
          moderated_at: new Date().toISOString(),
        })
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
              custom_sport_name,
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
        
        // console.log(`📊 getUserPlaces returned ${data.length} places for user: ${userId}`)
        return data
      } catch (error) {
        console.error('Error fetching user places:', error)
        return []
      }
    },

    // Get moderation stats
    getModerationStats: async () => {
      const [
        pendingResult, approvedResult, rejectedResult, totalResult,
        communityEditsResult, reportsResult,
        courtsResult, withImagesResult, citiesResult,
      ] = await Promise.all([
        supabase.from('places').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
        supabase.from('places').select('id', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
        supabase.from('places').select('id', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
        supabase.from('places').select('id', { count: 'exact', head: true }),
        supabase.from('pending_place_changes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('place_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('courts').select('id', { count: 'exact', head: true }),
        supabase.from('places').select('id', { count: 'exact', head: true }).not('image_url', 'is', null),
        supabase.from('places').select('city').not('city', 'is', null),
      ])

      const uniqueCities = new Set((citiesResult.data ?? []).map((r: { city: string }) => r.city)).size

      return {
        pending: pendingResult.count || 0,
        approved: approvedResult.count || 0,
        rejected: rejectedResult.count || 0,
        community_edits: communityEditsResult.count || 0,
        reports: reportsResult.count || 0,
        total: totalResult.count || 0,
        total_courts: courtsResult.count || 0,
        with_images: withImagesResult.count || 0,
        unique_cities: uniqueCities,
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
            custom_sport_name,
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

    // Insert a place image row directly (used when creating a place with multiple images)
    insertPlaceImage: async (
      placeId: string,
      storagePath: string,
      url: string,
      isCover: boolean,
      sortOrder: number,
      uploadedBy: string | null
    ) => {
      const { error } = await (supabase as any)
        .from('place_images')
        .insert({ place_id: placeId, storage_path: storagePath, url, is_cover: isCover, sort_order: sortOrder, uploaded_by: uploadedBy })
      if (error) console.error('Failed to insert place image:', error)
    },

    // Get all approved images for a place
    getPlaceImages: async (placeId: string) => {
      const { data, error } = await (supabase as any)
        .from('place_images')
        .select('*')
        .eq('place_id', placeId)
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Error fetching place images:', error)
        return []
      }
      return data || []
    },

    // Submit a new image as a community contribution (goes through moderation)
    submitPlaceImageAdd: async (
      placeId: string,
      storagePath: string,
      url: string,
      userId: string
    ) => {
      const { data, error } = await supabase
        .from('pending_place_changes')
        .insert({
          place_id: placeId,
          submitted_by: userId,
          change_type: 'image_add',
          proposed_data: { storage_path: storagePath, url } as any,
          current_data: null,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw new Error('Failed to submit image: ' + error.message)
      return data
    },

    // Submit a place edit as community contribution
    submitPlaceImageEdit: async (placeId: string, imageUrl: string, userId: string) => {
      const currentPlace = await database.community.getPlaceForEdit(placeId)
      if (!currentPlace) throw new Error('Place not found')

      const { data, error } = await supabase
        .from('pending_place_changes')
        .insert({
          place_id: placeId,
          submitted_by: userId,
          change_type: 'update',
          proposed_data: { place: { image_url: imageUrl } },
          current_data: { place: currentPlace, courts: currentPlace.courts },
          status: 'pending'
        })
        .select()
        .single()

      return { data, error }
    },

    submitPlaceEdit: async (
      placeId: string,
      proposedData: Partial<Place>,
      courts: (Partial<Court> & { attributes?: Record<string, boolean> })[],
      userId: string,
      placeAttributes?: Record<string, boolean>,
    ) => {
      // Get current place data for comparison
      const currentPlace = await database.community.getPlaceForEdit(placeId)
      if (!currentPlace) {
        throw new Error('Place not found')
      }

      // Snapshot current attributes for the diff
      const currentPlaceAttrRows = await database.attributes.getPlaceAttributes(placeId)
      const currentCourtIds = (currentPlace.courts ?? []).map((c: any) => c.id)
      const currentCourtAttrRows = await database.attributes.getCourtAttributes(currentCourtIds)

      // Build current court attrs keyed by court id for the diff snapshot
      const currentCourtAttrsById: Record<string, Record<string, boolean>> = {}
      for (const court of currentPlace.courts ?? []) {
        const keys = currentCourtAttrRows
          .filter((r: any) => r.court_id === court.id && r.value === 'true')
          .map((r: any) => r.key)
        if (keys.length > 0) {
          const attrMap: Record<string, boolean> = {}
          for (const k of keys) attrMap[k] = true
          currentCourtAttrsById[court.id] = attrMap
        }
      }
      const currentPlaceAttrs = Object.fromEntries(
        currentPlaceAttrRows.filter((r: any) => r.value === 'true').map((r: any) => [r.key, true])
      )

      // Create the pending change record (courts include embedded attributes)
      const { data, error } = await supabase
        .from('pending_place_changes')
        .insert({
          place_id: placeId,
          submitted_by: userId,
          change_type: 'update',
          proposed_data: {
            place: proposedData,
            courts,
            place_attributes: placeAttributes ?? {},
          },
          current_data: {
            place: currentPlace,
            courts: currentPlace.courts,
            place_attributes: currentPlaceAttrs,
            court_attrs_by_id: currentCourtAttrsById,
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
        
        // console.log(`📊 getPendingPlaceChanges returned ${data.length} pending changes`)
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

      // Handle image_add: insert into place_images, sync cover
      if (change.change_type === 'image_add' && change.place_id) {
        const { storage_path, url } = proposedData

        const { data: existingImages } = await (supabase as any)
          .from('place_images')
          .select('id')
          .eq('place_id', change.place_id)

        const isCover = !existingImages || existingImages.length === 0
        const sortOrder = existingImages?.length || 0

        const { error: imageInsertError } = await (supabase as any)
          .from('place_images')
          .insert({
            place_id: change.place_id,
            storage_path,
            url,
            is_cover: isCover,
            sort_order: sortOrder,
            uploaded_by: change.submitted_by,
          })

        if (imageInsertError) {
          throw new Error('Failed to insert place image: ' + imageInsertError.message)
        }

        if (isCover) {
          await supabase
            .from('places')
            .update({ image_url: url, updated_at: new Date().toISOString() })
            .eq('id', change.place_id)
        }
      }

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

          // Insert new courts, capturing IDs for attribute assignment
          if (proposedData.courts.length > 0) {
            const { data: newCourts, error: courtsError } = await supabase
              .from('courts')
              .insert(
                proposedData.courts.map((court: any) => ({
                  place_id: change.place_id,
                  sport: court.sport,
                  surface: court.surface ?? null,
                  quantity: court.quantity ?? null,
                  notes: court.notes ?? null,
                  custom_sport_name: court.custom_sport_name ?? court.customSportName ?? null,
                }))
              )
              .select('id, sport')

            if (courtsError) {
              console.error('Failed to update courts:', courtsError)
            }

            // Apply court attributes per-court (newCourts[i] corresponds to proposedData.courts[i])
            if (newCourts && newCourts.length > 0) {
              await Promise.all(
                newCourts.map((c: any, i: number) => {
                  const attrs = proposedData.courts[i]?.attributes
                  if (attrs) return database.attributes.saveCourtAttributes([c.id], attrs)
                }).filter(Boolean)
              )
            }
          }
        }

        // Apply place attributes
        if (proposedData.place_attributes) {
          await database.attributes.savePlaceAttributes(
            change.place_id!,
            proposedData.place_attributes as Record<string, boolean>
          )
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
      // For image_add rejections, clean up the orphaned storage file
      const { data: change } = await supabase
        .from('pending_place_changes')
        .select('change_type, proposed_data')
        .eq('id', changeId)
        .single()

      if (change?.change_type === 'image_add') {
        const proposedData = change.proposed_data as any
        if (proposedData?.storage_path) {
          await supabase.storage.from('court-images').remove([proposedData.storage_path])
        }
      }

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
    },

    getUserContributions: async (userId: string) => {
      const [placesResult, editsResult] = await Promise.all([
        supabase
          .from('places')
          .select('id, name, moderation_status, created_at, rejection_reason, image_url, street, house_number, city, postcode, sports')
          .eq('added_by_user', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('pending_place_changes')
          .select('id, place_id, status, created_at, rejection_reason, change_type, proposed_data, places(name, image_url, street, house_number, city, postcode, sports)')
          .eq('submitted_by', userId)
          .in('change_type', ['update', 'image_add'])
          .order('created_at', { ascending: false }),
      ])

      return {
        submittedPlaces: placesResult.data || [],
        submittedEdits: editsResult.data || [],
      }
    }
  },

  // Favorites operations
  favorites: {
    getFavorites: async (userId: string): Promise<UserFavorite[]> => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          *,
          places (
            *,
            courts (
              id,
              place_id,
              sport,
              quantity,
              surface,
              notes,
              custom_sport_name,
              created_at
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching favorites:', error)
        return []
      }
      return data || []
    },

    addFavorite: async (userId: string, placeId: string) => {
      const { data, error } = await supabase
        .from('user_favorites')
        .insert({ user_id: userId, place_id: placeId })
        .select()
        .single()
      return { data, error }
    },

    removeFavorite: async (userId: string, placeId: string) => {
      const { data, error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId)
      return { data, error }
    },

    isFavorite: async (userId: string, placeId: string): Promise<boolean> => {
      const { data } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('place_id', placeId)
        .maybeSingle()
      return !!data
    },
  },

  // Place reports
  reports: {
    submitReport: async ({
      placeId,
      reason,
      comment,
      reporterUserId,
    }: {
      placeId: string
      reason: string
      comment?: string
      reporterUserId?: string
    }) => {
      const { error } = await supabase
        .from('place_reports')
        .insert({
          place_id: placeId,
          reason,
          comment: comment || null,
          reporter_user_id: reporterUserId || null,
        })
      if (error) throw error
    },

    getOpenReports: async () => {
      const { data, error } = await supabase
        .from('place_reports')
        .select(`
          id,
          reason,
          comment,
          status,
          created_at,
          reporter_user_id,
          places (
            id,
            name,
            place_type,
            description,
            image_url,
            latitude,
            longitude,
            street,
            house_number,
            city,
            postcode,
            district,
            county,
            state,
            country,
            contact_phone,
            contact_email,
            contact_website,
            opening_hours,
            sports,
            courts (
              id,
              sport,
              quantity,
              surface,
              notes,
              custom_sport_name
            )
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },

    dismissReport: async (reportId: string) => {
      const { error } = await supabase
        .from('place_reports')
        .update({ status: 'dismissed' })
        .eq('id', reportId)
      if (error) throw error
    },

    dismissAllReportsForPlace: async (placeId: string) => {
      const { error } = await supabase
        .from('place_reports')
        .update({ status: 'dismissed' })
        .eq('place_id', placeId)
        .eq('status', 'open')
      if (error) throw error
    },

    deleteReportedPlace: async (placeId: string) => {
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId)
      if (error) throw error
    },
  },

  admin: {
    deletePlaceImage: async (imageId: string, placeId: string): Promise<{ storagePath: string }> => {
      // Fetch the image to check cover status and get storage path
      const { data: image, error: fetchError } = await (supabase as any)
        .from('place_images')
        .select('*')
        .eq('id', imageId)
        .single()

      if (fetchError || !image) throw new Error('Image not found')

      // Delete from place_images
      const { error: deleteError } = await (supabase as any)
        .from('place_images')
        .delete()
        .eq('id', imageId)

      if (deleteError) throw new Error('Failed to delete image: ' + deleteError.message)

      // If this was the cover, promote the next image
      if (image.is_cover) {
        const { data: remaining } = await (supabase as any)
          .from('place_images')
          .select('*')
          .eq('place_id', placeId)
          .order('sort_order', { ascending: true })
          .limit(1)

        if (remaining && remaining.length > 0) {
          await (supabase as any)
            .from('place_images')
            .update({ is_cover: true })
            .eq('id', remaining[0].id)

          await supabase
            .from('places')
            .update({ image_url: remaining[0].url, updated_at: new Date().toISOString() })
            .eq('id', placeId)
        } else {
          // No images left — clear cover
          await supabase
            .from('places')
            .update({ image_url: null, updated_at: new Date().toISOString() })
            .eq('id', placeId)
        }
      }

      return { storagePath: image.storage_path }
    },
  },

  organizers: {
    getAll: async (): Promise<Organizer[]> => {
      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .order('name', { ascending: true })
      if (error) { console.error('Error fetching organizers:', error); return [] }
      return data || []
    },

    getById: async (id: string): Promise<Organizer | null> => {
      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .eq('id', id)
        .single()
      if (error) return null
      return data
    },

    getByOwner: async (userId: string): Promise<Organizer | null> => {
      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle()
      if (error) { console.error('Error fetching organizer by owner:', error); return null }
      return data
    },

    create: async (organizer: TablesInsert<'organizers'>): Promise<{ data: Organizer | null; error: any }> => {
      const { data, error } = await supabase
        .from('organizers')
        .insert(organizer)
        .select()
        .single()
      return { data, error }
    },

    update: async (id: string, updates: TablesUpdate<'organizers'>): Promise<{ data: Organizer | null; error: any }> => {
      const { data, error } = await supabase
        .from('organizers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    },

    delete: async (id: string): Promise<{ error: any }> => {
      await supabase.from('events').update({ organizer_id: null }).eq('organizer_id', id)
      const { error } = await supabase
        .from('organizers')
        .delete()
        .eq('id', id)
      return { error }
    },

    getImages: async (organizerId: string): Promise<OrganizerImage[]> => {
      const { data, error } = await supabase
        .from('organizer_images')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: true })
      if (error) { console.error('Error fetching organizer images:', error); return [] }
      return data || []
    },

    getImagesForMany: async (organizerIds: string[]): Promise<OrganizerImage[]> => {
      if (!organizerIds.length) return []
      const { data, error } = await supabase
        .from('organizer_images')
        .select('*')
        .in('organizer_id', organizerIds)
        .order('created_at', { ascending: true })
      if (error) { console.error('Error fetching organizer images:', error); return [] }
      return data || []
    },

    addImage: async (organizerId: string, url: string, storagePath?: string): Promise<{ data: OrganizerImage | null; error: any }> => {
      const { data, error } = await supabase
        .from('organizer_images')
        .insert({ organizer_id: organizerId, url, storage_path: storagePath ?? null })
        .select()
        .single()
      return { data, error }
    },

    deleteImage: async (imageId: string): Promise<{ error: any }> => {
      const { error } = await supabase
        .from('organizer_images')
        .delete()
        .eq('id', imageId)
      return { error }
    },
  },
}

export default database