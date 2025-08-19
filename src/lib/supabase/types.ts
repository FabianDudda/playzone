export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      places: {
        Row: {
          added_by_user: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          latitude: number
          longitude: number
          name: string
          sports: Database["public"]["Enums"]["sport_type"][] | null
          source: string
          source_id: string | null
          district: string | null
          neighborhood: string | null
          area: string | null
          features: string[] | null
          import_date: string
          // Address fields from reverse geocoding
          street: string | null
          house_number: string | null
          city: string | null
          county: string | null
          state: string | null
          country: string | null
          postcode: string | null
        }
        Insert: {
          added_by_user: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          latitude: number
          longitude: number
          name: string
          sports?: Database["public"]["Enums"]["sport_type"][] | null
          source?: string
          source_id?: string | null
          district?: string | null
          neighborhood?: string | null
          area?: string | null
          features?: string[] | null
          import_date?: string
          // Address fields from reverse geocoding
          street?: string | null
          house_number?: string | null
          city?: string | null
          county?: string | null
          state?: string | null
          country?: string | null
          postcode?: string | null
        }
        Update: {
          added_by_user?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number
          longitude?: number
          name?: string
          sports?: Database["public"]["Enums"]["sport_type"][] | null
          source?: string
          source_id?: string | null
          district?: string | null
          neighborhood?: string | null
          area?: string | null
          features?: string[] | null
          import_date?: string
          // Address fields from reverse geocoding
          street?: string | null
          house_number?: string | null
          city?: string | null
          county?: string | null
          state?: string | null
          country?: string | null
          postcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_added_by_user_fkey"
            columns: ["added_by_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          id: string
          place_id: string
          sport: Database["public"]["Enums"]["sport_type"]
          quantity: number
          surface: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          place_id: string
          sport: Database["public"]["Enums"]["sport_type"]
          quantity?: number
          surface?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          place_id?: string
          sport?: Database["public"]["Enums"]["sport_type"]
          quantity?: number
          surface?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participants: {
        Row: {
          created_at: string
          elo_after: number
          elo_before: number
          elo_change: number
          id: string
          match_id: string
          team: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elo_after: number
          elo_before: number
          elo_change: number
          id?: string
          match_id: string
          team: string
          user_id: string
        }
        Update: {
          created_at?: string
          elo_after?: number
          elo_before?: number
          elo_change?: number
          id?: string
          match_id?: string
          team?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          court_id: string | null
          created_at: string
          id: string
          score: Json | null
          sport: Database["public"]["Enums"]["sport_type"]
          team_a_players: string[]
          team_b_players: string[]
          winner: Database["public"]["Enums"]["match_result"]
        }
        Insert: {
          court_id?: string | null
          created_at?: string
          id?: string
          score?: Json | null
          sport: Database["public"]["Enums"]["sport_type"]
          team_a_players: string[]
          team_b_players: string[]
          winner: Database["public"]["Enums"]["match_result"]
        }
        Update: {
          court_id?: string | null
          created_at?: string
          id?: string
          score?: Json | null
          sport?: Database["public"]["Enums"]["sport_type"]
          team_a_players?: string[]
          team_b_players?: string[]
          winner?: Database["public"]["Enums"]["match_result"]
        }
        Relationships: [
          {
            foreignKeyName: "matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          elo: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          elo?: Json
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          elo?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_elo_change: {
        Args: {
          current_elo: number
          opponent_elo: number
          won: boolean
          k_factor?: number
        }
        Returns: number
      }
      get_k_factor: {
        Args: {
          team_size: number
        }
        Returns: number
      }
      get_leaderboard: {
        Args: {
          sport_name?: string
          limit_count?: number
        }
        Returns: {
          user_id: string
          name: string
          avatar: string
          elo: number
          matches_played: number
          rank: number
        }[]
      }
    }
    Enums: {
      match_result: "team_a" | "team_b" | "draw"
      sport_type: "tennis" | "basketball" | "volleyball" | "spikeball" | "badminton" | "squash" | "pickleball"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type SportType = Database["public"]["Enums"]["sport_type"]
export type MatchResult = Database["public"]["Enums"]["match_result"]

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Place = Database["public"]["Tables"]["places"]["Row"]
export type Court = Database["public"]["Tables"]["courts"]["Row"]
export type Match = Database["public"]["Tables"]["matches"]["Row"]
export type MatchParticipant = Database["public"]["Tables"]["match_participants"]["Row"]

// Legacy type for backward compatibility (maps to Place)
export type LegacyCourt = Place

// Combined type for places with their courts
export interface PlaceWithCourts extends Place {
  courts: Court[]
}

export interface EloRatings {
  tennis: number
  basketball: number
  volleyball: number
  spikeball: number
  badminton: number
  squash: number
  pickleball: number
}

export interface LeaderboardEntry {
  user_id: string
  name: string
  avatar: string | null
  elo: number
  matches_played: number
  rank: number
}