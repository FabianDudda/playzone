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
      court_attributes: {
        Row: {
          court_id: string
          key: string
          value: string
        }
        Insert: {
          court_id: string
          key: string
          value: string
        }
        Update: {
          court_id?: string
          key?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_attributes_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      place_attributes: {
        Row: {
          place_id: string
          key: string
          value: string
        }
        Insert: {
          place_id: string
          key: string
          value: string
        }
        Update: {
          place_id?: string
          key?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_attributes_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          color: string | null
          website: string | null
          instagram: string | null
          email: string | null
          phone: string | null
          owner_id: string | null
          verified: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          color?: string | null
          website?: string | null
          instagram?: string | null
          email?: string | null
          phone?: string | null
          owner_id?: string | null
          verified?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          color?: string | null
          website?: string | null
          instagram?: string | null
          email?: string | null
          phone?: string | null
          owner_id?: string | null
          verified?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_images: {
        Row: {
          id: string
          organizer_id: string
          url: string
          storage_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organizer_id: string
          url: string
          storage_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organizer_id?: string
          url?: string
          storage_path?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_images_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          created_at: string | null
          custom_sport_name: string | null
          id: string
          notes: string | null
          place_id: string
          quantity: number | null
          sport: Database["public"]["Enums"]["sport_type"]
          surface: string | null
        }
        Insert: {
          created_at?: string | null
          custom_sport_name?: string | null
          id?: string
          notes?: string | null
          place_id: string
          quantity?: number | null
          sport: Database["public"]["Enums"]["sport_type"]
          surface?: string | null
        }
        Update: {
          created_at?: string | null
          custom_sport_name?: string | null
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
          place_id: string | null
          sports: Database["public"]["Enums"]["sport_type"][]
          event_type: string
          schedule: Json
          contact: Json
          image_url: string | null
          creator_id: string | null
          status: string
          organizer_id: string | null
          organizer_ids: string[]
          moderation_status: 'pending' | 'approved' | 'rejected'
          moderated_by: string | null
          moderated_at: string | null
          rejection_reason: string | null
          is_guest_submission: boolean
          guest_ip: string | null
          inline_location: Json | null
          location_type: string | null
          age_restriction: Json | null
          gender_restriction: string | null
          pending_changes: Json | null
        }
        Insert: {
          created_at?: string
          updated_at?: string
          id?: string
          title: string
          description?: string | null
          place_id?: string | null
          sports: Database["public"]["Enums"]["sport_type"][]
          event_type?: string
          schedule: Json
          contact?: Json
          image_url?: string | null
          creator_id?: string | null
          status?: string
          organizer_id?: string | null
          organizer_ids?: string[]
          moderation_status?: 'pending' | 'approved' | 'rejected'
          moderated_by?: string | null
          moderated_at?: string | null
          rejection_reason?: string | null
          is_guest_submission?: boolean
          guest_ip?: string | null
          inline_location?: Json | null
          location_type?: string | null
          age_restriction?: Json | null
          gender_restriction?: string | null
          pending_changes?: Json | null
        }
        Update: {
          created_at?: string
          updated_at?: string
          id?: string
          title?: string
          description?: string | null
          place_id?: string | null
          sports?: Database["public"]["Enums"]["sport_type"][]
          event_type?: string
          schedule?: Json
          contact?: Json
          image_url?: string | null
          creator_id?: string | null
          status?: string
          organizer_id?: string | null
          organizer_ids?: string[]
          moderation_status?: 'pending' | 'approved' | 'rejected'
          moderated_by?: string | null
          moderated_at?: string | null
          rejection_reason?: string | null
          is_guest_submission?: boolean
          guest_ip?: string | null
          inline_location?: Json | null
          location_type?: string | null
          age_restriction?: Json | null
          gender_restriction?: string | null
          pending_changes?: Json | null
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
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_bookmarks: {
        Row: {
          id: string
          user_id: string
          event_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bookmarks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bookmarks_user_id_fkey"
            columns: ["user_id"]
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
          extra_participants_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          event_id: string
          user_id: string
          extra_participants_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          event_id?: string
          user_id?: string
          extra_participants_count?: number
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
          guest_ip: string | null
          is_guest_submission: boolean
          current_data: Json | null
          id: string
          place_id: string | null
          proposed_data: Json
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["moderation_status"]
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          change_type: Database["public"]["Enums"]["place_change_type"]
          created_at?: string
          current_data?: Json | null
          guest_ip?: string | null
          id?: string
          is_guest_submission?: boolean
          place_id?: string | null
          proposed_data: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          change_type?: Database["public"]["Enums"]["place_change_type"]
          created_at?: string
          current_data?: Json | null
          guest_ip?: string | null
          id?: string
          is_guest_submission?: boolean
          place_id?: string | null
          proposed_data?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          submitted_by?: string | null
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
          added_by_user: string | null
          city: string | null
          country: string | null
          county: string | null
          created_at: string
          description: string | null
          district: string | null
          features: string[] | null
          guest_ip: string | null
          house_number: string | null
          id: string
          image_url: string | null
          import_date: string | null
          is_guest_submission: boolean
          latitude: number
          longitude: number
          moderated_at: string | null
          moderated_by: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          name: string
          place_type: string
          postcode: string | null
          rejection_reason: string | null
          source: string
          source_id: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_website: string | null
          opening_hours: Json | null
          sports: Database["public"]["Enums"]["sport_type"][] | null
          state: string | null
          street: string | null
          updated_at: string | null
          organizer_id: string | null
          is_event_only: boolean
        }
        Insert: {
          added_by_user?: string | null
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          features?: string[] | null
          guest_ip?: string | null
          house_number?: string | null
          id?: string
          image_url?: string | null
          import_date?: string | null
          is_guest_submission?: boolean
          latitude: number
          longitude: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          name: string
          place_type?: string
          postcode?: string | null
          rejection_reason?: string | null
          source?: string
          source_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          opening_hours?: Json | null
          sports?: Database["public"]["Enums"]["sport_type"][] | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          organizer_id?: string | null
          is_event_only?: boolean
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
          guest_ip?: string | null
          house_number?: string | null
          id?: string
          image_url?: string | null
          import_date?: string | null
          is_guest_submission?: boolean
          latitude?: number
          longitude?: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          name?: string
          place_type?: string
          postcode?: string | null
          rejection_reason?: string | null
          source?: string
          source_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          opening_hours?: Json | null
          sports?: Database["public"]["Enums"]["sport_type"][] | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          organizer_id?: string | null
          is_event_only?: boolean
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
            foreignKeyName: "places_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
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
      place_change_type: "create" | "update" | "delete" | "image_add"
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
        | "calisthenics"
        | "laufen"
        | "schwimmen"
        | "klettern"
        | "padel"
        | "schach"
        | "parkour"
        | "rugby"
        | "inliner"
        | "discgolf"
        | "bmx"
        | "dirtbike"
        | "pumptrack"
        | "other"
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
      place_change_type: ["create", "update", "delete", "image_add"],
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
        "calisthenics",
        "laufen",
        "schwimmen",
        "klettern",
        "padel",
        "schach",
        "parkour",
        "rugby",
        "inliner",
        "discgolf",
        "bmx",
        "dirtbike",
        "pumptrack",
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
export type EventBookmark = Tables<'event_bookmarks'>
export type PlaceAttribute = Tables<'place_attributes'>
export type CourtAttribute = Tables<'court_attributes'>
export type Organizer = Tables<'organizers'>

// Enum types
export type SportType = Enums<'sport_type'>
export type MatchResult = Enums<'match_result'>
export type ModerationStatus = Enums<'moderation_status'>
export type PlaceChangeType = Enums<'place_change_type'>

// Event schedule types
export type EventType = 'session' | 'pickup' | 'tournament'

export interface ScheduleSlot {
  date: string
  start_time: string
  end_time?: string | null
}

export interface RecurringSlot {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string
  end_time?: string | null
}

export type EventSchedule =
  | { type: 'once'; dates: ScheduleSlot[] }
  | { type: 'dates'; dates: ScheduleSlot[] }
  | { type: 'recurring'; slots: RecurringSlot[] }

export interface EventContact {
  name?: string
  email?: string
  phone?: string
  instagram?: string
  website?: string
}

export type LocationType = 'indoor' | 'outdoor' | 'both'
export type GenderRestriction = 'all' | 'male' | 'female'
export interface AgeRestriction {
  type: 'all' | 'min' | 'range'
  min?: number
  max?: number
}

export interface InlineLocation {
  name: string
  latitude: number
  longitude: number
  street?: string | null
  house_number?: string | null
  postcode?: string | null
  city?: string | null
  district?: string | null
  county?: string | null
  state?: string | null
  country?: string | null
}

export interface Event {
  id: string
  created_at: string
  updated_at: string
  title: string
  description: string | null
  event_type: EventType
  place_id: string | null
  sports: SportType[]
  schedule: EventSchedule
  contact: EventContact
  image_url: string | null
  creator_id: string | null
  status: 'active' | 'cancelled' | 'archived'
  organizer_id: string | null
  organizer_ids?: string[]
  inline_location?: InlineLocation | null
  location_type?: LocationType | null
  age_restriction?: AgeRestriction | null
  gender_restriction?: GenderRestriction | null
  is_guest_submission?: boolean
  guest_ip?: string | null
  moderation_status?: 'pending' | 'approved' | 'rejected'
  moderated_by?: string | null
  moderated_at?: string | null
  rejection_reason?: string | null
}

// Composite types

// Lightweight type for map markers — only the fields needed to render a pin
export interface PlaceMarker {
  id: string
  name: string
  latitude: number
  longitude: number
  sports: string[] | null
  place_type?: string | null
  city?: string | null
  organizer_id?: string | null
  organizer?: Pick<Organizer, 'name' | 'color' | 'logo_url' | 'slug'> | null
  is_event_only?: boolean
}

export interface PlaceWithCourts extends Place {
  courts?: Court[]
  profiles?: Pick<Profile, 'name' | 'avatar' | 'user_role'>
}

export interface DayHours {
  closed: boolean
  open?: string   // "09:00"
  close?: string  // "21:00"
}

export interface OpeningHours {
  monday?: DayHours
  tuesday?: DayHours
  wednesday?: DayHours
  thursday?: DayHours
  friday?: DayHours
  saturday?: DayHours
  sunday?: DayHours
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

export interface UserFavorite {
  id: string
  user_id: string
  place_id: string
  created_at: string
  places?: PlaceWithCourts
}

export interface Feedback {
  id: string
  created_at: string
  category: 'bug' | 'feature' | 'other'
  message: string
  user_id: string | null
  email: string | null
}

export interface OrganizerSummary {
  id: string
  name: string
  color: string | null
  logo_url: string | null
  website: string | null
  instagram: string | null
  email: string | null
  phone: string | null
}

export interface OrganizerImage {
  id: string
  organizer_id: string
  url: string
  storage_path: string | null
  created_at: string
}

export interface EventForSearch {
  id: string
  title: string
  sports: string[]
  schedule: EventSchedule
  place_id: string | null
  place_name: string | null
  place_city: string | null
  place_latitude: number | null
  place_longitude: number | null
  inline_location: InlineLocation | null
  is_bookmarked: boolean
}

export interface GeocodingResult {
  id: string
  shortName: string
  subtitle: string
  lat: number
  lng: number
  zoom: number
}

export interface EventWithDetails extends Event {
  creator_name: string
  creator_avatar: string | null
  place_name: string
  place_latitude: number
  place_longitude: number
  place_street: string | null
  place_house_number: string | null
  place_city: string | null
  place_postcode: string | null
  place_district: string | null
  inline_location: InlineLocation | null
  location_type: LocationType | null
  age_restriction: AgeRestriction | null
  gender_restriction: GenderRestriction | null
  is_bookmarked: boolean
  organizer_ids: string[]
  organizer_name: string | null
  organizer_color: string | null
  organizer_logo_url: string | null
  organizer_slug: string | null
  organizer_website: string | null
  organizer_instagram: string | null
  place_is_event_only: boolean
  creator_email: string | null
  event_organizers: OrganizerSummary[]
  // Moderation fields guaranteed to be present when reading from DB
  moderation_status: 'pending' | 'approved' | 'rejected'
  moderated_by: string | null
  moderated_at: string | null
  rejection_reason: string | null
  pending_changes: Record<string, any> | null
}

export interface Area {
  id: string
  slug: string
  name: string
  description: string | null
  min_lat: number
  max_lat: number
  min_lng: number
  max_lng: number
  is_active: boolean
  created_at: string
}

export interface PlaceImage {
  id: string
  place_id: string
  storage_path: string
  url: string
  is_cover: boolean
  sort_order: number
  uploaded_by: string | null
  created_at: string
}
