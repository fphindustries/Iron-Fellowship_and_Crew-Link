-- =============================================================================
-- 001_initial_schema.sql
-- Iron Fellowship & Crew Link — Initial PostgreSQL Schema
-- Migrated from Firebase Firestore
--
-- Design decisions:
--   - All PKs are TEXT to preserve Firestore document IDs during migration
--   - Subcollections become separate tables with FK to parent
--   - Union/discriminated types use a `type` column + JSONB `data` for type-specific fields
--   - Flexible maps (stats, debilities, etc.) stored as JSONB
--   - Tiptap/Yjs binary content stored as BYTEA in separate *_notes tables
--   - campaign.users[] + gmIds[] → campaign_members join table
--   - worlds.ownerIds[] + campaignGuides[] stay as TEXT[] with GIN indexes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- UTILITY: auto-updated updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- USERS
-- Mirrors Firebase Auth user profile + UserDocument Firestore doc
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id                TEXT PRIMARY KEY,    -- Firebase UID (preserved) or Supabase auth.users.id
  display_name      TEXT NOT NULL DEFAULT 'Unknown User',
  photo_url         TEXT,
  hide_photo        BOOLEAN NOT NULL DEFAULT false,
  app_version       TEXT,
  layout            JSONB,               -- { referenceSidebarLocation?: string }
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- User accessibility settings (was users/{uid}/settings/accessibility)
CREATE TABLE public.user_accessibility_settings (
  user_id               TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  verbose_roll_results  BOOLEAN NOT NULL DEFAULT false,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER user_accessibility_settings_updated_at BEFORE UPDATE ON public.user_accessibility_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- User oracle settings (was users/{uid}/settings/oracle)
CREATE TABLE public.user_oracle_settings (
  user_id                  TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  pinned_oracle_sections   JSONB NOT NULL DEFAULT '{}',  -- { [key]: boolean }
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER user_oracle_settings_updated_at BEFORE UPDATE ON public.user_oracle_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Custom oracles (was users/{uid}/custom-oracles/custom-oracles — single document per user)
CREATE TABLE public.user_custom_oracles (
  user_id       TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  oracles       JSONB NOT NULL DEFAULT '{}',         -- { [oracleId]: StoredOracle }
  oracle_order  TEXT[] NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER user_custom_oracles_updated_at BEFORE UPDATE ON public.user_custom_oracles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Custom moves (was users/{uid}/custom-moves/custom-moves — single document per user)
CREATE TABLE public.user_custom_moves (
  user_id     TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  moves       JSONB NOT NULL DEFAULT '{}',           -- { [moveId]: StoredMove }
  move_order  TEXT[] NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER user_custom_moves_updated_at BEFORE UPDATE ON public.user_custom_moves
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AI rate limit (was users/{uid}/ai-rate-limit — server-side write only)
CREATE TABLE public.ai_rate_limits (
  user_id     TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER ai_rate_limits_updated_at BEFORE UPDATE ON public.ai_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- WORLDS
-- Must be created before campaigns/characters because they reference it
-- ---------------------------------------------------------------------------
CREATE TABLE public.worlds (
  id                    TEXT PRIMARY KEY,
  setting_key           TEXT NOT NULL,                   -- 'ironsworn' | 'starforged'
  name                  TEXT NOT NULL,
  world_description     BYTEA,                           -- Tiptap/Yjs binary
  new_truths            JSONB,                           -- Record<string, Truth>
  owner_ids             TEXT[] NOT NULL DEFAULT '{}',
  campaign_guides       TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER worlds_updated_at BEFORE UPDATE ON public.worlds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX worlds_owner_ids_gin ON public.worlds USING GIN (owner_ids);
CREATE INDEX worlds_campaign_guides_gin ON public.worlds USING GIN (campaign_guides);

-- World AI settings (was worlds/{id}/settings/ai-prompts)
CREATE TABLE public.world_ai_settings (
  world_id                TEXT PRIMARY KEY REFERENCES public.worlds(id) ON DELETE CASCADE,
  provider                TEXT NOT NULL DEFAULT 'anthropic',   -- 'anthropic' | 'openai'
  world_tone_prompt       TEXT,
  assumptions             TEXT,
  portrait_style_anchor   TEXT,
  mode_configs            JSONB,   -- Partial<Record<AiMode, WorldAiModeConfig>>
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER world_ai_settings_updated_at BEFORE UPDATE ON public.world_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- CAMPAIGNS
-- ---------------------------------------------------------------------------
CREATE TABLE public.campaigns (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  world_id          TEXT REFERENCES public.worlds(id) ON DELETE SET NULL,
  expansion_ids     TEXT[] NOT NULL DEFAULT '{}',
  custom_tracks     JSONB NOT NULL DEFAULT '{}',     -- Record<string, number>
  condition_meters  JSONB NOT NULL DEFAULT '{}',     -- Record<string, number>
  special_tracks    JSONB NOT NULL DEFAULT '{}',     -- Record<string, LegacyTrack>
  type              TEXT,                             -- 'solo' | 'co-op' | 'guided'
  theme             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campaign members — replaces campaigns.users[] and campaigns.gmIds[]
-- (was implicit in CampaignDocument.users and CampaignDocument.gmIds)
CREATE TABLE public.campaign_members (
  campaign_id   TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_gm         BOOLEAN NOT NULL DEFAULT false,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);
CREATE INDEX campaign_members_user_id_idx ON public.campaign_members (user_id);

-- ---------------------------------------------------------------------------
-- CHARACTERS
-- ---------------------------------------------------------------------------
CREATE TABLE public.characters (
  id                  TEXT PRIMARY KEY,
  uid                 TEXT NOT NULL REFERENCES public.users(id),
  campaign_id         TEXT REFERENCES public.campaigns(id) ON DELETE SET NULL,
  world_id            TEXT REFERENCES public.worlds(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  stats               JSONB NOT NULL DEFAULT '{}',       -- Record<string, number>
  condition_meters    JSONB NOT NULL DEFAULT '{}',       -- Record<string, number>
  initiative_status   TEXT,                              -- 'initiative' | 'noInitiative' | 'outOfCombat'
  momentum            INTEGER NOT NULL DEFAULT 0,
  special_tracks      JSONB NOT NULL DEFAULT '{}',       -- Record<string, SpecialTrack>
  experience          JSONB,                             -- { earned?: number; spent?: number }
  debilities          JSONB NOT NULL DEFAULT '{}',       -- Record<string, boolean>
  adds                INTEGER,
  profile_image       JSONB,                             -- { filename, position: {x,y}, scale }
  expansion_ids       TEXT[] NOT NULL DEFAULT '{}',
  custom_tracks       JSONB NOT NULL DEFAULT '{}',       -- Record<string, number>
  theme               TEXT,
  backstory           TEXT,
  pronouns            TEXT,
  callsign            TEXT,
  characteristics     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER characters_updated_at BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX characters_uid_idx ON public.characters (uid);
CREATE INDEX characters_campaign_id_idx ON public.characters (campaign_id);
CREATE INDEX characters_world_id_idx ON public.characters (world_id);

-- Campaign characters — replaces campaigns.characters[] array
CREATE TABLE public.campaign_characters (
  campaign_id   TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_id  TEXT NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  uid           TEXT NOT NULL REFERENCES public.users(id),
  PRIMARY KEY (campaign_id, character_id)
);
CREATE INDEX campaign_characters_character_id_idx ON public.campaign_characters (character_id);

-- Character assets (was characters/{id}/assets)
CREATE TABLE public.character_assets (
  id                TEXT PRIMARY KEY,
  character_id      TEXT NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  asset_id          TEXT NOT NULL,             -- Datasworn asset ID
  enabled_abilities JSONB NOT NULL DEFAULT '{}',   -- Record<number, boolean>
  option_values     JSONB,                     -- Record<string, string>
  control_values    JSONB,                     -- Record<string, boolean | string | number>
  "order"           INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER character_assets_updated_at BEFORE UPDATE ON public.character_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX character_assets_character_id_idx ON public.character_assets (character_id);

-- Campaign assets (was campaigns/{id}/assets)
CREATE TABLE public.campaign_assets (
  id                TEXT PRIMARY KEY,
  campaign_id       TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  asset_id          TEXT NOT NULL,
  enabled_abilities JSONB NOT NULL DEFAULT '{}',
  option_values     JSONB,
  control_values    JSONB,
  "order"           INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER campaign_assets_updated_at BEFORE UPDATE ON public.campaign_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX campaign_assets_campaign_id_idx ON public.campaign_assets (campaign_id);

-- Character tracks (was characters/{id}/tracks)
-- Covers ProgressTrack | Clock | SceneChallenge via type discriminator
CREATE TABLE public.character_tracks (
  id                TEXT PRIMARY KEY,
  character_id      TEXT NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,             -- 'vow'|'journey'|'fray'|'bondProgress'|'clock'|'sceneChallenge'
  label             TEXT NOT NULL,
  description       TEXT,
  value             INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'completed'
  difficulty        TEXT,                             -- 'troublesome'|'dangerous'|'formidable'|'extreme'|'epic'
  segments          INTEGER,                          -- Clock: number of segments
  oracle_key        TEXT,                             -- Clock: AskTheOracle key
  segments_filled   INTEGER,                          -- SceneChallenge: segments filled
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX character_tracks_character_id_idx ON public.character_tracks (character_id);
CREATE INDEX character_tracks_status_idx ON public.character_tracks (status);

-- Campaign tracks (was campaigns/{id}/tracks)
CREATE TABLE public.campaign_tracks (
  id                TEXT PRIMARY KEY,
  campaign_id       TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  label             TEXT NOT NULL,
  description       TEXT,
  value             INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active',
  difficulty        TEXT,
  segments          INTEGER,
  oracle_key        TEXT,
  segments_filled   INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX campaign_tracks_campaign_id_idx ON public.campaign_tracks (campaign_id);
CREATE INDEX campaign_tracks_status_idx ON public.campaign_tracks (status);

-- Character game log (was characters/{id}/game-log)
-- Covers StatRoll | OracleTableRoll | TrackProgressRoll | ClockProgressionRoll
CREATE TABLE public.character_game_log (
  id            TEXT PRIMARY KEY,
  character_id  TEXT NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  campaign_id   TEXT REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type          INTEGER NOT NULL,            -- ROLL_TYPE: 0=STAT, 1=ORACLE_TABLE, 2=TRACK_PROGRESS, 3=CLOCK_PROGRESSION
  roll_label    TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  uid           TEXT NOT NULL REFERENCES public.users(id),
  gms_only      BOOLEAN NOT NULL DEFAULT false,
  data          JSONB NOT NULL DEFAULT '{}'  -- type-specific roll fields
);
CREATE INDEX character_game_log_character_id_idx ON public.character_game_log (character_id);
CREATE INDEX character_game_log_timestamp_idx ON public.character_game_log (timestamp DESC);

-- Campaign game log (was campaigns/{id}/game-log)
CREATE TABLE public.campaign_game_log (
  id            TEXT PRIMARY KEY,
  campaign_id   TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_id  TEXT,                        -- nullable: some logs may be campaign-level
  type          INTEGER NOT NULL,
  roll_label    TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  uid           TEXT NOT NULL REFERENCES public.users(id),
  gms_only      BOOLEAN NOT NULL DEFAULT false,
  data          JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX campaign_game_log_campaign_id_idx ON public.campaign_game_log (campaign_id);
CREATE INDEX campaign_game_log_timestamp_idx ON public.campaign_game_log (timestamp DESC);

-- Character notes (was characters/{id}/notes)
CREATE TABLE public.character_notes (
  id            TEXT PRIMARY KEY,
  character_id  TEXT NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0,
  shared        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER character_notes_updated_at BEFORE UPDATE ON public.character_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX character_notes_character_id_idx ON public.character_notes (character_id);

-- Character note content (was characters/{id}/notes/{id}/content/content)
-- Kept separate so note list queries don't load binary blobs
CREATE TABLE public.character_note_content (
  note_id   TEXT PRIMARY KEY REFERENCES public.character_notes(id) ON DELETE CASCADE,
  notes     BYTEA,                           -- Tiptap/Yjs binary
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER character_note_content_updated_at BEFORE UPDATE ON public.character_note_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campaign notes (was campaigns/{id}/notes)
CREATE TABLE public.campaign_notes (
  id            TEXT PRIMARY KEY,
  campaign_id   TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0,
  shared        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER campaign_notes_updated_at BEFORE UPDATE ON public.campaign_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX campaign_notes_campaign_id_idx ON public.campaign_notes (campaign_id);

-- Campaign note content
CREATE TABLE public.campaign_note_content (
  note_id   TEXT PRIMARY KEY REFERENCES public.campaign_notes(id) ON DELETE CASCADE,
  notes     BYTEA,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER campaign_note_content_updated_at BEFORE UPDATE ON public.campaign_note_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Character settings (was characters/{id}/settings/settings — hardcoded doc)
CREATE TABLE public.character_settings (
  character_id                TEXT PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  custom_stats                TEXT[] NOT NULL DEFAULT '{}',
  custom_tracks               JSONB NOT NULL DEFAULT '{}',       -- Record<string, CustomTrack>
  hidden_custom_oracles_ids   TEXT[] NOT NULL DEFAULT '{}',
  hidden_custom_move_ids      TEXT[] NOT NULL DEFAULT '{}',
  hide_delve_moves            BOOLEAN,
  hide_delve_oracles          BOOLEAN,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER character_settings_updated_at BEFORE UPDATE ON public.character_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campaign settings (was campaigns/{id}/settings/settings)
CREATE TABLE public.campaign_settings (
  campaign_id                 TEXT PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  custom_stats                TEXT[] NOT NULL DEFAULT '{}',
  custom_tracks               JSONB NOT NULL DEFAULT '{}',
  hidden_custom_oracles_ids   TEXT[] NOT NULL DEFAULT '{}',
  hidden_custom_move_ids      TEXT[] NOT NULL DEFAULT '{}',
  hide_delve_moves            BOOLEAN,
  hide_delve_oracles          BOOLEAN,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER campaign_settings_updated_at BEFORE UPDATE ON public.campaign_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- SESSIONS & COMBAT
-- ---------------------------------------------------------------------------

-- Sessions (was characters/{id}/sessions and campaigns/{id}/sessions)
CREATE TABLE public.sessions (
  id            TEXT PRIMARY KEY,
  character_id  TEXT REFERENCES public.characters(id) ON DELETE SET NULL,
  campaign_id   TEXT REFERENCES public.campaigns(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  title         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  summary       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_campaign_id_idx ON public.sessions (campaign_id);
CREATE INDEX sessions_character_id_idx ON public.sessions (character_id);
CREATE INDEX sessions_is_active_idx ON public.sessions (is_active);
CREATE INDEX sessions_started_at_idx ON public.sessions (started_at DESC);

-- Session events (was sessions/{id}/events)
-- Covers 7 event types via `type` discriminator + JSONB data
CREATE TABLE public.session_events (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,   -- SESSION_EVENT_TYPE: 'move'|'oracle'|'stat_change'|'progress'|'journal'|'combat_start'|'combat_end'
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  character_id    TEXT,            -- nullable (campaign events)
  character_name  TEXT NOT NULL,
  uid             TEXT NOT NULL REFERENCES public.users(id),
  data            JSONB NOT NULL DEFAULT '{}'  -- type-specific event fields
);
CREATE INDEX session_events_session_id_idx ON public.session_events (session_id);
CREATE INDEX session_events_timestamp_idx ON public.session_events (timestamp ASC);

-- Combats (was characters/{id}/combats and campaigns/{id}/combats)
CREATE TABLE public.combats (
  id            TEXT PRIMARY KEY,
  character_id  TEXT NOT NULL REFERENCES public.characters(id),
  campaign_id   TEXT REFERENCES public.campaigns(id) ON DELETE CASCADE,
  session_id    TEXT NOT NULL REFERENCES public.sessions(id),
  objective     TEXT NOT NULL,
  enemies       JSONB NOT NULL DEFAULT '[]',     -- CombatEnemy[]
  position      TEXT NOT NULL,                   -- 'in_control' | 'in_a_bad_spot'
  difficulty    TEXT NOT NULL,                   -- Difficulty enum
  track_id      TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ
);
CREATE INDEX combats_campaign_id_idx ON public.combats (campaign_id);
CREATE INDEX combats_character_id_idx ON public.combats (character_id);
CREATE INDEX combats_active_idx ON public.combats (active);

-- ---------------------------------------------------------------------------
-- AI EVENTS (was campaigns/{id}/ai-events)
-- Created by server (service_role) only; clients read and update status/response
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_events (
  id                TEXT PRIMARY KEY,
  campaign_id       TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,         -- AiMode: storyGenerator | actionElaborator | stuckPlayer | sessionRecap | bookkeeper
  context_snapshot  JSONB NOT NULL,        -- AiCampaignContext snapshot
  response          JSONB NOT NULL,        -- AiGuideResponse
  status            TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'accepted' | 'rejected' | 'edited'
  canonized         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        TEXT NOT NULL REFERENCES public.users(id)
);
CREATE INDEX ai_events_campaign_id_idx ON public.ai_events (campaign_id);
CREATE INDEX ai_events_created_at_idx ON public.ai_events (created_at DESC);

-- ---------------------------------------------------------------------------
-- WORLD CONTENT: LOCATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE public.locations (
  id                              TEXT PRIMARY KEY,
  world_id                        TEXT NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  parent_location_id              TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  name                            TEXT NOT NULL,
  image_filenames                 TEXT[] NOT NULL DEFAULT '{}',
  icon                            JSONB,
  shared_with_players             BOOLEAN NOT NULL DEFAULT false,
  character_bonds                 JSONB NOT NULL DEFAULT '{}',   -- Record<string, boolean>
  type                            TEXT,
  fields                          JSONB NOT NULL DEFAULT '{}',   -- Record<string, string>
  map                             JSONB,                         -- LocationMap grid
  map_background_image_filename   TEXT,
  map_background_image_fit        TEXT,
  map_stroke_color                TEXT,
  show_map                        BOOLEAN,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX locations_world_id_idx ON public.locations (world_id);
CREATE INDEX locations_shared_with_players_idx ON public.locations (world_id, shared_with_players);

-- Location public notes (was locations/{id}/public/notes)
CREATE TABLE public.location_public_notes (
  location_id  TEXT PRIMARY KEY REFERENCES public.locations(id) ON DELETE CASCADE,
  notes        BYTEA,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER location_public_notes_updated_at BEFORE UPDATE ON public.location_public_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Location private notes (was locations/{id}/private/details — GM only)
CREATE TABLE public.location_private_notes (
  location_id  TEXT PRIMARY KEY REFERENCES public.locations(id) ON DELETE CASCADE,
  gm_notes     BYTEA,
  fields       JSONB NOT NULL DEFAULT '{}',  -- GM-specific structured fields
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER location_private_notes_updated_at BEFORE UPDATE ON public.location_private_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- WORLD CONTENT: NPCs
-- ---------------------------------------------------------------------------
CREATE TABLE public.npcs (
  id                       TEXT PRIMARY KEY,
  world_id                 TEXT NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  image_filenames          TEXT[] NOT NULL DEFAULT '{}',
  icon                     JSONB,
  shared_with_players      BOOLEAN NOT NULL DEFAULT false,
  pronouns                 TEXT,
  species                  TEXT,
  last_location_id         TEXT,
  last_sector_id           TEXT,
  character_connections    JSONB NOT NULL DEFAULT '{}',   -- Record<string, boolean>
  character_bonds          JSONB NOT NULL DEFAULT '{}',   -- Record<string, boolean>
  character_bond_progress  JSONB NOT NULL DEFAULT '{}',   -- Record<string, number>
  rank                     TEXT,
  callsign                 TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER npcs_updated_at BEFORE UPDATE ON public.npcs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX npcs_world_id_idx ON public.npcs (world_id);
CREATE INDEX npcs_shared_with_players_idx ON public.npcs (world_id, shared_with_players);

-- NPC public notes (was npcs/{id}/public/notes)
CREATE TABLE public.npc_public_notes (
  npc_id      TEXT PRIMARY KEY REFERENCES public.npcs(id) ON DELETE CASCADE,
  notes       BYTEA,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER npc_public_notes_updated_at BEFORE UPDATE ON public.npc_public_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NPC private notes (was npcs/{id}/private/details — GM only)
CREATE TABLE public.npc_private_notes (
  npc_id      TEXT PRIMARY KEY REFERENCES public.npcs(id) ON DELETE CASCADE,
  goal        TEXT,
  role        TEXT,
  descriptor  TEXT,
  disposition TEXT,
  activity    TEXT,
  first_look  TEXT,
  revealed_aspect TEXT,
  gm_notes    BYTEA,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER npc_private_notes_updated_at BEFORE UPDATE ON public.npc_private_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- WORLD CONTENT: LORE
-- ---------------------------------------------------------------------------
CREATE TABLE public.lore (
  id                   TEXT PRIMARY KEY,
  world_id             TEXT NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  image_filenames      TEXT[] NOT NULL DEFAULT '{}',
  icon                 JSONB,
  shared_with_players  BOOLEAN NOT NULL DEFAULT false,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER lore_updated_at BEFORE UPDATE ON public.lore
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX lore_world_id_idx ON public.lore (world_id);
CREATE INDEX lore_shared_with_players_idx ON public.lore (world_id, shared_with_players);

-- Lore public notes (was lore/{id}/public/notes)
CREATE TABLE public.lore_public_notes (
  lore_id     TEXT PRIMARY KEY REFERENCES public.lore(id) ON DELETE CASCADE,
  notes       BYTEA,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER lore_public_notes_updated_at BEFORE UPDATE ON public.lore_public_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lore private notes (was lore/{id}/private/details — GM only)
CREATE TABLE public.lore_private_notes (
  lore_id     TEXT PRIMARY KEY REFERENCES public.lore(id) ON DELETE CASCADE,
  gm_notes    BYTEA,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER lore_private_notes_updated_at BEFORE UPDATE ON public.lore_private_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- WORLD CONTENT: SECTORS (Starforged)
-- ---------------------------------------------------------------------------
CREATE TABLE public.sectors (
  id                   TEXT PRIMARY KEY,
  world_id             TEXT NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  shared_with_players  BOOLEAN NOT NULL DEFAULT false,
  region               TEXT,
  trouble              TEXT,
  map                  JSONB NOT NULL DEFAULT '{}',    -- SectorMap: Record<row, Record<col, SectorMapEntry>>
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sectors_world_id_idx ON public.sectors (world_id);
CREATE INDEX sectors_shared_with_players_idx ON public.sectors (world_id, shared_with_players);

-- Sector public notes (was sectors/{id}/public/notes)
CREATE TABLE public.sector_public_notes (
  sector_id   TEXT PRIMARY KEY REFERENCES public.sectors(id) ON DELETE CASCADE,
  notes       BYTEA,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER sector_public_notes_updated_at BEFORE UPDATE ON public.sector_public_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sector private notes (was sectors/{id}/private/notes — GM only)
CREATE TABLE public.sector_private_notes (
  sector_id   TEXT PRIMARY KEY REFERENCES public.sectors(id) ON DELETE CASCADE,
  notes       BYTEA,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER sector_private_notes_updated_at BEFORE UPDATE ON public.sector_private_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sector locations (was sectors/{id}/locations)
CREATE TABLE public.sector_locations (
  id          TEXT PRIMARY KEY,
  sector_id   TEXT NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,           -- SectorHexTypes: 'planet'|'star'|'vault'|'settlement'|'derelict'|'other'|'path'
  row_index   INTEGER,
  col_index   INTEGER,
  data        JSONB NOT NULL DEFAULT '{}',  -- type-specific fields per SectorHexType
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER sector_locations_updated_at BEFORE UPDATE ON public.sector_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX sector_locations_sector_id_idx ON public.sector_locations (sector_id);

-- Sector location public notes (was sectors/{id}/locations/{id}/public/notes)
CREATE TABLE public.sector_location_public_notes (
  sector_location_id  TEXT PRIMARY KEY REFERENCES public.sector_locations(id) ON DELETE CASCADE,
  notes               BYTEA,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER sector_location_public_notes_updated_at BEFORE UPDATE ON public.sector_location_public_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sector location private notes (was sectors/{id}/locations/{id}/private/notes)
CREATE TABLE public.sector_location_private_notes (
  sector_location_id  TEXT PRIMARY KEY REFERENCES public.sector_locations(id) ON DELETE CASCADE,
  notes               BYTEA,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER sector_location_private_notes_updated_at BEFORE UPDATE ON public.sector_location_private_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- HOMEBREW
-- ---------------------------------------------------------------------------

-- Homebrew collections (was homebrew/homebrew/collections)
CREATE TABLE public.homebrew_collections (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL DEFAULT 'expansion',   -- PackageTypes.Expansion
  title         TEXT NOT NULL,
  description   TEXT,
  editors       TEXT[] NOT NULL DEFAULT '{}',        -- user IDs with edit access
  viewers       TEXT[] NOT NULL DEFAULT '{}',        -- user IDs with view access
  creator       TEXT NOT NULL REFERENCES public.users(id),
  ruleset_id    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_collections_updated_at BEFORE UPDATE ON public.homebrew_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_collections_editors_gin ON public.homebrew_collections USING GIN (editors);
CREATE INDEX homebrew_collections_viewers_gin ON public.homebrew_collections USING GIN (viewers);
CREATE INDEX homebrew_collections_creator_idx ON public.homebrew_collections (creator);

-- Editor invite keys (was homebrew/homebrew/editorInviteKeys — server-side only)
CREATE TABLE public.homebrew_editor_invite_keys (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX homebrew_editor_invite_keys_collection_id_idx ON public.homebrew_editor_invite_keys (collection_id);

-- Homebrew stats (was homebrew/homebrew/stats)
CREATE TABLE public.homebrew_stats (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  datasworn_id   TEXT NOT NULL,
  label          TEXT NOT NULL,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_stats_updated_at BEFORE UPDATE ON public.homebrew_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_stats_collection_id_idx ON public.homebrew_stats (collection_id);

-- Homebrew condition meters (was homebrew/homebrew/condition_meters)
CREATE TABLE public.homebrew_condition_meters (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  datasworn_id   TEXT NOT NULL,
  label          TEXT NOT NULL,
  description    TEXT,
  shared         BOOLEAN NOT NULL DEFAULT false,
  value          INTEGER NOT NULL DEFAULT 5,
  min            INTEGER NOT NULL DEFAULT 0,
  max            INTEGER NOT NULL DEFAULT 5,
  rollable       BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_condition_meters_updated_at BEFORE UPDATE ON public.homebrew_condition_meters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_condition_meters_collection_id_idx ON public.homebrew_condition_meters (collection_id);

-- Homebrew non-linear meters (was homebrew/homebrew/non_linear_meters)
CREATE TABLE public.homebrew_non_linear_meters (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  datasworn_id   TEXT NOT NULL,
  label          TEXT NOT NULL,
  description    TEXT,
  shared         BOOLEAN NOT NULL DEFAULT false,
  options        JSONB NOT NULL DEFAULT '[]',    -- { value: number|string; readOnly: boolean }[]
  rollable       BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_non_linear_meters_updated_at BEFORE UPDATE ON public.homebrew_non_linear_meters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_non_linear_meters_collection_id_idx ON public.homebrew_non_linear_meters (collection_id);

-- Homebrew impacts (was homebrew/homebrew/impacts)
CREATE TABLE public.homebrew_impacts (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  description    TEXT,
  contents       JSONB NOT NULL DEFAULT '{}',   -- Record<impactKey, HomebrewImpact>
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_impacts_updated_at BEFORE UPDATE ON public.homebrew_impacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_impacts_collection_id_idx ON public.homebrew_impacts (collection_id);

-- Homebrew legacy tracks (was homebrew/homebrew/legacy_tracks)
CREATE TABLE public.homebrew_legacy_tracks (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  datasworn_id   TEXT NOT NULL,
  label          TEXT NOT NULL,
  description    TEXT,
  shared         BOOLEAN NOT NULL DEFAULT false,
  optional       BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_legacy_tracks_updated_at BEFORE UPDATE ON public.homebrew_legacy_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_legacy_tracks_collection_id_idx ON public.homebrew_legacy_tracks (collection_id);

-- Homebrew oracle collections (was homebrew/homebrew/oracle_collections)
CREATE TABLE public.homebrew_oracle_collections (
  id                          TEXT PRIMARY KEY,
  collection_id               TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  label                       TEXT NOT NULL,
  parent_oracle_collection_id TEXT,
  description                 TEXT,
  enhances_id                 TEXT,
  replaces_id                 TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_oracle_collections_updated_at BEFORE UPDATE ON public.homebrew_oracle_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_oracle_collections_collection_id_idx ON public.homebrew_oracle_collections (collection_id);

-- Homebrew oracle tables (was homebrew/homebrew/oracle_tables)
CREATE TABLE public.homebrew_oracle_tables (
  id                     TEXT PRIMARY KEY,
  collection_id          TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  oracle_collection_id   TEXT,
  label                  TEXT NOT NULL,
  description            TEXT,
  replaces               TEXT,
  column_labels          JSONB NOT NULL,   -- { roll: string; result: string; detail?: string }
  rows                   JSONB NOT NULL DEFAULT '[]',  -- { result: string; chance: number; detail?: string }[]
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_oracle_tables_updated_at BEFORE UPDATE ON public.homebrew_oracle_tables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_oracle_tables_collection_id_idx ON public.homebrew_oracle_tables (collection_id);

-- Homebrew move categories (was homebrew/homebrew/move_categories)
CREATE TABLE public.homebrew_move_categories (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  description    TEXT,
  enhances_id    TEXT,
  replaces_id    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_move_categories_updated_at BEFORE UPDATE ON public.homebrew_move_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_move_categories_collection_id_idx ON public.homebrew_move_categories (collection_id);

-- Homebrew moves (was homebrew/homebrew/moves)
-- Union type: NoRoll | ActionRoll | ProgressRoll | SpecialTrack via `type` + JSONB extras
CREATE TABLE public.homebrew_moves (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  category_id    TEXT,
  type           TEXT NOT NULL,   -- 'actionRoll' | 'noRoll' | 'progressRoll' | 'specialTrack'
  label          TEXT NOT NULL,
  text           TEXT NOT NULL,
  oracles        TEXT[],
  replaces_id    TEXT,
  extras         JSONB NOT NULL DEFAULT '{}',   -- type-specific: stats, conditionMeters, assetControls, category, specialTracks
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_moves_updated_at BEFORE UPDATE ON public.homebrew_moves
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_moves_collection_id_idx ON public.homebrew_moves (collection_id);

-- Homebrew asset collections (was homebrew/homebrew/asset_collections)
CREATE TABLE public.homebrew_asset_collections (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  description    TEXT,
  enhances_id    TEXT,
  replaces_id    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_asset_collections_updated_at BEFORE UPDATE ON public.homebrew_asset_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_asset_collections_collection_id_idx ON public.homebrew_asset_collections (collection_id);

-- Homebrew assets (was homebrew/homebrew/assets)
CREATE TABLE public.homebrew_assets (
  id                   TEXT PRIMARY KEY,
  collection_id        TEXT NOT NULL REFERENCES public.homebrew_collections(id) ON DELETE CASCADE,
  asset_collection_id  TEXT,
  label                TEXT NOT NULL,
  category             TEXT,
  description          TEXT,
  abilities            JSONB NOT NULL DEFAULT '[]',   -- HomebrewAssetAbility[]
  options              JSONB NOT NULL DEFAULT '[]',   -- HomebrewAssetOption[]
  controls             JSONB NOT NULL DEFAULT '[]',   -- HomebrewAssetControl[]
  replaces_id          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER homebrew_assets_updated_at BEFORE UPDATE ON public.homebrew_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX homebrew_assets_collection_id_idx ON public.homebrew_assets (collection_id);

-- ---------------------------------------------------------------------------
-- AUTO-POPULATE users FROM auth.users ON SIGN UP
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, photo_url)
  VALUES (
    NEW.id::text,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'Unknown User'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    photo_url    = COALESCE(EXCLUDED.photo_url, public.users.photo_url),
    updated_at   = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
