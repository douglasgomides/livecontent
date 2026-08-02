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
      app_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      avatar_videos: {
        Row: {
          content_piece_id: string
          created_at: string
          error: string | null
          heygen_video_id: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          content_piece_id: string
          created_at?: string
          error?: string | null
          heygen_video_id?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          content_piece_id?: string
          created_at?: string
          error?: string | null
          heygen_video_id?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_videos_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      brains: {
        Row: {
          brain_seeded: boolean
          brand: Json
          created_at: string
          doctor: Json
          id: string
          instagram_account_id: string | null
          objections_opt_in: boolean
          onboarded: boolean
          patient: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          brain_seeded?: boolean
          brand?: Json
          created_at?: string
          doctor?: Json
          id?: string
          instagram_account_id?: string | null
          objections_opt_in?: boolean
          onboarded?: boolean
          patient?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          brain_seeded?: boolean
          brand?: Json
          created_at?: string
          doctor?: Json
          id?: string
          instagram_account_id?: string | null
          objections_opt_in?: boolean
          onboarded?: boolean
          patient?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_photos: {
        Row: {
          category: string
          created_at: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      click_behavior: {
        Row: {
          click_id: string
          cta_clicks: number
          lead_submitted: boolean
          max_scroll_pct: number | null
          time_on_page_ms: number | null
          updated_at: string
          wa_opened: boolean
        }
        Insert: {
          click_id: string
          cta_clicks?: number
          lead_submitted?: boolean
          max_scroll_pct?: number | null
          time_on_page_ms?: number | null
          updated_at?: string
          wa_opened?: boolean
        }
        Update: {
          click_id?: string
          cta_clicks?: number
          lead_submitted?: boolean
          max_scroll_pct?: number | null
          time_on_page_ms?: number | null
          updated_at?: string
          wa_opened?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "click_behavior_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: true
            referencedRelation: "link_clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      clint_mcp_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      commercial_intelligence: {
        Row: {
          argumento_recomendado_proximo_contato: string | null
          argumentos_utilizados: Json
          condicoes_comerciais: Json
          created_at: string
          dores_identificadas: Json
          houve_oferta_comercial: boolean
          id: string
          motivo_resultado: string | null
          objecoes_paciente: Json
          oportunidades_upsell: Json
          procedimentos_mencionados: string[]
          proxima_acao: string | null
          resultado: string
          resumo_comercial: string
          session_id: string
          specialty: string
          user_id: string
        }
        Insert: {
          argumento_recomendado_proximo_contato?: string | null
          argumentos_utilizados?: Json
          condicoes_comerciais?: Json
          created_at?: string
          dores_identificadas?: Json
          houve_oferta_comercial?: boolean
          id?: string
          motivo_resultado?: string | null
          objecoes_paciente?: Json
          oportunidades_upsell?: Json
          procedimentos_mencionados?: string[]
          proxima_acao?: string | null
          resultado?: string
          resumo_comercial?: string
          session_id: string
          specialty?: string
          user_id: string
        }
        Update: {
          argumento_recomendado_proximo_contato?: string | null
          argumentos_utilizados?: Json
          condicoes_comerciais?: Json
          created_at?: string
          dores_identificadas?: Json
          houve_oferta_comercial?: boolean
          id?: string
          motivo_resultado?: string | null
          objecoes_paciente?: Json
          oportunidades_upsell?: Json
          procedimentos_mencionados?: string[]
          proxima_acao?: string | null
          resultado?: string
          resumo_comercial?: string
          session_id?: string
          specialty?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_intelligence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_logs: {
        Row: {
          choices: Json
          cid: string | null
          id: string
          page_slug: string | null
          tenant_id: string
          ts: string
        }
        Insert: {
          choices?: Json
          cid?: string | null
          id?: string
          page_slug?: string | null
          tenant_id: string
          ts?: string
        }
        Update: {
          choices?: Json
          cid?: string | null
          id?: string
          page_slug?: string | null
          tenant_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          evidence_ids: Json
          external_prompts: Json | null
          format: Database["public"]["Enums"]["content_format"]
          id: string
          meta: Json | null
          reference_style_id: string | null
          rejected: boolean
          rejected_note: string | null
          rejected_reason: string | null
          session_id: string
          topic_id: string | null
          updated_at: string
          user_id: string
          virality: Json | null
        }
        Insert: {
          approved?: boolean
          artwork?: Json | null
          body?: string
          brain_signals?: Json | null
          cfm?: Json
          channel: Database["public"]["Enums"]["content_channel"]
          created_at?: string
          evidence_ids?: Json
          external_prompts?: Json | null
          format: Database["public"]["Enums"]["content_format"]
          id?: string
          meta?: Json | null
          reference_style_id?: string | null
          rejected?: boolean
          rejected_note?: string | null
          rejected_reason?: string | null
          session_id: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
          virality?: Json | null
        }
        Update: {
          approved?: boolean
          artwork?: Json | null
          body?: string
          brain_signals?: Json | null
          cfm?: Json
          channel?: Database["public"]["Enums"]["content_channel"]
          created_at?: string
          evidence_ids?: Json
          external_prompts?: Json | null
          format?: Database["public"]["Enums"]["content_format"]
          id?: string
          meta?: Json | null
          reference_style_id?: string | null
          rejected?: boolean
          rejected_note?: string | null
          rejected_reason?: string | null
          session_id?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
          virality?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_pieces_reference_style_id_fkey"
            columns: ["reference_style_id"]
            isOneToOne: false
            referencedRelation: "reference_styles"
            referencedColumns: ["id"]
          },
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
          heygen_api_key: string | null
          heygen_avatar_id: string | null
          heygen_voice_id: string | null
          preferred_formats: Json
          scheduling_link: string | null
          updated_at: string
          user_id: string
          webhooks: Json
          whatsapp_inbound_token: string | null
          whatsapp_webhook_url: string | null
        }
        Insert: {
          created_at?: string
          heygen_api_key?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          preferred_formats?: Json
          scheduling_link?: string | null
          updated_at?: string
          user_id: string
          webhooks?: Json
          whatsapp_inbound_token?: string | null
          whatsapp_webhook_url?: string | null
        }
        Update: {
          created_at?: string
          heygen_api_key?: string | null
          heygen_avatar_id?: string | null
          heygen_voice_id?: string | null
          preferred_formats?: Json
          scheduling_link?: string | null
          updated_at?: string
          user_id?: string
          webhooks?: Json
          whatsapp_inbound_token?: string | null
          whatsapp_webhook_url?: string | null
        }
        Relationships: []
      }
      domains: {
        Row: {
          created_at: string
          hostname: string
          id: string
          tenant_id: string
          verified: boolean
          verified_at: string | null
          verify_token: string
        }
        Insert: {
          created_at?: string
          hostname: string
          id?: string
          tenant_id: string
          verified?: boolean
          verified_at?: string | null
          verify_token?: string
        }
        Update: {
          created_at?: string
          hostname?: string
          id?: string
          tenant_id?: string
          verified?: boolean
          verified_at?: string | null
          verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_sources: {
        Row: {
          audio_debate_segments: Json | null
          audio_summary_path: string | null
          authors: string | null
          created_at: string
          embedding: string | null
          evidence_level: Database["public"]["Enums"]["evidence_level"]
          id: string
          journal: string | null
          pubmed_id: string | null
          source: string
          summary: string | null
          tags: Json
          title: string
          updated_at: string
          url: string | null
          user_id: string
          virality: Json | null
          year: number | null
        }
        Insert: {
          audio_debate_segments?: Json | null
          audio_summary_path?: string | null
          authors?: string | null
          created_at?: string
          embedding?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"]
          id?: string
          journal?: string | null
          pubmed_id?: string | null
          source?: string
          summary?: string | null
          tags?: Json
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
          virality?: Json | null
          year?: number | null
        }
        Update: {
          audio_debate_segments?: Json | null
          audio_summary_path?: string | null
          authors?: string | null
          created_at?: string
          embedding?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"]
          id?: string
          journal?: string | null
          pubmed_id?: string | null
          source?: string
          summary?: string | null
          tags?: Json
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          virality?: Json | null
          year?: number | null
        }
        Relationships: []
      }
      evidence_topic_updates: {
        Row: {
          found_at: string
          id: string
          source_title: string | null
          source_url: string | null
          summary: string
          title: string
          user_id: string
          virality: Json | null
          watch_id: string
        }
        Insert: {
          found_at?: string
          id?: string
          source_title?: string | null
          source_url?: string | null
          summary: string
          title: string
          user_id: string
          virality?: Json | null
          watch_id: string
        }
        Update: {
          found_at?: string
          id?: string
          source_title?: string | null
          source_url?: string | null
          summary?: string
          title?: string
          user_id?: string
          virality?: Json | null
          watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_topic_updates_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "evidence_topic_watches"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_topic_watches: {
        Row: {
          active: boolean
          created_at: string
          id: string
          last_checked_at: string | null
          topic: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          last_checked_at?: string | null
          topic: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          last_checked_at?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_captures: {
        Row: {
          contact: string
          created_at: string
          id: string
          linked_session_id: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          origin: string
          reason: string | null
          status: string
          suggested_status: string | null
          suggested_status_reason: string | null
          user_id: string
          whatsapp_consent: boolean
        }
        Insert: {
          contact: string
          created_at?: string
          id?: string
          linked_session_id?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          origin?: string
          reason?: string | null
          status?: string
          suggested_status?: string | null
          suggested_status_reason?: string | null
          user_id: string
          whatsapp_consent?: boolean
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          linked_session_id?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          origin?: string
          reason?: string | null
          status?: string
          suggested_status?: string | null
          suggested_status_reason?: string | null
          user_id?: string
          whatsapp_consent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lead_captures_linked_session_id_fkey"
            columns: ["linked_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          direction: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_captures"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          click_id: string | null
          consent: boolean
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string | null
          page_slug: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          click_id?: string | null
          consent?: boolean
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          page_slug?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          click_id?: string | null
          consent?: boolean
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          page_slug?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "link_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          cid: string | null
          device: Json
          geo: Json
          id: string
          ip_hash: string | null
          link_id: string
          referrer: string | null
          ts: string
          ua: string | null
          utm: Json
        }
        Insert: {
          cid?: string | null
          device?: Json
          geo?: Json
          id?: string
          ip_hash?: string | null
          link_id: string
          referrer?: string | null
          ts?: string
          ua?: string | null
          utm?: Json
        }
        Update: {
          cid?: string | null
          device?: Json
          geo?: Json
          id?: string
          ip_hash?: string | null
          link_id?: string
          referrer?: string | null
          ts?: string
          ua?: string | null
          utm?: Json
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      page_versions: {
        Row: {
          blocks: Json
          created_at: string
          created_by: string | null
          id: string
          page_id: string
        }
        Insert: {
          blocks: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_id: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          published_at: string | null
          seo: Json
          slug: string
          status: Database["public"]["Enums"]["page_status"]
          tenant_id: string
          theme: Json
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          published_at?: string | null
          seo?: Json
          slug: string
          status?: Database["public"]["Enums"]["page_status"]
          tenant_id: string
          theme?: Json
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          published_at?: string | null
          seo?: Json
          slug?: string
          status?: Database["public"]["Enums"]["page_status"]
          tenant_id?: string
          theme?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_signals: {
        Row: {
          action_tip: string
          category: string
          confidence: number
          created_at: string
          id: string
          kind: string
          label: string
          session_id: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          action_tip?: string
          category?: string
          confidence?: number
          created_at?: string
          id?: string
          kind?: string
          label?: string
          session_id: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          action_tip?: string
          category?: string
          confidence?: number
          created_at?: string
          id?: string
          kind?: string
          label?: string
          session_id?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_signals_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      preconsultation_responses: {
        Row: {
          answers: Json
          id: string
          linked_session_id: string | null
          patient_contact: string | null
          patient_name: string
          submitted_at: string
          user_id: string
          whatsapp_consent: boolean
        }
        Insert: {
          answers?: Json
          id?: string
          linked_session_id?: string | null
          patient_contact?: string | null
          patient_name: string
          submitted_at?: string
          user_id: string
          whatsapp_consent?: boolean
        }
        Update: {
          answers?: Json
          id?: string
          linked_session_id?: string | null
          patient_contact?: string | null
          patient_name?: string
          submitted_at?: string
          user_id?: string
          whatsapp_consent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "preconsultation_responses_linked_session_id_fkey"
            columns: ["linked_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          avg_price: number | null
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          price_range: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          avg_price?: number | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_range?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          avg_price?: number | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_range?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
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
      reference_styles: {
        Row: {
          created_at: string
          extracted_copy: string | null
          format_hint: string
          id: string
          is_default: boolean
          name: string
          source_image_path: string | null
          source_ownership: string
          source_text: string | null
          source_type: string
          structure_description: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_copy?: string | null
          format_hint?: string
          id?: string
          is_default?: boolean
          name?: string
          source_image_path?: string | null
          source_ownership?: string
          source_text?: string | null
          source_type?: string
          structure_description?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_copy?: string | null
          format_hint?: string
          id?: string
          is_default?: boolean
          name?: string
          source_image_path?: string | null
          source_ownership?: string
          source_text?: string | null
          source_type?: string
          structure_description?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          unverified_draft: boolean
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
          unverified_draft?: boolean
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
          unverified_draft?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smart_links: {
        Row: {
          archived_at: string | null
          code: string
          created_at: string
          id: string
          label: string | null
          page_slug: string | null
          target_url: string
          tenant_id: string
          utm: Json
        }
        Insert: {
          archived_at?: string | null
          code: string
          created_at?: string
          id?: string
          label?: string | null
          page_slug?: string | null
          target_url: string
          tenant_id: string
          utm?: Json
        }
        Update: {
          archived_at?: string | null
          code?: string
          created_at?: string
          id?: string
          label?: string | null
          page_slug?: string | null
          target_url?: string
          tenant_id?: string
          utm?: Json
        }
        Relationships: [
          {
            foreignKeyName: "smart_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_performance: {
        Row: {
          caption: string | null
          comments: number
          engagement: number | null
          external_media_id: string
          id: string
          likes: number
          media_type: string | null
          permalink: string | null
          platform: string
          posted_at: string | null
          reach: number | null
          saved: number | null
          shares: number | null
          synced_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments?: number
          engagement?: number | null
          external_media_id: string
          id?: string
          likes?: number
          media_type?: string | null
          permalink?: string | null
          platform?: string
          posted_at?: string | null
          reach?: number | null
          saved?: number | null
          shares?: number | null
          synced_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          comments?: number
          engagement?: number | null
          external_media_id?: string
          id?: string
          likes?: number
          media_type?: string | null
          permalink?: string | null
          platform?: string
          posted_at?: string | null
          reach?: number | null
          saved?: number | null
          shares?: number | null
          synced_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          created_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          plan: string
          primary_color: string | null
          slug: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          plan?: string
          primary_color?: string | null
          slug: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          plan?: string
          primary_color?: string | null
          slug?: string
          updated_at?: string
          whatsapp?: string | null
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
          virality: Json | null
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
          virality?: Json | null
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
          virality?: Json | null
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
      trending_content_ideas: {
        Row: {
          fetched_at: string
          id: string
          source_title: string | null
          source_url: string | null
          specialty: string
          suggested_format: string | null
          topic: string
          why_it_works: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          source_title?: string | null
          source_url?: string | null
          specialty: string
          suggested_format?: string | null
          topic: string
          why_it_works: string
        }
        Update: {
          fetched_at?: string
          id?: string
          source_title?: string | null
          source_url?: string | null
          specialty?: string
          suggested_format?: string | null
          topic?: string
          why_it_works?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_content_suggestions: {
        Row: {
          action_tip: string
          category: string
          created_at: string
          example_label: string
          id: string
          session_id: string | null
          signal_count: number
          status: string
          user_id: string
          week_start: string
        }
        Insert: {
          action_tip: string
          category: string
          created_at?: string
          example_label: string
          id?: string
          session_id?: string | null
          signal_count: number
          status?: string
          user_id: string
          week_start: string
        }
        Update: {
          action_tip?: string
          category?: string
          created_at?: string
          example_label?: string
          id?: string
          session_id?: string | null
          signal_count?: number
          status?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_content_suggestions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_followups: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          message: string
          phone: string
          preconsult_response_id: string | null
          sent_at: string | null
          session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message: string
          phone: string
          preconsult_response_id?: string | null
          sent_at?: string | null
          session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string
          phone?: string
          preconsult_response_id?: string | null
          sent_at?: string | null
          session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_followups_preconsult_response_id_fkey"
            columns: ["preconsult_response_id"]
            isOneToOne: false
            referencedRelation: "preconsultation_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_followups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pages_public: {
        Row: {
          blocks: Json | null
          id: string | null
          published_at: string | null
          seo: Json | null
          slug: string | null
          tenant_id: string | null
          tenant_logo_url: string | null
          tenant_name: string | null
          tenant_primary_color: string | null
          tenant_slug: string | null
          tenant_whatsapp: string | null
          theme: Json | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_scheduling_link: { Args: { doctor_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_app_admin: { Args: { uid: string }; Returns: boolean }
      match_evidence_sources: {
        Args: {
          match_count?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          audio_debate_segments: Json | null
          audio_summary_path: string | null
          authors: string | null
          created_at: string
          embedding: string | null
          evidence_level: Database["public"]["Enums"]["evidence_level"]
          id: string
          journal: string | null
          pubmed_id: string | null
          source: string
          summary: string | null
          tags: Json
          title: string
          updated_at: string
          url: string | null
          user_id: string
          virality: Json | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "evidence_sources"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      owns_tenant: { Args: { _tenant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      evidence_level:
        | "meta_analysis"
        | "systematic_review"
        | "rct"
        | "cohort"
        | "case_control"
        | "case_series"
        | "guideline"
        | "expert_opinion"
        | "other"
      page_status: "draft" | "published"
      plan_tier: "free" | "pro"
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
        | "tema_sugerido"
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
      subscription_status: "active" | "canceled" | "past_due" | "none"
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
      app_role: ["admin", "user"],
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
      evidence_level: [
        "meta_analysis",
        "systematic_review",
        "rct",
        "cohort",
        "case_control",
        "case_series",
        "guideline",
        "expert_opinion",
        "other",
      ],
      page_status: ["draft", "published"],
      plan_tier: ["free", "pro"],
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
        "tema_sugerido",
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
      subscription_status: ["active", "canceled", "past_due", "none"],
    },
  },
} as const
