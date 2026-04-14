-- =============================================================================
-- 002_rls_policies.sql
-- Row-Level Security policies — mirrors firestore.rules
-- =============================================================================

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- ---------------------------------------------------------------------------

-- Check if current user is a world owner or campaign guide
CREATE OR REPLACE FUNCTION public.is_world_owner_or_guide(world_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.worlds w
    WHERE w.id = world_id
      AND (auth.uid()::text = ANY(w.owner_ids)
        OR auth.uid()::text = ANY(w.campaign_guides))
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is an editor of a homebrew collection
CREATE OR REPLACE FUNCTION public.is_homebrew_editor(collection_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.homebrew_collections hc
    WHERE hc.id = collection_id
      AND auth.uid()::text = ANY(hc.editors)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get world_id for a location (used in RLS subqueries)
CREATE OR REPLACE FUNCTION public.get_location_world_id(loc_id TEXT)
RETURNS TEXT AS $$
  SELECT world_id FROM public.locations WHERE id = loc_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get world_id for an NPC
CREATE OR REPLACE FUNCTION public.get_npc_world_id(npc_id TEXT)
RETURNS TEXT AS $$
  SELECT world_id FROM public.npcs WHERE id = npc_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get world_id for a lore entry
CREATE OR REPLACE FUNCTION public.get_lore_world_id(lore_id TEXT)
RETURNS TEXT AS $$
  SELECT world_id FROM public.lore WHERE id = lore_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get world_id for a sector
CREATE OR REPLACE FUNCTION public.get_sector_world_id(sector_id TEXT)
RETURNS TEXT AS $$
  SELECT world_id FROM public.sectors WHERE id = sector_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get sector_id for a sector_location
CREATE OR REPLACE FUNCTION public.get_sector_location_sector_id(sl_id TEXT)
RETURNS TEXT AS $$
  SELECT sector_id FROM public.sector_locations WHERE id = sl_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- USERS
-- mirrors: /users/{userId} → public read, owner write
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_public"
  ON public.users FOR SELECT
  USING (true);
-- Public read matches: allow read: if true

CREATE POLICY "users_update_owner"
  ON public.users FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "users_insert_self"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid()::text);
-- Only the trigger and the user themselves can insert

CREATE POLICY "users_delete_owner"
  ON public.users FOR DELETE
  USING (id = auth.uid()::text);

-- User settings — owner only for all operations
ALTER TABLE public.user_accessibility_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_accessibility_settings_owner"
  ON public.user_accessibility_settings FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE public.user_oracle_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_oracle_settings_owner"
  ON public.user_oracle_settings FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Custom oracles/moves — public read, owner write (mirrors Firestore)
ALTER TABLE public.user_custom_oracles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_custom_oracles_select_public"
  ON public.user_custom_oracles FOR SELECT USING (true);
CREATE POLICY "user_custom_oracles_write_owner"
  ON public.user_custom_oracles FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE public.user_custom_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_custom_moves_select_public"
  ON public.user_custom_moves FOR SELECT USING (true);
CREATE POLICY "user_custom_moves_write_owner"
  ON public.user_custom_moves FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- AI rate limits — owner read, no client write (service_role writes)
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_rate_limits_select_owner"
  ON public.ai_rate_limits FOR SELECT
  USING (user_id = auth.uid()::text);
-- No INSERT/UPDATE/DELETE policy → only service_role can write

-- ---------------------------------------------------------------------------
-- WORLDS
-- mirrors: /worlds/{worldId}
--   SELECT: public (allow read: if true)
--   INSERT: authenticated
--   UPDATE: owner only (uid in ownerIds)
--   UPDATE restricted: only ownerIds/campaignGuides fields via RPC
--   DELETE: owner only
-- ---------------------------------------------------------------------------
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worlds_select_public"
  ON public.worlds FOR SELECT USING (true);

CREATE POLICY "worlds_insert_auth"
  ON public.worlds FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "worlds_update_owner"
  ON public.worlds FOR UPDATE
  USING (auth.uid()::text = ANY(owner_ids));

CREATE POLICY "worlds_delete_owner"
  ON public.worlds FOR DELETE
  USING (auth.uid()::text = ANY(owner_ids));

ALTER TABLE public.world_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "world_ai_settings_select_auth"
  ON public.world_ai_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "world_ai_settings_write_owner"
  ON public.world_ai_settings FOR ALL
  USING (public.is_world_owner_or_guide(world_id))
  WITH CHECK (public.is_world_owner_or_guide(world_id));

-- ---------------------------------------------------------------------------
-- CAMPAIGNS
-- mirrors: /campaigns/{campaignId} → any authenticated user
-- Very permissive in Firestore — maintained here
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_all_auth"
  ON public.campaigns FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_members_all_auth"
  ON public.campaign_members FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.campaign_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_characters_all_auth"
  ON public.campaign_characters FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Campaign sub-tables — all authenticated (same as campaign root)
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_assets_all_auth"
  ON public.campaign_assets FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.campaign_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_tracks_all_auth"
  ON public.campaign_tracks FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.campaign_game_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_game_log_select_public"
  ON public.campaign_game_log FOR SELECT USING (true);
-- game-log has public read in Firestore: allow read: if true
CREATE POLICY "campaign_game_log_write_auth"
  ON public.campaign_game_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "campaign_game_log_update_auth"
  ON public.campaign_game_log FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "campaign_game_log_delete_auth"
  ON public.campaign_game_log FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE public.campaign_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_notes_all_auth"
  ON public.campaign_notes FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.campaign_note_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_note_content_all_auth"
  ON public.campaign_note_content FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_settings_all_auth"
  ON public.campaign_settings FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- CHARACTERS
-- mirrors: /characters/{characterId}
--   SELECT: public
--   INSERT: authenticated
--   UPDATE/DELETE: owner (uid == auth.uid)
--   UPDATE (restricted fields: campaignId, worldId, initiativeStatus): any auth
--     → handled via update_character_limited() RPC
-- ---------------------------------------------------------------------------
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "characters_select_public"
  ON public.characters FOR SELECT USING (true);

CREATE POLICY "characters_insert_auth"
  ON public.characters FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND uid = auth.uid()::text);

CREATE POLICY "characters_update_owner"
  ON public.characters FOR UPDATE
  USING (uid = auth.uid()::text);

CREATE POLICY "characters_delete_owner"
  ON public.characters FOR DELETE
  USING (uid = auth.uid()::text);

-- Character sub-tables (public read, owner write)
ALTER TABLE public.character_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_assets_select_public"
  ON public.character_assets FOR SELECT USING (true);
CREATE POLICY "character_assets_write_owner"
  ON public.character_assets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  );

ALTER TABLE public.character_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_tracks_select_public"
  ON public.character_tracks FOR SELECT USING (true);
CREATE POLICY "character_tracks_update_auth"
  ON public.character_tracks FOR UPDATE
  USING (auth.uid() IS NOT NULL);
-- tracks: allow update: if request.auth.uid != null (any auth can update track progress)
CREATE POLICY "character_tracks_write_owner"
  ON public.character_tracks FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  );
CREATE POLICY "character_tracks_delete_owner"
  ON public.character_tracks FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  );

ALTER TABLE public.character_game_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_game_log_select_public"
  ON public.character_game_log FOR SELECT USING (true);
CREATE POLICY "character_game_log_write_owner"
  ON public.character_game_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  );

ALTER TABLE public.character_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_notes_select_public"
  ON public.character_notes FOR SELECT USING (true);
CREATE POLICY "character_notes_write_owner"
  ON public.character_notes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  );

ALTER TABLE public.character_note_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_note_content_select_public"
  ON public.character_note_content FOR SELECT USING (true);
CREATE POLICY "character_note_content_write_owner"
  ON public.character_note_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.character_notes n
      JOIN public.characters c ON c.id = n.character_id
      WHERE n.id = note_id AND c.uid = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.character_notes n
      JOIN public.characters c ON c.id = n.character_id
      WHERE n.id = note_id AND c.uid = auth.uid()::text
    )
  );

ALTER TABLE public.character_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_settings_all_owner"
  ON public.character_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.uid = auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- SESSIONS & COMBATS
-- Attached to campaigns/characters — authenticated access
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_all_auth"
  ON public.sessions FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_events_all_auth"
  ON public.session_events FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.combats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combats_all_auth"
  ON public.combats FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- AI EVENTS
-- mirrors: /campaigns/{id}/ai-events
--   SELECT: authenticated
--   INSERT/DELETE: denied for clients (service_role writes via Edge Functions)
--   UPDATE: authenticated, but restricted to status/response fields only via RPC
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_events_select_auth"
  ON public.ai_events FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- No client INSERT/DELETE policies — service_role bypasses RLS
-- Updates restricted to status/response only via RPC function below

-- RPC for field-restricted ai_event update
CREATE OR REPLACE FUNCTION public.update_ai_event_status(
  p_event_id  TEXT,
  p_status    TEXT,
  p_response  JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.ai_events
  SET
    status   = p_status,
    response = COALESCE(p_response, response)
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for updating only initiative_status on a character (restricted field update)
CREATE OR REPLACE FUNCTION public.update_character_initiative(
  p_character_id     TEXT,
  p_initiative_status TEXT
)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.characters
  SET initiative_status = p_initiative_status
  WHERE id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for updating character campaign_id / world_id (restricted field update)
CREATE OR REPLACE FUNCTION public.update_character_membership(
  p_character_id  TEXT,
  p_campaign_id   TEXT DEFAULT NULL,
  p_world_id      TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.characters
  SET
    campaign_id = p_campaign_id,
    world_id    = p_world_id
  WHERE id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for updating world ownership (restricted to ownerIds / campaignGuides fields)
CREATE OR REPLACE FUNCTION public.update_world_membership(
  p_world_id        TEXT,
  p_owner_ids       TEXT[] DEFAULT NULL,
  p_campaign_guides TEXT[] DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF auth.uid()::text != ANY((SELECT owner_ids FROM public.worlds WHERE id = p_world_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.worlds
  SET
    owner_ids       = COALESCE(p_owner_ids, owner_ids),
    campaign_guides = COALESCE(p_campaign_guides, campaign_guides)
  WHERE id = p_world_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- LOCATIONS
-- mirrors: /worlds/{id}/locations/{id}
--   Public parts: public read/create/update, owner delete
--   Private notes: owner/guide only
-- ---------------------------------------------------------------------------
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select_public"
  ON public.locations FOR SELECT USING (true);
CREATE POLICY "locations_insert_auth"
  ON public.locations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "locations_update_auth"
  ON public.locations FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "locations_delete_owner"
  ON public.locations FOR DELETE
  USING (public.is_world_owner_or_guide(world_id));

ALTER TABLE public.location_public_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "location_public_notes_select_public"
  ON public.location_public_notes FOR SELECT USING (true);
CREATE POLICY "location_public_notes_insert_auth"
  ON public.location_public_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "location_public_notes_update_auth"
  ON public.location_public_notes FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "location_public_notes_delete_owner"
  ON public.location_public_notes FOR DELETE
  USING (public.is_world_owner_or_guide(public.get_location_world_id(location_id)));

ALTER TABLE public.location_private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "location_private_notes_owner_guide"
  ON public.location_private_notes FOR ALL
  USING (public.is_world_owner_or_guide(public.get_location_world_id(location_id)))
  WITH CHECK (public.is_world_owner_or_guide(public.get_location_world_id(location_id)));

-- ---------------------------------------------------------------------------
-- NPCs — same pattern as locations
-- ---------------------------------------------------------------------------
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "npcs_select_public"
  ON public.npcs FOR SELECT USING (true);
CREATE POLICY "npcs_insert_auth"
  ON public.npcs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "npcs_update_auth"
  ON public.npcs FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "npcs_delete_owner"
  ON public.npcs FOR DELETE
  USING (public.is_world_owner_or_guide(world_id));

ALTER TABLE public.npc_public_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_public_notes_select_public"
  ON public.npc_public_notes FOR SELECT USING (true);
CREATE POLICY "npc_public_notes_insert_auth"
  ON public.npc_public_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "npc_public_notes_update_auth"
  ON public.npc_public_notes FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "npc_public_notes_delete_owner"
  ON public.npc_public_notes FOR DELETE
  USING (public.is_world_owner_or_guide(public.get_npc_world_id(npc_id)));

ALTER TABLE public.npc_private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_private_notes_owner_guide"
  ON public.npc_private_notes FOR ALL
  USING (public.is_world_owner_or_guide(public.get_npc_world_id(npc_id)))
  WITH CHECK (public.is_world_owner_or_guide(public.get_npc_world_id(npc_id)));

-- ---------------------------------------------------------------------------
-- LORE — same pattern as locations
-- ---------------------------------------------------------------------------
ALTER TABLE public.lore ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lore_select_public"
  ON public.lore FOR SELECT USING (true);
CREATE POLICY "lore_insert_auth"
  ON public.lore FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "lore_update_auth"
  ON public.lore FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "lore_delete_owner"
  ON public.lore FOR DELETE
  USING (public.is_world_owner_or_guide(world_id));

ALTER TABLE public.lore_public_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lore_public_notes_select_public"
  ON public.lore_public_notes FOR SELECT USING (true);
CREATE POLICY "lore_public_notes_insert_auth"
  ON public.lore_public_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "lore_public_notes_update_auth"
  ON public.lore_public_notes FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "lore_public_notes_delete_owner"
  ON public.lore_public_notes FOR DELETE
  USING (public.is_world_owner_or_guide(public.get_lore_world_id(lore_id)));

ALTER TABLE public.lore_private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lore_private_notes_owner_guide"
  ON public.lore_private_notes FOR ALL
  USING (public.is_world_owner_or_guide(public.get_lore_world_id(lore_id)))
  WITH CHECK (public.is_world_owner_or_guide(public.get_lore_world_id(lore_id)));

-- ---------------------------------------------------------------------------
-- SECTORS
-- mirrors: /worlds/{id}/sectors
--   read/create/update: authenticated; delete: owner/guide
--   public notes: authenticated; private notes: owner/guide
-- ---------------------------------------------------------------------------
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sectors_select_auth"
  ON public.sectors FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "sectors_insert_auth"
  ON public.sectors FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sectors_update_auth"
  ON public.sectors FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "sectors_delete_owner"
  ON public.sectors FOR DELETE
  USING (public.is_world_owner_or_guide(world_id));

ALTER TABLE public.sector_public_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sector_public_notes_all_auth"
  ON public.sector_public_notes FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.sector_private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sector_private_notes_owner_guide"
  ON public.sector_private_notes FOR ALL
  USING (public.is_world_owner_or_guide(public.get_sector_world_id(sector_id)))
  WITH CHECK (public.is_world_owner_or_guide(public.get_sector_world_id(sector_id)));

ALTER TABLE public.sector_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sector_locations_select_auth"
  ON public.sector_locations FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "sector_locations_insert_auth"
  ON public.sector_locations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sector_locations_update_auth"
  ON public.sector_locations FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "sector_locations_delete_owner"
  ON public.sector_locations FOR DELETE
  USING (
    public.is_world_owner_or_guide(
      public.get_sector_world_id(public.get_sector_location_sector_id(id))
    )
  );

ALTER TABLE public.sector_location_public_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sector_location_public_notes_all_auth"
  ON public.sector_location_public_notes FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.sector_location_private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sector_location_private_notes_owner_guide"
  ON public.sector_location_private_notes FOR ALL
  USING (
    public.is_world_owner_or_guide(
      public.get_sector_world_id(
        public.get_sector_location_sector_id(sector_location_id)
      )
    )
  )
  WITH CHECK (
    public.is_world_owner_or_guide(
      public.get_sector_world_id(
        public.get_sector_location_sector_id(sector_location_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- HOMEBREW
-- mirrors: /homebrew/homebrew/collections/{id}
--   SELECT: public
--   INSERT: authenticated
--   UPDATE: editors (non-sensitive fields); any auth can update viewers array (via RPC)
--   DELETE: creator only
-- ---------------------------------------------------------------------------
ALTER TABLE public.homebrew_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homebrew_collections_select_public"
  ON public.homebrew_collections FOR SELECT USING (true);

CREATE POLICY "homebrew_collections_insert_auth"
  ON public.homebrew_collections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND creator = auth.uid()::text);

CREATE POLICY "homebrew_collections_update_editor"
  ON public.homebrew_collections FOR UPDATE
  USING (auth.uid()::text = ANY(editors));

CREATE POLICY "homebrew_collections_delete_creator"
  ON public.homebrew_collections FOR DELETE
  USING (creator = auth.uid()::text);

-- Editor invite keys — server-side only (deny all client access)
ALTER TABLE public.homebrew_editor_invite_keys ENABLE ROW LEVEL SECURITY;
-- No policies = deny all via RLS (service_role bypasses)

-- Homebrew sub-tables: public read, auth create, editor write
-- Macro-like pattern for all homebrew content tables

ALTER TABLE public.homebrew_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_stats_select_public" ON public.homebrew_stats FOR SELECT USING (true);
CREATE POLICY "homebrew_stats_insert_auth" ON public.homebrew_stats FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_stats_write_editor" ON public.homebrew_stats FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_condition_meters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_condition_meters_select_public" ON public.homebrew_condition_meters FOR SELECT USING (true);
CREATE POLICY "homebrew_condition_meters_insert_auth" ON public.homebrew_condition_meters FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_condition_meters_write_editor" ON public.homebrew_condition_meters FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_non_linear_meters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_non_linear_meters_select_public" ON public.homebrew_non_linear_meters FOR SELECT USING (true);
CREATE POLICY "homebrew_non_linear_meters_insert_auth" ON public.homebrew_non_linear_meters FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_non_linear_meters_write_editor" ON public.homebrew_non_linear_meters FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_impacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_impacts_select_public" ON public.homebrew_impacts FOR SELECT USING (true);
CREATE POLICY "homebrew_impacts_insert_auth" ON public.homebrew_impacts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_impacts_write_editor" ON public.homebrew_impacts FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_legacy_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_legacy_tracks_select_public" ON public.homebrew_legacy_tracks FOR SELECT USING (true);
CREATE POLICY "homebrew_legacy_tracks_insert_auth" ON public.homebrew_legacy_tracks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_legacy_tracks_write_editor" ON public.homebrew_legacy_tracks FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_oracle_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_oracle_collections_select_public" ON public.homebrew_oracle_collections FOR SELECT USING (true);
CREATE POLICY "homebrew_oracle_collections_insert_auth" ON public.homebrew_oracle_collections FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_oracle_collections_write_editor" ON public.homebrew_oracle_collections FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_oracle_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_oracle_tables_select_public" ON public.homebrew_oracle_tables FOR SELECT USING (true);
CREATE POLICY "homebrew_oracle_tables_insert_auth" ON public.homebrew_oracle_tables FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_oracle_tables_write_editor" ON public.homebrew_oracle_tables FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_move_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_move_categories_select_public" ON public.homebrew_move_categories FOR SELECT USING (true);
CREATE POLICY "homebrew_move_categories_insert_auth" ON public.homebrew_move_categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_move_categories_write_editor" ON public.homebrew_move_categories FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_moves_select_public" ON public.homebrew_moves FOR SELECT USING (true);
CREATE POLICY "homebrew_moves_insert_auth" ON public.homebrew_moves FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_moves_write_editor" ON public.homebrew_moves FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_asset_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_asset_collections_select_public" ON public.homebrew_asset_collections FOR SELECT USING (true);
CREATE POLICY "homebrew_asset_collections_insert_auth" ON public.homebrew_asset_collections FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_asset_collections_write_editor" ON public.homebrew_asset_collections FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

ALTER TABLE public.homebrew_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_assets_select_public" ON public.homebrew_assets FOR SELECT USING (true);
CREATE POLICY "homebrew_assets_insert_auth" ON public.homebrew_assets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "homebrew_assets_write_editor" ON public.homebrew_assets FOR ALL USING (public.is_homebrew_editor(collection_id)) WITH CHECK (public.is_homebrew_editor(collection_id));

-- RPC to add current user as homebrew viewer (any authenticated user can add themselves)
CREATE OR REPLACE FUNCTION public.add_homebrew_viewer(p_collection_id TEXT)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.homebrew_collections
  SET viewers = array_append(
    ARRAY(SELECT DISTINCT unnest(viewers)),
    auth.uid()::text
  )
  WHERE id = p_collection_id
    AND NOT (auth.uid()::text = ANY(viewers));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to add/remove homebrew editor (used by Edge Functions with service_role)
CREATE OR REPLACE FUNCTION public.add_homebrew_editor(
  p_collection_id TEXT,
  p_user_id       TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.homebrew_collections
  SET editors = ARRAY(SELECT DISTINCT unnest(array_append(editors, p_user_id)))
  WHERE id = p_collection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.remove_homebrew_editor(
  p_collection_id TEXT,
  p_user_id       TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.homebrew_collections
  SET editors = ARRAY(SELECT unnest(editors) EXCEPT SELECT p_user_id)
  WHERE id = p_collection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
