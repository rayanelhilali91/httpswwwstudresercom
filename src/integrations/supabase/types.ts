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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          artist_id: string
          created_at: string
          end_at: string
          engineer: string | null
          id: string
          room_id: string | null
          slot_id: string | null
          start_at: string
          status: string
          studio_id: string
          total_price: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          end_at: string
          engineer?: string | null
          id?: string
          room_id?: string | null
          slot_id?: string | null
          start_at: string
          status?: string
          studio_id: string
          total_price?: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          end_at?: string
          engineer?: string | null
          id?: string
          room_id?: string | null
          slot_id?: string | null
          start_at?: string
          status?: string
          studio_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "studio_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "studio_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          artist_id: string
          booking_id: string
          collected_at: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          currency: string
          gross_amount: number
          id: string
          net_amount: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          studio_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          booking_id: string
          collected_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          studio_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          booking_id?: string
          collected_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          booking_id: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          studio_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          studio_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          studio_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      studio_rooms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_booking_hours: number
          min_booking_hours: number
          name: string
          position: number
          price_per_hour: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_booking_hours?: number
          min_booking_hours?: number
          name: string
          position?: number
          price_per_hour?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_booking_hours?: number
          min_booking_hours?: number
          name?: string
          position?: number
          price_per_hour?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_rooms_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_slots: {
        Row: {
          created_at: string
          end_at: string
          id: string
          is_booked: boolean
          room_id: string | null
          start_at: string
          studio_id: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          is_booked?: boolean
          room_id?: string | null
          start_at: string
          studio_id: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          is_booked?: boolean
          room_id?: string | null
          start_at?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_slots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "studio_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_slots_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          engineers: string[]
          equipment: string[] | null
          gallery: Json | null
          genres: string[] | null
          id: string
          image_url: string | null
          instagram_url: string | null
          is_paused: boolean
          is_published: boolean
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          max_booking_hours: number
          min_booking_hours: number
          name: string
          owner_id: string
          price_per_hour: number | null
          snapchat_url: string | null
          tagline: string | null
          tiktok_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          engineers?: string[]
          equipment?: string[] | null
          gallery?: Json | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_paused?: boolean
          is_published?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number
          min_booking_hours?: number
          name: string
          owner_id: string
          price_per_hour?: number | null
          snapchat_url?: string | null
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          engineers?: string[]
          equipment?: string[] | null
          gallery?: Json | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_paused?: boolean
          is_published?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number
          min_booking_hours?: number
          name?: string
          owner_id?: string
          price_per_hour?: number | null
          snapchat_url?: string | null
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_artist_bookings: {
        Args: { _artist_id: string }
        Returns: {
          booking_id: string
          created_at: string
          end_at: string
          hours: number
          start_at: string
          status: string
          studio_id: string
          studio_name: string
          total_price: number
        }[]
      }
      admin_get_artists_stats: {
        Args: never
        Returns: {
          artist_id: string
          created_at: string
          display_name: string
          total_bookings: number
          total_hours: number
          total_spent: number
        }[]
      }
      admin_get_studios_stats: {
        Args: never
        Returns: {
          city: string
          country: string
          created_at: string
          is_paused: boolean
          is_published: boolean
          is_verified: boolean
          owner_id: string
          owner_name: string
          studio_id: string
          studio_name: string
          total_bookings: number
          total_commission: number
          total_revenue: number
        }[]
      }
      finalize_past_bookings: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "artist" | "studio"
      app_role: "artist" | "studio" | "admin"
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
      account_type: ["artist", "studio"],
      app_role: ["artist", "studio", "admin"],
    },
  },
} as const
