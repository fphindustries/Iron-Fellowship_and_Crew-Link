CREATE TYPE "public"."ai_event_status" AS ENUM('pending', 'accepted', 'rejected', 'edited');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('solo', 'coop', 'guided');--> statement-breakpoint
CREATE TYPE "public"."game_system" AS ENUM('ironsworn', 'starforged');--> statement-breakpoint
CREATE TYPE "public"."homebrew_content_type" AS ENUM('stat', 'conditionMeter', 'nonLinearMeter', 'impact', 'legacyTrack', 'oracleTable', 'oracleCollection', 'moveCategory', 'move', 'assetCollection', 'asset');--> statement-breakpoint
CREATE TYPE "public"."initiative_status" AS ENUM('hasInitiative', 'outOfCombat', 'doesNotHaveInitiative');--> statement-breakpoint
CREATE TYPE "public"."track_type" AS ENUM('vow', 'journey', 'fray', 'bondProgress', 'clock', 'sceneChallenge');--> statement-breakpoint
CREATE TABLE "campaign_ai_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"type" text NOT NULL,
	"context_snapshot_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response_json" jsonb,
	"status" "ai_event_status" DEFAULT 'pending' NOT NULL,
	"canonized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_characters" (
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	CONSTRAINT "campaign_characters_campaign_id_character_id_pk" PRIMARY KEY("campaign_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_game_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_gms" (
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "campaign_gms_campaign_id_user_id_pk" PRIMARY KEY("campaign_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_members" (
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "campaign_members_campaign_id_user_id_pk" PRIMARY KEY("campaign_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"content" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"type" "track_type" NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"system" "game_system" NOT NULL,
	"type" "campaign_type" DEFAULT 'solo' NOT NULL,
	"theme" text,
	"world_id" uuid,
	"expansion_ids" text[] DEFAULT '{}' NOT NULL,
	"custom_tracks_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"condition_meters_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"special_tracks_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_game_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"content" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"type" "track_type" NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"system" "game_system" NOT NULL,
	"stats_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"condition_meters_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"momentum" integer DEFAULT 2 NOT NULL,
	"special_tracks_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"experience_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"debilities_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile_image" text,
	"expansion_ids" text[] DEFAULT '{}' NOT NULL,
	"custom_tracks_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"theme" text,
	"backstory" text,
	"initiative_status" "initiative_status" DEFAULT 'outOfCombat' NOT NULL,
	"campaign_id" uuid,
	"world_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homebrew_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"creator" uuid NOT NULL,
	"editors" uuid[] DEFAULT '{}' NOT NULL,
	"viewers" uuid[] DEFAULT '{}' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homebrew_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"content_type" "homebrew_content_type" NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homebrew_invite_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"key" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "homebrew_invite_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "magic_link_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	CONSTRAINT "magic_link_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_accessibility_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_custom_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_custom_oracles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_entity_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "user_entity_settings_user_id_entity_id_entity_type_unique" UNIQUE("user_id","entity_id","entity_type")
);
--> statement-breakpoint
CREATE TABLE "user_oracle_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"pinned_oracle_ids_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"photo_url" text,
	"hide_photo" boolean DEFAULT false NOT NULL,
	"layout_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "world_ai_settings" (
	"world_id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'anthropic' NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_guides" (
	"world_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"guide_id" text NOT NULL,
	CONSTRAINT "world_guides_world_id_campaign_id_pk" PRIMARY KEY("world_id","campaign_id")
);
--> statement-breakpoint
CREATE TABLE "world_location_private_notes" (
	"location_id" uuid PRIMARY KEY NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content" "bytea"
);
--> statement-breakpoint
CREATE TABLE "world_location_public_notes" (
	"location_id" uuid PRIMARY KEY NOT NULL,
	"content" "bytea"
);
--> statement-breakpoint
CREATE TABLE "world_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"image_filenames" text[] DEFAULT '{}' NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_lore" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"image_filenames" text[] DEFAULT '{}' NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_lore_private_notes" (
	"lore_id" uuid PRIMARY KEY NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_lore_public_notes" (
	"lore_id" uuid PRIMARY KEY NOT NULL,
	"content" "bytea"
);
--> statement-breakpoint
CREATE TABLE "world_npc_private_notes" (
	"npc_id" uuid PRIMARY KEY NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_npc_public_notes" (
	"npc_id" uuid PRIMARY KEY NOT NULL,
	"content" "bytea"
);
--> statement-breakpoint
CREATE TABLE "world_npcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"image_filenames" text[] DEFAULT '{}' NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_owners" (
	"world_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "world_owners_world_id_user_id_pk" PRIMARY KEY("world_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "world_sector_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector_id" uuid NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"shared_with_players" boolean DEFAULT false NOT NULL,
	"region" text,
	"trouble" text,
	"map_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"private_notes" "bytea",
	"public_notes" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worlds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" text,
	"name" text NOT NULL,
	"world_description_bytes" "bytea",
	"new_truths_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"system" "game_system" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yjs_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"state" "bytea",
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "yjs_documents_entity_type_entity_id_unique" UNIQUE("entity_type","entity_id")
);
--> statement-breakpoint
ALTER TABLE "campaign_ai_events" ADD CONSTRAINT "campaign_ai_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_ai_events" ADD CONSTRAINT "campaign_ai_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_characters" ADD CONSTRAINT "campaign_characters_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_characters" ADD CONSTRAINT "campaign_characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_characters" ADD CONSTRAINT "campaign_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_game_log" ADD CONSTRAINT "campaign_game_log_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_gms" ADD CONSTRAINT "campaign_gms_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_gms" ADD CONSTRAINT "campaign_gms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_notes" ADD CONSTRAINT "campaign_notes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_tracks" ADD CONSTRAINT "campaign_tracks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_assets" ADD CONSTRAINT "character_assets_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_game_log" ADD CONSTRAINT "character_game_log_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_notes" ADD CONSTRAINT "character_notes_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_tracks" ADD CONSTRAINT "character_tracks_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homebrew_collections" ADD CONSTRAINT "homebrew_collections_creator_users_id_fk" FOREIGN KEY ("creator") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homebrew_content" ADD CONSTRAINT "homebrew_content_collection_id_homebrew_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."homebrew_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homebrew_invite_keys" ADD CONSTRAINT "homebrew_invite_keys_collection_id_homebrew_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."homebrew_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_accessibility_settings" ADD CONSTRAINT "user_accessibility_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_custom_moves" ADD CONSTRAINT "user_custom_moves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_custom_oracles" ADD CONSTRAINT "user_custom_oracles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_settings" ADD CONSTRAINT "user_entity_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_oracle_settings" ADD CONSTRAINT "user_oracle_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_ai_settings" ADD CONSTRAINT "world_ai_settings_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_guides" ADD CONSTRAINT "world_guides_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_guides" ADD CONSTRAINT "world_guides_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_location_private_notes" ADD CONSTRAINT "world_location_private_notes_location_id_world_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."world_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_location_public_notes" ADD CONSTRAINT "world_location_public_notes_location_id_world_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."world_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_locations" ADD CONSTRAINT "world_locations_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_lore" ADD CONSTRAINT "world_lore_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_lore_private_notes" ADD CONSTRAINT "world_lore_private_notes_lore_id_world_lore_id_fk" FOREIGN KEY ("lore_id") REFERENCES "public"."world_lore"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_lore_public_notes" ADD CONSTRAINT "world_lore_public_notes_lore_id_world_lore_id_fk" FOREIGN KEY ("lore_id") REFERENCES "public"."world_lore"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_npc_private_notes" ADD CONSTRAINT "world_npc_private_notes_npc_id_world_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."world_npcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_npc_public_notes" ADD CONSTRAINT "world_npc_public_notes_npc_id_world_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."world_npcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_npcs" ADD CONSTRAINT "world_npcs_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_owners" ADD CONSTRAINT "world_owners_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_owners" ADD CONSTRAINT "world_owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_sector_locations" ADD CONSTRAINT "world_sector_locations_sector_id_world_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."world_sectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_sectors" ADD CONSTRAINT "world_sectors_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;