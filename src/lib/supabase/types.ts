export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      courts: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          place_id: string
          quantity: number | null
          sport: Database["public"]["Enums"]["sport_type"]
          surface: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          place_id: string
          quantity?: number | null
          sport: Database["public"]["Enums"]["sport_type"]
          surface?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          place_id?: string
          quantity?: number | null
          sport?: Database["public"]["Enums"]["sport_type"]
          surface?: string | null
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
      events: {
        Row: {
          created_at: string
          updated_at: string
          id: string
          title: string
          description: string | null
          place_id: string
          sport: Database["public"]["Enums"]["sport_type"]
          event_date: string
          event_time: string
          min_players: number
          max_players: number
          skill_level: Database["public"]["Enums"]["skill_level"]
          creator_id: string
          status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          created_at?: string
          updated_at?: string
          id?: string
          title: string
          description?: string | null
          place_id: string
          sport: Database["public"]["Enums"]["sport_type"]
          event_date: string
          event_time: string
          min_players?: number
          max_players?: number
          skill_level?: Database["public"]["Enums"]["skill_level"]
          creator_id: string
          status?: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          created_at?: string
          updated_at?: string
          id?: string
          title?: string
          description?: string | null
          place_id?: string
          sport?: Database["public"]["Enums"]["sport_type"]
          event_date?: string
          event_time?: string
          min_players?: number
          max_players?: number
          skill_level?: Database["public"]["Enums"]["skill_level"]
          creator_id?: string
          status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "events_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          id: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          place_id: string | null
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
          place_id?: string | null
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
          place_id?: string | null
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
          {
            foreignKeyName: "matches_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_place_changes: {
        Row: {
          change_type: Database["public"]["Enums"]["place_change_type"]
          created_at: string
          current_data: Json | null
          id: string
          place_id: string | null
          proposed_data: Json
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["moderation_status"]
          submitted_by: string
          updated_at: string
        }
        Insert: {
          change_type: Database["public"]["Enums"]["place_change_type"]
          created_at?: string
          current_data?: Json | null
          id?: string
          place_id?: string | null
          proposed_data: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          submitted_by: string
          updated_at?: string
        }
        Update: {
          change_type?: Database["public"]["Enums"]["place_change_type"]
          created_at?: string
          current_data?: Json | null
          id?: string
          place_id?: string | null
          proposed_data?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_place_changes_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_place_changes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_place_changes_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          added_by_user: string
          city: string | null
          country: string | null
          county: string | null
          created_at: string
          description: string | null
          district: string | null
          features: string[] | null
          house_number: string | null
          id: string
          image_url: string | null
          import_date: string | null
          latitude: number
          longitude: number
          moderated_at: string | null
          moderated_by: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          name: string
          postcode: string | null
          rejection_reason: string | null
          source: string
          source_id: string | null
          sports: Database["public"]["Enums"]["sport_type"][] | null
          state: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          added_by_user: string
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          features?: string[] | null
          house_number?: string | null
          id?: string
          image_url?: string | null
          import_date?: string | null
          latitude: number
          longitude: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          name: string
          postcode?: string | null
          rejection_reason?: string | null
          source?: string
          source_id?: string | null
          sports?: Database["public"]["Enums"]["sport_type"][] | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          added_by_user?: string
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          features?: string[] | null
          house_number?: string | null
          id?: string
          image_url?: string | null
          import_date?: string | null
          latitude?: number
          longitude?: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          name?: string
          postcode?: string | null
          rejection_reason?: string | null
          source?: string
          source_id?: string | null
          sports?: Database["public"]["Enums"]["sport_type"][] | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courts_added_by_user_fkey"
            columns: ["added_by_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          user_role: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          elo?: Json
          id: string
          name: string
          updated_at?: string
          user_role?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          elo?: Json
          id?: string
          name?: string
          updated_at?: string
          user_role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_elo_change: {
        Args: {
          current_elo: number
          k_factor?: number
          opponent_elo: number
          won: boolean
        }
        Returns: number
      }
      cube: {
        Args: { "": number[] } | { "": number }
        Returns: unknown
      }
      cube_dim: {
        Args: { "": unknown }
        Returns: number
      }
      cube_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      cube_is_point: {
        Args: { "": unknown }
        Returns: boolean
      }
      cube_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      cube_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      cube_send: {
        Args: { "": unknown }
        Returns: string
      }
      cube_size: {
        Args: { "": unknown }
        Returns: number
      }
      earth: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      gc_to_sec: {
        Args: { "": number }
        Returns: number
      }
      get_k_factor: {
        Args: { team_size: number }
        Returns: number
      }
      get_leaderboard: {
        Args: { limit_count?: number; sport_name?: string }
        Returns: {
          avatar: string
          elo: number
          matches_played: number
          name: string
          rank: number
          user_id: string
        }[]
      }
      latitude: {
        Args: { "": unknown }
        Returns: number
      }
      longitude: {
        Args: { "": unknown }
        Returns: number
      }
      sec_to_gc: {
        Args: { "": number }
        Returns: number
      }
    }
    Enums: {
      event_status: "active" | "cancelled" | "full" | "completed"
      match_result: "team_a" | "team_b" | "draw"
      moderation_status: "pending" | "approved" | "rejected"
      place_change_type: "create" | "update" | "delete"
      skill_level: "beginner" | "intermediate" | "advanced" | "any"
      sport_type:
        | "tennis"
        | "basketball"
        | "volleyball"
        | "spikeball"
        | "badminton"
        | "squash"
        | "hockey"
        | "fußball"
        | "tischtennis"
        | "beachvolleyball"
        | "boule"
        | "skatepark"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_status: ["active", "cancelled", "full", "completed"],
      match_result: ["team_a", "team_b", "draw"],
      moderation_status: ["pending", "approved", "rejected"],
      place_change_type: ["create", "update", "delete"],
      skill_level: ["beginner", "intermediate", "advanced", "any"],
      sport_type: [
        "tennis",
        "basketball",
        "volleyball",
        "spikeball",
        "badminton",
        "squash",
        "hockey",
        "fußball",
        "tischtennis",
        "beachvolleyball",
        "boule",
        "skatepark",
      ],
    },
  },
} as const

// Convenience type aliases for database tables
export type Profile = Tables<'profiles'>
export type Place = Tables<'places'>
export type Court = Tables<'courts'>
export type Match = Tables<'matches'>
export type MatchParticipant = Tables<'match_participants'>
export type PendingPlaceChange = Tables<'pending_place_changes'>
export type Event = Tables<'events'>
export type EventParticipant = Tables<'event_participants'>

// Enum types
export type SportType = Enums<'sport_type'>
export type MatchResult = Enums<'match_result'>
export type ModerationStatus = Enums<'moderation_status'>
export type PlaceChangeType = Enums<'place_change_type'>
export type EventStatus = Enums<'event_status'>
export type SkillLevel = Enums<'skill_level'>

// Composite types
export interface PlaceWithCourts extends Place {
  courts?: Court[]
  profiles?: Pick<Profile, 'name' | 'avatar'>
}

export interface LegacyCourt extends Place {
  sport: SportType
  quantity: number
  surface?: string
  notes?: string
}

export interface LeaderboardEntry {
  user_id: string
  name: string
  avatar: string | null
  elo: number
  matches_played: number
  rank: number
}

export interface EventWithDetails extends Event {
  participant_count: number
  user_joined: boolean
  creator_name: string
  creator_avatar: string | null
  place_name: string
  place_latitude: number
  place_longitude: number
  participants?: EventParticipant[]
  place?: PlaceWithCourts
  creator?: Pick<Profile, 'name' | 'avatar'>
}
