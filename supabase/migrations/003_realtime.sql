-- =============================================================================
-- 003_realtime.sql
-- Enable Supabase Realtime on all tables that previously used onSnapshot()
-- =============================================================================

-- Every table that had an onSnapshot listener needs to be in the realtime publication
-- so that the client can subscribe to postgres_changes events.

ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_custom_oracles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_custom_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_accessibility_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_oracle_settings;

ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_game_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_note_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_settings;

ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_characters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_game_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_note_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_settings;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.combats;

ALTER PUBLICATION supabase_realtime ADD TABLE public.worlds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_ai_settings;

ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_public_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_private_notes;

ALTER PUBLICATION supabase_realtime ADD TABLE public.npcs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.npc_public_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.npc_private_notes;

ALTER PUBLICATION supabase_realtime ADD TABLE public.lore;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lore_public_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lore_private_notes;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sectors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sector_public_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sector_private_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sector_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sector_location_public_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sector_location_private_notes;

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_events;

ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_condition_meters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_non_linear_meters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_impacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_legacy_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_oracle_collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_oracle_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_move_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_asset_collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homebrew_assets;
