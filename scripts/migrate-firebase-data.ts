#!/usr/bin/env ts-node
/**
 * migrate-firebase-data.ts
 *
 * Migrates all data from Firebase (Firestore + Auth) to a self-hosted Supabase instance.
 *
 * Usage:
 *   npx ts-node scripts/migrate-firebase-data.ts \
 *     --firebase-service-account ./firebase-service-account.json \
 *     --supabase-url http://localhost:8000 \
 *     --supabase-service-role-key <key> \
 *     [--dry-run]
 *
 * The script is idempotent: all inserts use upsert (conflict on PK).
 * Run it multiple times safely.
 *
 * FK dependency order:
 *   auth.users (external) → users
 *   → campaigns → campaign_members, campaign_characters
 *   → characters → character_assets, character_tracks, character_game_log,
 *                   character_notes, character_note_content, character_settings
 *   → sessions → session_events, combats
 *   → worlds → world_ai_settings
 *     → locations, npcs, lore, sectors
 *       → *_public_notes, *_private_notes
 *       → sector_locations → sector_location_*_notes
 *   → homebrew_collections → homebrew_editor_invite_keys, homebrew_stats, ...
 *   → user_custom_oracles, user_custom_moves
 *   → user_accessibility_settings, user_oracle_settings
 *   → campaign_assets, campaign_tracks, campaign_game_log,
 *     campaign_notes, campaign_note_content, campaign_settings
 *   → ai_events, ai_rate_limits
 */

import * as admin from "firebase-admin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const firebaseServiceAccountPath = getArg("firebase-service-account");
const supabaseUrl = getArg("supabase-url") ?? process.env.SUPABASE_URL;
const supabaseServiceRoleKey = getArg("supabase-service-role-key") ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = args.includes("--dry-run");

if (!firebaseServiceAccountPath || !supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Usage: ts-node migrate-firebase-data.ts \\\n" +
    "  --firebase-service-account ./firebase-service-account.json \\\n" +
    "  --supabase-url http://localhost:8000 \\\n" +
    "  --supabase-service-role-key <key> \\\n" +
    "  [--dry-run]"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(firebaseServiceAccountPath), "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const report: {
  migrated: Record<string, number>;
  errors: { table: string; id: string; error: string }[];
} = { migrated: {}, errors: [] };

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function incrementMigrated(table: string, count = 1) {
  report.migrated[table] = (report.migrated[table] ?? 0) + count;
}

function recordError(table: string, id: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  report.errors.push({ table, id, error: msg });
  console.error(`  ERROR [${table}:${id}]: ${msg}`);
}

// ---------------------------------------------------------------------------
// Upsert helper
// ---------------------------------------------------------------------------
async function upsert(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  if (dryRun) {
    log(`  [DRY RUN] Would upsert ${rows.length} rows into ${table}`);
    incrementMigrated(table, rows.length);
    return;
  }

  // Batch in groups of 500 to stay within PostgREST limits
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from(table).upsert(batch as Parameters<typeof supabase.from>[0]);
    if (error) {
      for (const row of batch) {
        recordError(table, String((row as Record<string, unknown>).id ?? "unknown"), error);
      }
    } else {
      incrementMigrated(table, batch.length);
    }
  }
}

// ---------------------------------------------------------------------------
// Firebase helpers
// ---------------------------------------------------------------------------
async function getCollection(collectionPath: string): Promise<admin.firestore.QueryDocumentSnapshot[]> {
  const snap = await firestore.collection(collectionPath).get();
  return snap.docs;
}

async function getSubcollection(
  parentPath: string,
  subcollectionName: string
): Promise<admin.firestore.QueryDocumentSnapshot[]> {
  const snap = await firestore.collection(`${parentPath}/${subcollectionName}`).get();
  return snap.docs;
}

async function getDocData(docPath: string): Promise<admin.firestore.DocumentData | undefined> {
  const snap = await firestore.doc(docPath).get();
  return snap.data();
}

// ---------------------------------------------------------------------------
// Migration functions (in FK dependency order)
// ---------------------------------------------------------------------------

async function migrateUsers() {
  log("Migrating users...");
  const docs = await getCollection("users");
  const rows = docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      display_name: d.displayName ?? "Unknown User",
      photo_url: d.photoURL ?? null,
    };
  });
  await upsert("users", rows);
  log(`  users: ${rows.length} rows`);
}

async function migrateUserSettings(userId: string) {
  const accessibilityData = await getDocData(`users/${userId}/settings/accessibilitySettings`);
  if (accessibilityData) {
    await upsert("user_accessibility_settings", [{ user_id: userId, settings: accessibilityData }]);
  }

  const oracleData = await getDocData(`users/${userId}/settings/oracleSettings`);
  if (oracleData) {
    await upsert("user_oracle_settings", [{ user_id: userId, settings: oracleData }]);
  }
}

async function migrateUserCustomOracles(userId: string) {
  const docs = await getSubcollection(`users/${userId}`, "customOracles");
  const rows = docs.map((doc) => ({ id: doc.id, user_id: userId, data: doc.data() }));
  await upsert("user_custom_oracles", rows);
}

async function migrateUserCustomMoves(userId: string) {
  const docs = await getSubcollection(`users/${userId}`, "customMoves");
  const rows = docs.map((doc) => ({ id: doc.id, user_id: userId, data: doc.data() }));
  await upsert("user_custom_moves", rows);
}

async function migrateAllUsersSubcollections() {
  log("Migrating user subcollections (settings, custom oracles, custom moves)...");
  const userDocs = await getCollection("users");
  for (const userDoc of userDocs) {
    const uid = userDoc.id;
    await Promise.all([
      migrateUserSettings(uid),
      migrateUserCustomOracles(uid),
      migrateUserCustomMoves(uid),
    ]);
  }
  log("  user subcollections: done");
}

async function migrateCharacters() {
  log("Migrating characters...");
  const docs = await getCollection("characters");
  const rows = docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      uid: d.uid,
      name: d.name ?? "Unknown",
      stats: d.stats ?? {},
      condition_meters: d.conditionMeters ?? {},
      special_tracks: d.specialTracks ?? {},
      momentum: d.momentum ?? 2,
      momentum_reset: d.momentumReset ?? 2,
      max_momentum: d.maxMomentum ?? 10,
      debilities: d.debilities ?? {},
      experience_spent: d.experienceSpent ?? 0,
      experience: d.experience ?? 0,
      add_experience_to_legacies: d.addExperienceToLegacies ?? false,
      initiative_status: d.initiativeStatus ?? null,
      portrait_url: d.profileImage?.url ?? null,
      portrait_settings: d.profileImage ?? null,
      game_system: d.gameSystem ?? "ironsworn",
      setting_key: d.settingKey ?? null,
    };
  });
  await upsert("characters", rows);
  log(`  characters: ${rows.length} rows`);
}

async function migrateCharacterSubcollections(characterId: string) {
  // Assets
  const assetDocs = await getSubcollection(`characters/${characterId}`, "assets");
  const assets = assetDocs.map((doc, i) => ({
    id: doc.id,
    character_id: characterId,
    data: doc.data(),
    order: i,
  }));
  await upsert("character_assets", assets);

  // Tracks
  const trackDocs = await getSubcollection(`characters/${characterId}`, "tracks");
  const tracks = trackDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      character_id: characterId,
      type: d.type ?? 0,
      label: d.label ?? "",
      description: d.description ?? null,
      progress: d.progress ?? 0,
      difficulty: d.difficulty ?? null,
      completed: d.completed ?? false,
    };
  });
  await upsert("character_tracks", tracks);

  // Game log
  const logDocs = await getSubcollection(`characters/${characterId}`, "gamelog");
  const logs = logDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      character_id: characterId,
      campaign_id: d.campaignId ?? null,
      type: d.type ?? 0,
      roll_label: d.rollLabel ?? "",
      timestamp: d.timestamp?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      uid: d.uid ?? "",
      gms_only: d.gmsOnly ?? false,
      data: d,
    };
  });
  await upsert("character_game_log", logs);

  // Settings
  const settingsData = await getDocData(`characters/${characterId}/settings/settings`);
  if (settingsData) {
    await upsert("character_settings", [{ character_id: characterId, settings: settingsData }]);
  }

  // Notes
  const noteDocs = await getSubcollection(`characters/${characterId}`, "notes");
  const notes = noteDocs.map((doc, i) => {
    const d = doc.data();
    return {
      id: doc.id,
      character_id: characterId,
      title: d.title ?? "Untitled",
      order: d.order ?? i,
    };
  });
  await upsert("character_notes", notes);

  // Note content
  for (const noteDoc of noteDocs) {
    const contentData = await getDocData(`characters/${characterId}/notes/${noteDoc.id}/content/content`);
    if (contentData) {
      await upsert("character_note_content", [{
        note_id: noteDoc.id,
        content: contentData.content ?? null,
      }]);
    }
  }
}

async function migrateAllCharacterSubcollections() {
  log("Migrating character subcollections...");
  const docs = await getCollection("characters");
  for (const doc of docs) {
    try {
      await migrateCharacterSubcollections(doc.id);
    } catch (e) {
      recordError("character_subcollections", doc.id, e);
    }
  }
  log("  character subcollections: done");
}

async function migrateCampaigns() {
  log("Migrating campaigns...");
  const docs = await getCollection("campaigns");

  const campaigns = docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name ?? "Unnamed Campaign",
      game_system: d.gameSystem ?? "ironsworn",
      setting_key: d.settingKey ?? null,
      world_id: d.worldId ?? null,
      active_session_id: d.activeSessionId ?? null,
    };
  });
  await upsert("campaigns", campaigns);

  // campaign_members: explode users[] and gmIds[] arrays
  const members: Record<string, unknown>[] = [];
  const characters: Record<string, unknown>[] = [];

  for (const doc of docs) {
    const d = doc.data();
    const userIds: string[] = d.users ?? [];
    const gmIds: string[] = d.gmIds ?? [];

    for (const userId of userIds) {
      members.push({
        campaign_id: doc.id,
        user_id: userId,
        is_gm: gmIds.includes(userId),
      });
    }

    const charIds: string[] = d.characters ?? [];
    for (const charId of charIds) {
      characters.push({ campaign_id: doc.id, character_id: charId });
    }
  }

  await upsert("campaign_members", members);
  await upsert("campaign_characters", characters);
  log(`  campaigns: ${campaigns.length}, members: ${members.length}, characters: ${characters.length}`);
}

async function migrateCampaignSubcollections(campaignId: string) {
  // Assets
  const assetDocs = await getSubcollection(`campaigns/${campaignId}`, "assets");
  const assets = assetDocs.map((doc, i) => ({
    id: doc.id,
    campaign_id: campaignId,
    data: doc.data(),
    order: i,
  }));
  await upsert("campaign_assets", assets);

  // Tracks
  const trackDocs = await getSubcollection(`campaigns/${campaignId}`, "tracks");
  const tracks = trackDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      campaign_id: campaignId,
      type: d.type ?? 0,
      label: d.label ?? "",
      description: d.description ?? null,
      progress: d.progress ?? 0,
      difficulty: d.difficulty ?? null,
      completed: d.completed ?? false,
    };
  });
  await upsert("campaign_tracks", tracks);

  // Game log
  const logDocs = await getSubcollection(`campaigns/${campaignId}`, "gamelog");
  const logs = logDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      campaign_id: campaignId,
      character_id: d.characterId ?? null,
      type: d.type ?? 0,
      roll_label: d.rollLabel ?? "",
      timestamp: d.timestamp?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      uid: d.uid ?? "",
      gms_only: d.gmsOnly ?? false,
      data: d,
    };
  });
  await upsert("campaign_game_log", logs);

  // Settings
  const settingsData = await getDocData(`campaigns/${campaignId}/settings/settings`);
  if (settingsData) {
    await upsert("campaign_settings", [{ campaign_id: campaignId, settings: settingsData }]);
  }

  // Notes
  const noteDocs = await getSubcollection(`campaigns/${campaignId}`, "notes");
  const notes = noteDocs.map((doc, i) => {
    const d = doc.data();
    return {
      id: doc.id,
      campaign_id: campaignId,
      title: d.title ?? "Untitled",
      order: d.order ?? i,
    };
  });
  await upsert("campaign_notes", notes);

  for (const noteDoc of noteDocs) {
    const contentData = await getDocData(`campaigns/${campaignId}/notes/${noteDoc.id}/content/content`);
    if (contentData) {
      await upsert("campaign_note_content", [{
        note_id: noteDoc.id,
        content: contentData.content ?? null,
      }]);
    }
  }
}

async function migrateAllCampaignSubcollections() {
  log("Migrating campaign subcollections...");
  const docs = await getCollection("campaigns");
  for (const doc of docs) {
    try {
      await migrateCampaignSubcollections(doc.id);
    } catch (e) {
      recordError("campaign_subcollections", doc.id, e);
    }
  }
  log("  campaign subcollections: done");
}

async function migrateSessions() {
  log("Migrating sessions...");
  const campaignDocs = await getCollection("campaigns");

  for (const campaignDoc of campaignDocs) {
    const sessionDocs = await getSubcollection(`campaigns/${campaignDoc.id}`, "sessions");

    const sessions = sessionDocs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        campaign_id: campaignDoc.id,
        started_at: d.startedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        ended_at: d.endedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });
    await upsert("sessions", sessions);

    for (const sessionDoc of sessionDocs) {
      // Session events
      const eventDocs = await getSubcollection(
        `campaigns/${campaignDoc.id}/sessions/${sessionDoc.id}`,
        "events"
      );
      const events = eventDocs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          session_id: sessionDoc.id,
          campaign_id: campaignDoc.id,
          type: d.type ?? "unknown",
          timestamp: d.timestamp?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
          uid: d.uid ?? "",
          data: d,
        };
      });
      await upsert("session_events", events);

      // Combats
      const combatDocs = await getSubcollection(
        `campaigns/${campaignDoc.id}/sessions/${sessionDoc.id}`,
        "combats"
      );
      const combats = combatDocs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          session_id: sessionDoc.id,
          campaign_id: campaignDoc.id,
          objective: d.objective ?? "",
          enemies: d.enemies ?? [],
          position: d.position ?? "in_control",
          ended: d.ended ?? false,
        };
      });
      await upsert("combats", combats);
    }
  }
  log("  sessions, events, combats: done");
}

async function migrateWorlds() {
  log("Migrating worlds...");

  // Iron Fellowship worlds
  const ironDocs = await getCollection("worlds/ironsworn/worlds");
  // Crew Link worlds
  const starDocs = await getCollection("worlds/starforged/worlds");

  const allWorldDocs = [...ironDocs, ...starDocs];

  const worlds = allWorldDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name ?? "Unnamed World",
      setting_key: d.settingKey ?? (ironDocs.includes(doc) ? "classic" : "starforged"),
      description: d.description ?? null,
      owner_ids: d.ownerIds ?? [],
      campaign_guides: d.campaignGuides ?? [],
    };
  });
  await upsert("worlds", worlds);
  log(`  worlds: ${worlds.length} rows`);

  for (const doc of allWorldDocs) {
    try {
      await migrateWorldSubcollections(doc.id, ironDocs.includes(doc) ? "ironsworn" : "starforged");
    } catch (e) {
      recordError("world_subcollections", doc.id, e);
    }
  }
}

async function migrateWorldSubcollections(worldId: string, system: string) {
  const worldPath = `worlds/${system}/worlds/${worldId}`;

  // AI settings
  const aiData = await getDocData(`${worldPath}/ai/settings`);
  if (aiData) {
    await upsert("world_ai_settings", [{
      world_id: worldId,
      provider: aiData.provider ?? "openai",
      mode_configs: aiData.modeConfigs ?? {},
      world_tone_prompt: aiData.worldTonePrompt ?? null,
    }]);
  }

  // Locations
  const locationDocs = await getSubcollection(worldPath, "locations");
  const locations = locationDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      world_id: worldId,
      name: d.name ?? "Unknown Location",
      type: d.type ?? null,
      data: d,
    };
  });
  await upsert("locations", locations);

  for (const locationDoc of locationDocs) {
    const d = locationDoc.data();
    if (d.notes) {
      await upsert("location_public_notes", [{ location_id: locationDoc.id, notes: d.notes }]);
    }
    if (d.gmNotes || d.gmProperties) {
      await upsert("location_private_notes", [{
        location_id: locationDoc.id,
        gm_notes: d.gmNotes ?? null,
        fields: d.gmProperties ?? {},
      }]);
    }
  }

  // NPCs
  const npcDocs = await getSubcollection(worldPath, "npcs");
  const npcs = npcDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      world_id: worldId,
      name: d.name ?? "Unknown NPC",
      pronouns: d.pronouns ?? null,
      description: d.description ?? null,
      data: d,
      portrait_url: d.portraitUrl ?? null,
    };
  });
  await upsert("npcs", npcs);

  for (const npcDoc of npcDocs) {
    const d = npcDoc.data();
    if (d.notes) {
      await upsert("npc_public_notes", [{ npc_id: npcDoc.id, notes: d.notes }]);
    }
    if (d.gmNotes || d.gmProperties) {
      await upsert("npc_private_notes", [{
        npc_id: npcDoc.id,
        gm_notes: d.gmNotes ?? null,
        fields: d.gmProperties ?? {},
      }]);
    }
  }

  // Lore
  const loreDocs = await getSubcollection(worldPath, "lore");
  const lore = loreDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      world_id: worldId,
      name: d.name ?? "Unknown Lore",
      type: d.type ?? null,
      data: d,
    };
  });
  await upsert("lore", lore);

  for (const loreDoc of loreDocs) {
    const d = loreDoc.data();
    if (d.notes) {
      await upsert("lore_public_notes", [{ lore_id: loreDoc.id, notes: d.notes }]);
    }
    if (d.gmNotes || d.gmProperties) {
      await upsert("lore_private_notes", [{
        lore_id: loreDoc.id,
        gm_notes: d.gmNotes ?? null,
        fields: d.gmProperties ?? {},
      }]);
    }
  }

  // Sectors (Starforged only)
  const sectorDocs = await getSubcollection(worldPath, "sectors");
  const sectors = sectorDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      world_id: worldId,
      name: d.name ?? "Unknown Sector",
      region: d.region ?? null,
      data: d,
    };
  });
  await upsert("sectors", sectors);

  for (const sectorDoc of sectorDocs) {
    const d = sectorDoc.data();
    if (d.notes) {
      await upsert("sector_public_notes", [{ sector_id: sectorDoc.id, notes: d.notes }]);
    }
    if (d.gmNotes) {
      await upsert("sector_private_notes", [{
        sector_id: sectorDoc.id,
        gm_notes: d.gmNotes ?? null,
        fields: {},
      }]);
    }

    // Sector locations
    const sectorLocationDocs = await getSubcollection(
      `${worldPath}/sectors/${sectorDoc.id}`,
      "locations"
    );
    const sectorLocations = sectorLocationDocs.map((doc) => {
      const dl = doc.data();
      return {
        id: doc.id,
        sector_id: sectorDoc.id,
        name: dl.name ?? "Unknown Location",
        type: dl.type ?? null,
        data: dl,
      };
    });
    await upsert("sector_locations", sectorLocations);

    for (const slDoc of sectorLocationDocs) {
      const dl = slDoc.data();
      if (dl.notes) {
        await upsert("sector_location_public_notes", [{ sector_location_id: slDoc.id, notes: dl.notes }]);
      }
      if (dl.gmNotes) {
        await upsert("sector_location_private_notes", [{
          sector_location_id: slDoc.id,
          gm_notes: dl.gmNotes ?? null,
          fields: {},
        }]);
      }
    }
  }
}

async function migrateHomebrew() {
  log("Migrating homebrew collections...");

  const collectionDocs = await getCollection("homebrew/homebrew/collections");
  const collections = collectionDocs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title ?? "Untitled",
      description: d.description ?? null,
      setting_key: d.gameSystem ?? null,
      owners: d.owners ?? [],
      editors: d.editors ?? [],
      viewers: d.viewers ?? [],
      is_public: d.isPublic ?? false,
      data: d,
    };
  });
  await upsert("homebrew_collections", collections);
  log(`  homebrew_collections: ${collections.length} rows`);

  for (const doc of collectionDocs) {
    try {
      await migrateHomebrewSubcollections(doc.id);
    } catch (e) {
      recordError("homebrew_subcollections", doc.id, e);
    }
  }

  // Editor invite keys
  const inviteKeyDocs = await getCollection("homebrew/homebrew/editorInviteKeys");
  const inviteKeys = inviteKeyDocs.map((doc) => ({
    id: doc.id,
    collection_id: doc.data().collectionId,
  }));
  await upsert("homebrew_editor_invite_keys", inviteKeys);
  log(`  homebrew_editor_invite_keys: ${inviteKeys.length} rows`);
}

async function migrateHomebrewSubcollections(collectionId: string) {
  const basePath = `homebrew/homebrew/collections/${collectionId}`;

  async function migrateSubTable(
    subcollectionName: string,
    tableName: string,
    transform: (doc: admin.firestore.QueryDocumentSnapshot, i: number) => Record<string, unknown>
  ) {
    const docs = await getSubcollection(basePath, subcollectionName);
    const rows = docs.map(transform);
    await upsert(tableName, rows);
  }

  await migrateSubTable("stats", "homebrew_stats", (doc, i) => ({
    id: doc.id, collection_id: collectionId, data: doc.data(), order: i,
  }));
  await migrateSubTable("conditionMeters", "homebrew_condition_meters", (doc, i) => ({
    id: doc.id, collection_id: collectionId, data: doc.data(), order: i,
  }));
  await migrateSubTable("nonLinearMeters", "homebrew_non_linear_meters", (doc, i) => ({
    id: doc.id, collection_id: collectionId, data: doc.data(), order: i,
  }));
  await migrateSubTable("impacts", "homebrew_impacts", (doc, i) => ({
    id: doc.id, collection_id: collectionId, data: doc.data(), order: i,
  }));
  await migrateSubTable("legacyTracks", "homebrew_legacy_tracks", (doc, i) => ({
    id: doc.id, collection_id: collectionId, data: doc.data(), order: i,
  }));
  await migrateSubTable("oracleCollections", "homebrew_oracle_collections", (doc, i) => ({
    id: doc.id, collection_id: collectionId, data: doc.data(), order: i,
  }));
  await migrateSubTable("oracleTables", "homebrew_oracle_tables", (doc, i) => {
    const d = doc.data();
    return {
      id: doc.id,
      collection_id: collectionId,
      oracle_collection_id: d.collectionId ?? null,
      data: d,
      order: i,
    };
  });
  await migrateSubTable("moveCategories", "homebrew_move_categories", (doc, i) => ({
    id: doc.id, collection_id: collectionId, data: doc.data(), order: i,
  }));
  await migrateSubTable("moves", "homebrew_moves", (doc, i) => {
    const d = doc.data();
    return {
      id: doc.id,
      collection_id: collectionId,
      move_category_id: d.moveCategoryId ?? null,
      data: d,
      order: i,
    };
  });
  await migrateSubTable("assetCollections", "homebrew_asset_collections", (doc, i) => ({
    id: doc.id, collection_id: collectionId, data: doc.data(), order: i,
  }));
  await migrateSubTable("assets", "homebrew_assets", (doc, i) => {
    const d = doc.data();
    return {
      id: doc.id,
      collection_id: collectionId,
      asset_collection_id: d.assetCollectionId ?? null,
      data: d,
      order: i,
    };
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  log("Starting Firebase → Supabase migration");
  if (dryRun) log("DRY RUN MODE: no data will be written");

  try {
    await migrateUsers();
    await migrateAllUsersSubcollections();
    await migrateCampaigns();
    await migrateCharacters();
    await migrateAllCharacterSubcollections();
    await migrateAllCampaignSubcollections();
    await migrateSessions();
    await migrateWorlds();
    await migrateHomebrew();
  } catch (e) {
    console.error("Fatal error during migration:", e);
  }

  // Write report
  const reportPath = path.join(process.cwd(), "migration-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Migration complete. Report written to ${reportPath}`);
  log(`Migrated rows: ${JSON.stringify(report.migrated)}`);
  if (report.errors.length > 0) {
    log(`Errors (${report.errors.length}): see migration-report.json`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
