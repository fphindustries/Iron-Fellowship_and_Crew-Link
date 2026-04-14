/**
 * Hand-authored TypeScript types matching supabase/migrations/001_initial_schema.sql
 *
 * Conventions:
 *  - All primary keys are TEXT (Firestore IDs preserved for migration)
 *  - JSONB columns are typed as Record<string, unknown> unless a tighter type is known
 *  - BYTEA columns (Tiptap/Yjs) are typed as string (base64) at the API boundary
 *  - Timestamps come back as ISO 8601 strings from PostgREST
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ---------------------------------------------------------------------------
// Row helper generics
// ---------------------------------------------------------------------------
type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type UserRow = Tables<"users">;
export type UserAccessibilitySettingsRow = Tables<"user_accessibility_settings">;
export type UserOracleSettingsRow = Tables<"user_oracle_settings">;
export type UserCustomOracleRow = Tables<"user_custom_oracles">;
export type UserCustomMoveRow = Tables<"user_custom_moves">;

export type CharacterRow = Tables<"characters">;
export type CharacterAssetRow = Tables<"character_assets">;
export type CharacterTrackRow = Tables<"character_tracks">;
export type CharacterGameLogRow = Tables<"character_game_log">;
export type CharacterNoteRow = Tables<"character_notes">;
export type CharacterNoteContentRow = Tables<"character_note_content">;
export type CharacterSettingsRow = Tables<"character_settings">;

export type CampaignRow = Tables<"campaigns">;
export type CampaignMemberRow = Tables<"campaign_members">;
export type CampaignCharacterRow = Tables<"campaign_characters">;
export type CampaignAssetRow = Tables<"campaign_assets">;
export type CampaignTrackRow = Tables<"campaign_tracks">;
export type CampaignGameLogRow = Tables<"campaign_game_log">;
export type CampaignNoteRow = Tables<"campaign_notes">;
export type CampaignNoteContentRow = Tables<"campaign_note_content">;
export type CampaignSettingsRow = Tables<"campaign_settings">;

export type SessionRow = Tables<"sessions">;
export type SessionEventRow = Tables<"session_events">;
export type CombatRow = Tables<"combats">;

export type WorldRow = Tables<"worlds">;
export type WorldAiSettingsRow = Tables<"world_ai_settings">;
export type LocationRow = Tables<"locations">;
export type LocationPublicNoteRow = Tables<"location_public_notes">;
export type LocationPrivateNoteRow = Tables<"location_private_notes">;
export type NpcRow = Tables<"npcs">;
export type NpcPublicNoteRow = Tables<"npc_public_notes">;
export type NpcPrivateNoteRow = Tables<"npc_private_notes">;
export type LoreRow = Tables<"lore">;
export type LorePublicNoteRow = Tables<"lore_public_notes">;
export type LorePrivateNoteRow = Tables<"lore_private_notes">;
export type SectorRow = Tables<"sectors">;
export type SectorPublicNoteRow = Tables<"sector_public_notes">;
export type SectorPrivateNoteRow = Tables<"sector_private_notes">;
export type SectorLocationRow = Tables<"sector_locations">;
export type SectorLocationPublicNoteRow = Tables<"sector_location_public_notes">;
export type SectorLocationPrivateNoteRow = Tables<"sector_location_private_notes">;

export type AiEventRow = Tables<"ai_events">;
export type AiRateLimitRow = Tables<"ai_rate_limits">;

export type HomebrewCollectionRow = Tables<"homebrew_collections">;
export type HomebrewEditorInviteKeyRow = Tables<"homebrew_editor_invite_keys">;
export type HomebrewStatRow = Tables<"homebrew_stats">;
export type HomebrewConditionMeterRow = Tables<"homebrew_condition_meters">;
export type HomebrewNonLinearMeterRow = Tables<"homebrew_non_linear_meters">;
export type HomebrewImpactRow = Tables<"homebrew_impacts">;
export type HomebrewLegacyTrackRow = Tables<"homebrew_legacy_tracks">;
export type HomebrewOracleTableRow = Tables<"homebrew_oracle_tables">;
export type HomebrewOracleCollectionRow = Tables<"homebrew_oracle_collections">;
export type HomebrewMoveCategoryRow = Tables<"homebrew_move_categories">;
export type HomebrewMoveRow = Tables<"homebrew_moves">;
export type HomebrewAssetCollectionRow = Tables<"homebrew_asset_collections">;
export type HomebrewAssetRow = Tables<"homebrew_assets">;

// ---------------------------------------------------------------------------
// Database schema definition
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      // -----------------------------------------------------------------------
      // Users
      // -----------------------------------------------------------------------
      users: {
        Row: {
          id: string;
          display_name: string;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          photo_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_accessibility_settings: {
        Row: {
          user_id: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_oracle_settings: {
        Row: {
          user_id: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_custom_oracles: {
        Row: {
          id: string;
          user_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_custom_moves: {
        Row: {
          id: string;
          user_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      // -----------------------------------------------------------------------
      // Characters
      // -----------------------------------------------------------------------
      characters: {
        Row: {
          id: string;
          uid: string;
          name: string;
          world_id: string | null;
          expansion_ids: string[];
          stats: Json;
          condition_meters: Json;
          special_tracks: Json;
          momentum: number;
          momentum_reset: number;
          max_momentum: number;
          debilities: Json;
          experience_spent: number;
          experience: number;
          add_experience_to_legacies: boolean;
          initiative_status: string | null;
          portrait_url: string | null;
          portrait_settings: Json | null;
          game_system: string;
          setting_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          uid: string;
          name: string;
          world_id?: string | null;
          expansion_ids?: string[];
          stats?: Json;
          condition_meters?: Json;
          special_tracks?: Json;
          momentum?: number;
          momentum_reset?: number;
          max_momentum?: number;
          debilities?: Json;
          experience_spent?: number;
          experience?: number;
          add_experience_to_legacies?: boolean;
          initiative_status?: string | null;
          portrait_url?: string | null;
          portrait_settings?: Json | null;
          game_system: string;
          setting_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          expansion_ids?: string[];
          world_id?: string | null;
          stats?: Json;
          condition_meters?: Json;
          special_tracks?: Json;
          momentum?: number;
          momentum_reset?: number;
          max_momentum?: number;
          debilities?: Json;
          experience_spent?: number;
          experience?: number;
          add_experience_to_legacies?: boolean;
          initiative_status?: string | null;
          portrait_url?: string | null;
          portrait_settings?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      character_assets: {
        Row: {
          id: string;
          character_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      character_tracks: {
        Row: {
          id: string;
          character_id: string;
          type: number;
          label: string;
          description: string | null;
          progress: number;
          difficulty: string | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          type: number;
          label: string;
          description?: string | null;
          progress?: number;
          difficulty?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          description?: string | null;
          progress?: number;
          difficulty?: string | null;
          completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      character_game_log: {
        Row: {
          id: string;
          character_id: string;
          campaign_id: string | null;
          type: number;
          roll_label: string;
          timestamp: string;
          uid: string;
          gms_only: boolean;
          data: Json;
        };
        Insert: {
          id?: string;
          character_id: string;
          campaign_id?: string | null;
          type: number;
          roll_label: string;
          timestamp?: string;
          uid: string;
          gms_only?: boolean;
          data: Json;
        };
        Update: {
          gms_only?: boolean;
          data?: Json;
        };
        Relationships: [];
      };
      character_notes: {
        Row: {
          id: string;
          character_id: string;
          title: string;
          order: number;
          shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          title: string;
          order?: number;
          shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          order?: number;
          shared?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      character_note_content: {
        Row: {
          note_id: string;
          content: string | null;
          updated_at: string;
        };
        Insert: {
          note_id: string;
          content?: string | null;
          updated_at?: string;
        };
        Update: {
          content?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      character_settings: {
        Row: {
          character_id: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          character_id: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      // -----------------------------------------------------------------------
      // Campaigns
      // -----------------------------------------------------------------------
      campaigns: {
        Row: {
          id: string;
          name: string;
          expansion_ids: string[];
          game_system: string;
          setting_key: string | null;
          world_id: string | null;
          active_session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          expansion_ids?: string[];
          game_system: string;
          setting_key?: string | null;
          world_id?: string | null;
          active_session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          world_id?: string | null;
          active_session_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_members: {
        Row: {
          campaign_id: string;
          user_id: string;
          is_gm: boolean;
        };
        Insert: {
          campaign_id: string;
          user_id: string;
          is_gm?: boolean;
        };
        Update: {
          is_gm?: boolean;
        };
        Relationships: [];
      };
      campaign_characters: {
        Row: {
          campaign_id: string;
          character_id: string;
        };
        Insert: {
          campaign_id: string;
          character_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      campaign_assets: {
        Row: {
          id: string;
          campaign_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_tracks: {
        Row: {
          id: string;
          campaign_id: string;
          type: number;
          label: string;
          description: string | null;
          progress: number;
          difficulty: string | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          type: number;
          label: string;
          description?: string | null;
          progress?: number;
          difficulty?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          description?: string | null;
          progress?: number;
          difficulty?: string | null;
          completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_game_log: {
        Row: {
          id: string;
          campaign_id: string;
          character_id: string | null;
          type: number;
          roll_label: string;
          timestamp: string;
          uid: string;
          gms_only: boolean;
          data: Json;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          character_id?: string | null;
          type: number;
          roll_label: string;
          timestamp?: string;
          uid: string;
          gms_only?: boolean;
          data: Json;
        };
        Update: {
          gms_only?: boolean;
          data?: Json;
        };
        Relationships: [];
      };
      campaign_notes: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          order: number;
          shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          order?: number;
          shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          order?: number;
          shared?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_note_content: {
        Row: {
          note_id: string;
          content: string | null;
          updated_at: string;
        };
        Insert: {
          note_id: string;
          content?: string | null;
          updated_at?: string;
        };
        Update: {
          content?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_settings: {
        Row: {
          campaign_id: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          campaign_id: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      // -----------------------------------------------------------------------
      // Sessions
      // -----------------------------------------------------------------------
      sessions: {
        Row: {
          id: string;
          campaign_id: string;
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          ended_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_events: {
        Row: {
          id: string;
          session_id: string;
          campaign_id: string;
          type: string;
          timestamp: string;
          uid: string;
          data: Json;
        };
        Insert: {
          id?: string;
          session_id: string;
          campaign_id: string;
          type: string;
          timestamp?: string;
          uid: string;
          data: Json;
        };
        Update: {
          data?: Json;
        };
        Relationships: [];
      };
      combats: {
        Row: {
          id: string;
          session_id: string;
          campaign_id: string;
          objective: string;
          enemies: string[];
          position: string;
          ended: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          campaign_id: string;
          objective: string;
          enemies?: string[];
          position?: string;
          ended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          objective?: string;
          enemies?: string[];
          position?: string;
          ended?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      // -----------------------------------------------------------------------
      // Worlds
      // -----------------------------------------------------------------------
      worlds: {
        Row: {
          id: string;
          name: string;
          setting_key: string;
          description: string | null;
          new_truths: Json | null;
          owner_ids: string[];
          campaign_guides: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          setting_key: string;
          description?: string | null;
          new_truths?: Json;
          owner_ids?: string[];
          campaign_guides?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          new_truths?: Json;
          owner_ids?: string[];
          campaign_guides?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      world_ai_settings: {
        Row: {
          world_id: string;
          provider: string;
          mode_configs: Json;
          world_tone_prompt: string | null;
          updated_at: string;
        };
        Insert: {
          world_id: string;
          provider?: string;
          mode_configs?: Json;
          world_tone_prompt?: string | null;
          updated_at?: string;
        };
        Update: {
          provider?: string;
          mode_configs?: Json;
          world_tone_prompt?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          world_id: string;
          name: string;
          type: string | null;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          name: string;
          type?: string | null;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string | null;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      location_public_notes: {
        Row: {
          location_id: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          location_id: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      location_private_notes: {
        Row: {
          location_id: string;
          gm_notes: string | null;
          fields: Json;
          updated_at: string;
        };
        Insert: {
          location_id: string;
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Update: {
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      npcs: {
        Row: {
          id: string;
          world_id: string;
          name: string;
          pronouns: string | null;
          description: string | null;
          data: Json;
          portrait_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          name: string;
          pronouns?: string | null;
          description?: string | null;
          data?: Json;
          portrait_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          pronouns?: string | null;
          description?: string | null;
          data?: Json;
          portrait_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      npc_public_notes: {
        Row: {
          npc_id: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          npc_id: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      npc_private_notes: {
        Row: {
          npc_id: string;
          gm_notes: string | null;
          fields: Json;
          updated_at: string;
        };
        Insert: {
          npc_id: string;
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Update: {
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      lore: {
        Row: {
          id: string;
          world_id: string;
          name: string;
          type: string | null;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          name: string;
          type?: string | null;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string | null;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      lore_public_notes: {
        Row: {
          lore_id: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          lore_id: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      lore_private_notes: {
        Row: {
          lore_id: string;
          gm_notes: string | null;
          fields: Json;
          updated_at: string;
        };
        Insert: {
          lore_id: string;
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Update: {
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      sectors: {
        Row: {
          id: string;
          world_id: string;
          name: string;
          shared_with_players: boolean;
          region: string | null;
          trouble: string | null;
          map: Json | null;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          name: string;
          shared_with_players?: boolean;
          region?: string | null;
          trouble?: string | null;
          map?: Json | null;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          shared_with_players?: boolean;
          region?: string | null;
          trouble?: string | null;
          map?: Json | null;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      sector_public_notes: {
        Row: {
          sector_id: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          sector_id: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sector_private_notes: {
        Row: {
          sector_id: string;
          gm_notes: string | null;
          fields: Json;
          updated_at: string;
        };
        Insert: {
          sector_id: string;
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Update: {
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      sector_locations: {
        Row: {
          id: string;
          sector_id: string;
          name: string;
          type: string | null;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sector_id: string;
          name: string;
          type?: string | null;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string | null;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      sector_location_public_notes: {
        Row: {
          sector_location_id: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          sector_location_id: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sector_location_private_notes: {
        Row: {
          sector_location_id: string;
          gm_notes: string | null;
          fields: Json;
          updated_at: string;
        };
        Insert: {
          sector_location_id: string;
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Update: {
          gm_notes?: string | null;
          fields?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      // -----------------------------------------------------------------------
      // AI
      // -----------------------------------------------------------------------
      ai_events: {
        Row: {
          id: string;
          campaign_id: string;
          type: string;
          context_snapshot: Json;
          response: Json;
          status: string;
          canonized: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          type: string;
          context_snapshot: Json;
          response: Json;
          status?: string;
          canonized?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          response?: Json;
          canonized?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_rate_limits: {
        Row: {
          user_id: string;
          request_count: number;
          window_start: string;
        };
        Insert: {
          user_id: string;
          request_count?: number;
          window_start?: string;
        };
        Update: {
          request_count?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      // -----------------------------------------------------------------------
      // Homebrew
      // -----------------------------------------------------------------------
      homebrew_collections: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          setting_key: string | null;
          owners: string[];
          editors: string[];
          viewers: string[];
          is_public: boolean;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          setting_key?: string | null;
          owners?: string[];
          editors?: string[];
          viewers?: string[];
          is_public?: boolean;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          owners?: string[];
          editors?: string[];
          viewers?: string[];
          is_public?: boolean;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_editor_invite_keys: {
        Row: {
          id: string;
          collection_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      homebrew_stats: {
        Row: {
          id: string;
          collection_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_condition_meters: {
        Row: {
          id: string;
          collection_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_non_linear_meters: {
        Row: {
          id: string;
          collection_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_impacts: {
        Row: {
          id: string;
          collection_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_legacy_tracks: {
        Row: {
          id: string;
          collection_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_oracle_tables: {
        Row: {
          id: string;
          collection_id: string;
          oracle_collection_id: string | null;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          oracle_collection_id?: string | null;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          oracle_collection_id?: string | null;
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_oracle_collections: {
        Row: {
          id: string;
          collection_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_move_categories: {
        Row: {
          id: string;
          collection_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_moves: {
        Row: {
          id: string;
          collection_id: string;
          move_category_id: string | null;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          move_category_id?: string | null;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          move_category_id?: string | null;
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_asset_collections: {
        Row: {
          id: string;
          collection_id: string;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      homebrew_assets: {
        Row: {
          id: string;
          collection_id: string;
          asset_collection_id: string | null;
          data: Json;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          asset_collection_id?: string | null;
          data: Json;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          asset_collection_id?: string | null;
          data?: Json;
          order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      update_ai_event_status: {
        Args: {
          p_event_id: string;
          p_status: string;
          p_response: Json;
        };
        Returns: void;
      };
      update_character_initiative: {
        Args: {
          p_character_id: string;
          p_status: string | null;
        };
        Returns: void;
      };
      update_world_membership: {
        Args: {
          p_world_id: string;
          p_owner_ids: string[];
          p_campaign_guides: string[];
        };
        Returns: void;
      };
      add_homebrew_viewer: {
        Args: {
          p_collection_id: string;
          p_user_id: string;
        };
        Returns: void;
      };
      add_homebrew_editor: {
        Args: {
          p_collection_id: string;
          p_user_id: string;
        };
        Returns: void;
      };
      remove_homebrew_editor: {
        Args: {
          p_collection_id: string;
          p_user_id: string;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}
