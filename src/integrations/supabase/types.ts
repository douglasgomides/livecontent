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
      brains: {
        Row: {
          brand: Json
          created_at: string
          doctor: Json
          id: string
          onboarded: boolean
          patient: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: Json
          created_at?: string
          doctor?: Json
          id?: string
          onboarded?: boolean
          patient?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: Json
          created_at?: string
          doctor?: Json
          id?: string
          onboarded?: boolean
          patient?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_pieces: {
        Row: {
          approved: boolean
          artwork: Json | null
          body: string
          brain_signals: Json | null
          cfm: Json
          channel: Database["public"]["Enums"]["content_channel"]
          created_at: string
          external_prompts: Json | null
          format: Database["public"]["Enums"]["content_format"]
          id: string
          meta: Json | null
          rejected: boolean
          rejected_note: string | null
          rejected_reason: string | null
          session_id: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          artwork?: Json | null
          body?: string
          brain_signals?: Json | null
          cfm?: Json
          channel: Database["public"]["Enums"]["content_channel"]
          created_at?: string
          external_prompts?: Json | null
          format: Database["public"]["Enums"]["content_format"]
          id?: string
          meta?: Json | null
          rejected?: boolean
          rejected_note?: string | null
          rejected_reason?: string | null
          session_id: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          artwork?: Json | null
          body?: string
          brain_signals?: Json | null
          cfm?: Json
          channel?: Database["public"]["Enums"]["content_channel"]
          created_at?: string
          external_prompts?: Json | null
          format?: Database["public"]["Enums"]["content_format"]
          id?: string
          meta?: Json | null
          rejected?: boolean
          rejected_note?: string | null
          rejected_reason?: string | null
          session_id?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_pieces_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_pieces_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_settings: {
        Row: {
          created_at: string
          preferred_formats: Json
          updated_at: string
          user_id: string
          webhooks: Json
        }
        Insert: {
          created_at?: string
          preferred_formats?: Json
          updated_at?: string
          user_id: string
          webhooks?: Json
        }
        Update: {
          created_at?: string
          preferred_formats?: Json
          updated_at?: string
          user_id?: string
          webhooks?: Json
        }
        Relationships: []
      }
      publish_jobs: {
        Row: {
          channel: Database["public"]["Enums"]["content_channel"]
          created_at: string
          format: Database["public"]["Enums"]["content_format"]
          id: string
          message: string | null
          piece_id: string
          scheduled_at: string | null
          session_id: string
          status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["content_channel"]
          created_at?: string
          format: Database["public"]["Enums"]["content_format"]
          id?: string
          message?: string | null
          piece_id: string
          scheduled_at?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["content_channel"]
          created_at?: string
          format?: Database["public"]["Enums"]["content_format"]
          id?: string
          message?: string | null
          piece_id?: string
          scheduled_at?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_jobs_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          anonymized_transcript: string | null
          audio_path: string | null
          created_at: string
          duration_sec: number
          error_message: string | null
          id: string
          pii_findings: Json
          raw_transcript: string | null
          science: Json | null
          source: Database["public"]["Enums"]["session_source"]
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymized_transcript?: string | null
          audio_path?: string | null
          created_at?: string
          duration_sec?: number
          error_message?: string | null
          id?: string
          pii_findings?: Json
          raw_transcript?: string | null
          science?: Json | null
          source?: Database["public"]["Enums"]["session_source"]
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymized_transcript?: string | null
          audio_path?: string | null
          created_at?: string
          duration_sec?: number
          error_message?: string | null
          id?: string
          pii_findings?: Json
          raw_transcript?: string | null
          science?: Json | null
          source?: Database["public"]["Enums"]["session_source"]
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          funnel_stage: string
          id: string
          included: boolean
          position: number
          session_id: string
          summary: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          funnel_stage?: string
          id?: string
          included?: boolean
          position?: number
          session_id: string
          summary?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          funnel_stage?: string
          id?: string
          included?: boolean
          position?: number
          session_id?: string
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
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
      content_channel:
        | "instagram"
        | "linkedin"
        | "youtube"
        | "tiktok"
        | "blog"
        | "gmb"
        | "doctoralia"
        | "website"
        | "podcast"
      content_format:
        | "reel"
        | "carousel"
        | "caption"
        | "stories"
        | "linkedin"
        | "blog"
        | "youtube"
        | "tiktok"
        | "podcast"
        | "gmb"
        | "doctoralia"
        | "website"
      publish_status:
        | "queued"
        | "publishing"
        | "published"
        | "needs_connection"
        | "downloaded"
        | "failed"
      session_source:
        | "recording"
        | "upload"
        | "voice_note"
        | "science"
        | "audio_livre"
        | "link"
      session_status:
        | "recording"
        | "transcribing"
        | "anonymizing"
        | "anonymization_review"
        | "extracting_topics"
        | "topics_review"
        | "generating_content"
        | "ready"
        | "failed"
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
      content_channel: [
        "instagram",
        "linkedin",
        "youtube",
        "tiktok",
        "blog",
        "gmb",
        "doctoralia",
        "website",
        "podcast",
      ],
      content_format: [
        "reel",
        "carousel",
        "caption",
        "stories",
        "linkedin",
        "blog",
        "youtube",
        "tiktok",
        "podcast",
        "gmb",
        "doctoralia",
        "website",
      ],
      publish_status: [
        "queued",
        "publishing",
        "published",
        "needs_connection",
        "downloaded",
        "failed",
      ],
      session_source: [
        "recording",
        "upload",
        "voice_note",
        "science",
        "audio_livre",
        "link",
      ],
      session_status: [
        "recording",
        "transcribing",
        "anonymizing",
        "anonymization_review",
        "extracting_topics",
        "topics_review",
        "generating_content",
        "ready",
        "failed",
      ],
    },
  },
} as const
