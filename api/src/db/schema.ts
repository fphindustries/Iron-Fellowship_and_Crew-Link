import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  unique,
  primaryKey,
  pgEnum,
  customType,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() { return 'bytea'; },
  toDriver(val) { return val; },
  fromDriver(val) { return val as Buffer; },
});

// ─── Enums ────────────────────────────────────────────────────────────────────

export const gameSystemEnum = pgEnum('game_system', ['ironsworn', 'starforged']);
export const campaignTypeEnum = pgEnum('campaign_type', ['solo', 'coop', 'guided']);
export const initiativeStatusEnum = pgEnum('initiative_status', [
  'hasInitiative',
  'outOfCombat',
  'doesNotHaveInitiative',
]);
export const trackTypeEnum = pgEnum('track_type', [
  'vow', 'journey', 'fray', 'bondProgress', 'clock', 'sceneChallenge',
]);
export const aiEventStatusEnum = pgEnum('ai_event_status', [
  'pending', 'accepted', 'rejected', 'edited',
]);
export const homebrewContentTypeEnum = pgEnum('homebrew_content_type', [
  'stat', 'conditionMeter', 'nonLinearMeter', 'impact',
  'legacyTrack', 'oracleTable', 'oracleCollection',
  'moveCategory', 'move', 'assetCollection', 'asset',
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull().default(''),
  photoUrl: text('photo_url'),
  hidePhoto: boolean('hide_photo').notNull().default(false),
  layoutJson: jsonb('layout_json').notNull().default({}),
  appVersion: text('app_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
});

// ─── Characters ───────────────────────────────────────────────────────────────

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  system: gameSystemEnum('system').notNull(),
  statsJson: jsonb('stats_json').notNull().default({}),
  conditionMetersJson: jsonb('condition_meters_json').notNull().default({}),
  momentum: integer('momentum').notNull().default(2),
  specialTracksJson: jsonb('special_tracks_json').notNull().default({}),
  experienceJson: jsonb('experience_json').notNull().default({}),
  debilitiesJson: jsonb('debilities_json').notNull().default({}),
  profileImage: text('profile_image'),
  expansionIds: text('expansion_ids').array().notNull().default([]),
  customTracksJson: jsonb('custom_tracks_json').notNull().default([]),
  theme: text('theme'),
  backstory: text('backstory'),
  initiativeStatus: initiativeStatusEnum('initiative_status').notNull().default('outOfCombat'),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterAssets = pgTable('character_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
});

export const characterTracks = pgTable('character_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  type: trackTypeEnum('type').notNull(),
  dataJson: jsonb('data_json').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterNotes = pgTable('character_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  shared: boolean('shared').notNull().default(false),
  content: bytea('content'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterGameLog = pgTable('character_game_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  system: gameSystemEnum('system').notNull(),
  type: campaignTypeEnum('type').notNull().default('solo'),
  theme: text('theme'),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'set null' }),
  expansionIds: text('expansion_ids').array().notNull().default([]),
  customTracksJson: jsonb('custom_tracks_json').notNull().default([]),
  conditionMetersJson: jsonb('condition_meters_json').notNull().default({}),
  specialTracksJson: jsonb('special_tracks_json').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const campaignMembers = pgTable('campaign_members', {
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.campaignId, t.userId] })]);

export const campaignGms = pgTable('campaign_gms', {
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.campaignId, t.userId] })]);

export const campaignCharacters = pgTable('campaign_characters', {
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.campaignId, t.characterId] })]);

export const campaignAssets = pgTable('campaign_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
});

export const campaignTracks = pgTable('campaign_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  type: trackTypeEnum('type').notNull(),
  dataJson: jsonb('data_json').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const campaignNotes = pgTable('campaign_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  shared: boolean('shared').notNull().default(false),
  content: bytea('content'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const campaignGameLog = pgTable('campaign_game_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const campaignAiEvents = pgTable('campaign_ai_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  contextSnapshotJson: jsonb('context_snapshot_json').notNull().default({}),
  responseJson: jsonb('response_json'),
  status: aiEventStatusEnum('status').notNull().default('pending'),
  canonized: boolean('canonized').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
});

// ─── Worlds ───────────────────────────────────────────────────────────────────

export const worlds = pgTable('worlds', {
  id: uuid('id').primaryKey().defaultRandom(),
  settingKey: text('setting_key'),
  name: text('name').notNull(),
  worldDescriptionBytes: bytea('world_description_bytes'),
  newTruthsJson: jsonb('new_truths_json').notNull().default({}),
  system: gameSystemEnum('system').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const worldOwners = pgTable('world_owners', {
  worldId: uuid('world_id').notNull().references(() => worlds.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.worldId, t.userId] })]);

export const worldGuides = pgTable('world_guides', {
  worldId: uuid('world_id').notNull().references(() => worlds.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  guideId: text('guide_id').notNull(),
}, (t) => [primaryKey({ columns: [t.worldId, t.campaignId] })]);

export const worldAiSettings = pgTable('world_ai_settings', {
  worldId: uuid('world_id').primaryKey().references(() => worlds.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('anthropic'),
  configJson: jsonb('config_json').notNull().default({}),
});

export const worldLocations = pgTable('world_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').notNull().references(() => worlds.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  imageFilenames: text('image_filenames').array().notNull().default([]),
  dataJson: jsonb('data_json').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const worldLocationPrivateNotes = pgTable('world_location_private_notes', {
  locationId: uuid('location_id').primaryKey().references(() => worldLocations.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
  content: bytea('content'),
});

export const worldLocationPublicNotes = pgTable('world_location_public_notes', {
  locationId: uuid('location_id').primaryKey().references(() => worldLocations.id, { onDelete: 'cascade' }),
  content: bytea('content'),
});

export const worldSectors = pgTable('world_sectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').notNull().references(() => worlds.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sharedWithPlayers: boolean('shared_with_players').notNull().default(false),
  region: text('region'),
  trouble: text('trouble'),
  mapJson: jsonb('map_json').notNull().default({}),
  privateNotes: bytea('private_notes'),
  publicNotes: bytea('public_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const worldSectorLocations = pgTable('world_sector_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectorId: uuid('sector_id').notNull().references(() => worldSectors.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
});

export const worldNpcs = pgTable('world_npcs', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').notNull().references(() => worlds.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  imageFilenames: text('image_filenames').array().notNull().default([]),
  dataJson: jsonb('data_json').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const worldNpcPrivateNotes = pgTable('world_npc_private_notes', {
  npcId: uuid('npc_id').primaryKey().references(() => worldNpcs.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
});

export const worldNpcPublicNotes = pgTable('world_npc_public_notes', {
  npcId: uuid('npc_id').primaryKey().references(() => worldNpcs.id, { onDelete: 'cascade' }),
  content: bytea('content'),
});

export const worldLore = pgTable('world_lore', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').notNull().references(() => worlds.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  imageFilenames: text('image_filenames').array().notNull().default([]),
  dataJson: jsonb('data_json').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const worldLorePrivateNotes = pgTable('world_lore_private_notes', {
  loreId: uuid('lore_id').primaryKey().references(() => worldLore.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
});

export const worldLorePublicNotes = pgTable('world_lore_public_notes', {
  loreId: uuid('lore_id').primaryKey().references(() => worldLore.id, { onDelete: 'cascade' }),
  content: bytea('content'),
});

// ─── User Content ─────────────────────────────────────────────────────────────

export const userCustomMoves = pgTable('user_custom_moves', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
});

export const userCustomOracles = pgTable('user_custom_oracles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
});

export const userOracleSettings = pgTable('user_oracle_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  pinnedOracleIdsJson: jsonb('pinned_oracle_ids_json').notNull().default({}),
});

export const userAccessibilitySettings = pgTable('user_accessibility_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  dataJson: jsonb('data_json').notNull().default({}),
});

export const userEntitySettings = pgTable('user_entity_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityId: uuid('entity_id').notNull(),
  entityType: text('entity_type').notNull(),
  dataJson: jsonb('data_json').notNull().default({}),
}, (t) => [unique().on(t.userId, t.entityId, t.entityType)]);

// ─── Homebrew ─────────────────────────────────────────────────────────────────

export const homebrewCollections = pgTable('homebrew_collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  creator: uuid('creator').notNull().references(() => users.id),
  editors: uuid('editors').array().notNull().default([]),
  viewers: uuid('viewers').array().notNull().default([]),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const homebrewContent = pgTable('homebrew_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => homebrewCollections.id, { onDelete: 'cascade' }),
  contentType: homebrewContentTypeEnum('content_type').notNull(),
  dataJson: jsonb('data_json').notNull().default({}),
});

export const homebrewInviteKeys = pgTable('homebrew_invite_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => homebrewCollections.id, { onDelete: 'cascade' }),
  key: text('key').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ─── Yjs Documents ────────────────────────────────────────────────────────────

export const yjsDocuments = pgTable('yjs_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  state: bytea('state'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.entityType, t.entityId)]);
