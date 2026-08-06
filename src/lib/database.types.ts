export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      user_gmail_tokens: {
        Row: UserGmailToken;
        Insert: Omit<UserGmailToken, 'id' | 'created_at'>;
        Update: Partial<Omit<UserGmailToken, 'id' | 'created_at'>>;
      };
      detected_emails: {
        Row: DetectedEmail;
        Insert: Omit<DetectedEmail, 'id' | 'created_at'>;
        Update: Partial<Omit<DetectedEmail, 'id' | 'created_at'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subscription, 'id' | 'created_at' | 'updated_at'>>;
      };
      usage_signals: {
        Row: UsageSignal;
        Insert: Omit<UsageSignal, 'id' | 'created_at'>;
        Update: Partial<Omit<UsageSignal, 'id' | 'created_at'>>;
      };
      overlap_groups: {
        Row: OverlapGroup;
        Insert: Omit<OverlapGroup, 'id' | 'created_at'>;
        Update: Partial<Omit<OverlapGroup, 'id' | 'created_at'>>;
      };
      overlap_members: {
        Row: OverlapMember;
        Insert: Omit<OverlapMember, 'id' | 'created_at'>;
        Update: Partial<Omit<OverlapMember, 'id' | 'created_at'>>;
      };
      recommendations: {
        Row: Recommendation;
        Insert: Omit<Recommendation, 'id' | 'created_at'>;
        Update: Partial<Omit<Recommendation, 'id' | 'created_at'>>;
      };
      renewal_alerts: {
        Row: RenewalAlert;
        Insert: Omit<RenewalAlert, 'id' | 'created_at'>;
        Update: Partial<Omit<RenewalAlert, 'id' | 'created_at'>>;
      };
    };
  };
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  currency: string;
  created_at: string;
}

export interface UserGmailToken {
  id: string;
  user_id: string;
  provider_refresh_token: string | null;
  gmail_email: string | null;
  last_scan_at: string | null;
  created_at: string;
}

export interface DetectedEmail {
  id: string;
  user_id: string;
  gmail_message_id: string | null;
  from_address: string | null;
  subject: string | null;
  snippet: string | null;
  received_at: string | null;
  category: string;
  is_processed: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  price: number;
  currency: string;
  billing_cycle: string;
  category: string;
  status: string;
  next_billing_date: string | null;
  trial_end_date: string | null;
  detected_email_id: string | null;
  is_manually_added: boolean;
  cancellation_link: string | null;
  usage_score: number;
  usage_label: string;
  created_at: string;
  updated_at: string;
}

export interface UsageSignal {
  id: string;
  subscription_id: string;
  signal_type: string;
  detected_email_id: string | null;
  signal_date: string | null;
  signal_summary: string | null;
  created_at: string;
}

export interface OverlapGroup {
  id: string;
  user_id: string;
  category: string;
  description: string | null;
  created_at: string;
}

export interface OverlapMember {
  id: string;
  overlap_group_id: string;
  subscription_id: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  subscription_id: string | null;
  recommendation_type: string;
  title: string;
  description: string | null;
  potential_savings_monthly: number;
  potential_savings_yearly: number;
  reason_category: string;
  urgency: string;
  is_dismissed: boolean;
  rank: number;
  created_at: string;
}

export interface RenewalAlert {
  id: string;
  user_id: string;
  subscription_id: string;
  alert_type: string;
  days_before: number;
  urgency: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  scheduled_at: string | null;
}