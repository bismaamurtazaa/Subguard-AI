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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      detected_emails: {
        Row: {
          category: string | null
          created_at: string | null
          from_address: string | null
          gmail_message_id: string | null
          id: string
          is_processed: boolean | null
          received_at: string | null
          snippet: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          from_address?: string | null
          gmail_message_id?: string | null
          id?: string
          is_processed?: boolean | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          from_address?: string | null
          gmail_message_id?: string | null
          id?: string
          is_processed?: boolean | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detected_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      overlap_groups: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overlap_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      overlap_members: {
        Row: {
          created_at: string | null
          id: string
          overlap_group_id: string
          subscription_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          overlap_group_id: string
          subscription_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          overlap_group_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overlap_members_overlap_group_id_fkey"
            columns: ["overlap_group_id"]
            isOneToOne: false
            referencedRelation: "overlap_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overlap_members_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          currency: string | null
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_dismissed: boolean | null
          potential_savings_monthly: number | null
          potential_savings_yearly: number | null
          rank: number | null
          reason_category: string | null
          recommendation_type: string | null
          subscription_id: string | null
          title: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_dismissed?: boolean | null
          potential_savings_monthly?: number | null
          potential_savings_yearly?: number | null
          rank?: number | null
          reason_category?: string | null
          recommendation_type?: string | null
          subscription_id?: string | null
          title: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_dismissed?: boolean | null
          potential_savings_monthly?: number | null
          potential_savings_yearly?: number | null
          rank?: number | null
          reason_category?: string | null
          recommendation_type?: string | null
          subscription_id?: string | null
          title?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_alerts: {
        Row: {
          alert_type: string | null
          created_at: string | null
          days_before: number | null
          id: string
          is_read: boolean | null
          message: string | null
          scheduled_at: string | null
          subscription_id: string
          title: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          alert_type?: string | null
          created_at?: string | null
          days_before?: number | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          scheduled_at?: string | null
          subscription_id: string
          title: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string | null
          created_at?: string | null
          days_before?: number | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          scheduled_at?: string | null
          subscription_id?: string
          title?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_alerts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          cancellation_link: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          detected_email_id: string | null
          id: string
          is_manually_added: boolean | null
          next_billing_date: string | null
          price: number
          service_name: string
          status: string | null
          trial_end_date: string | null
          updated_at: string | null
          usage_label: string | null
          usage_score: number | null
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          cancellation_link?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          detected_email_id?: string | null
          id?: string
          is_manually_added?: boolean | null
          next_billing_date?: string | null
          price: number
          service_name: string
          status?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
          usage_label?: string | null
          usage_score?: number | null
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          cancellation_link?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          detected_email_id?: string | null
          id?: string
          is_manually_added?: boolean | null
          next_billing_date?: string | null
          price?: number
          service_name?: string
          status?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
          usage_label?: string | null
          usage_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_detected_email_id_fkey"
            columns: ["detected_email_id"]
            isOneToOne: false
            referencedRelation: "detected_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_signals: {
        Row: {
          created_at: string | null
          detected_email_id: string | null
          id: string
          signal_date: string | null
          signal_summary: string | null
          signal_type: string | null
          subscription_id: string
        }
        Insert: {
          created_at?: string | null
          detected_email_id?: string | null
          id?: string
          signal_date?: string | null
          signal_summary?: string | null
          signal_type?: string | null
          subscription_id: string
        }
        Update: {
          created_at?: string | null
          detected_email_id?: string | null
          id?: string
          signal_date?: string | null
          signal_summary?: string | null
          signal_type?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_signals_detected_email_id_fkey"
            columns: ["detected_email_id"]
            isOneToOne: false
            referencedRelation: "detected_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_signals_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gmail_tokens: {
        Row: {
          created_at: string | null
          gmail_email: string | null
          id: string
          last_scan_at: string | null
          provider_refresh_token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gmail_email?: string | null
          id?: string
          last_scan_at?: string | null
          provider_refresh_token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gmail_email?: string | null
          id?: string
          last_scan_at?: string | null
          provider_refresh_token?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gmail_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// ─── Convenience type aliases ──────────────────────────

export type Subscription = Tables<'subscriptions'>;
export type Recommendation = Tables<'recommendations'>;
export type RenewalAlert = Tables<'renewal_alerts'>;
export type OverlapGroup = Tables<'overlap_groups'>;
export type OverlapMember = Tables<'overlap_members'>;
export type UsageSignal = Tables<'usage_signals'>;