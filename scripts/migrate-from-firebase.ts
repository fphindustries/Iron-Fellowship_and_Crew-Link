/**
 * One-time Firestore → PostgreSQL migration script.
 *
 * Requirements:
 *   - GOOGLE_APPLICATION_CREDENTIALS pointing to a Firebase Admin service account JSON
 *   - DATABASE_URL pointing to the target PostgreSQL instance
 *   - MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY for Storage migration
 *   - FIREBASE_STORAGE_BUCKET (source Firebase Storage bucket name)
 *   - MINIO_BUCKET (destination MinIO bucket name)
 *
 * Usage:
 *   npx tsx scripts/migrate-from-firebase.ts
 */

import * as admin from "firebase-admin";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import * as schema from "../api/src/db/schema";
import crypto from "crypto";

// ─── Firebase init ────────────────────────────────────────────────────────────

admin.initializeApp();
const firestore = admin.firestore();
const storageBucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);

// ─── PostgreSQL / Drizzle init ─────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ─── MinIO / S3 init ──────────────────────────────────────────────────────────

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
  },
  region: "us-east-1",
  forcePathStyle: true,
});

const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "starforged";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function copyStorageFile(sourcePath: string, destKey: string): Promise<void> {
  try {
    const file = storageBucket.file(sourcePath);
    const [exists] = await file.exists();
    if (!exists) return;

    const [buffer] = await file.download();
    await s3.send(new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: destKey,
      Body: buffer,
    }));
    console.log(`  copied storage: ${sourcePath} → ${destKey}`);
  } catch (e) {
    console.warn(`  WARN: could not copy ${sourcePath}: ${e}`);
  }
}

// ─── Users migration ──────────────────────────────────────────────────────────

async function migrateUsers(): Promise<Map<string, string>> {
  const firebaseToPostgresId = new Map<string, string>();
  console.log("Migrating users...");

  const fbUsers = await admin.auth().listUsers(1000);
  for (const fbUser of fbUsers.users) {
    const [pgUser] = await db
      .insert(schema.users)
      .values({
        email: fbUser.email ?? `${fbUser.uid}@unknown.invalid`,
        displayName: fbUser.displayName ?? "",
        photoUrl: fbUser.photoURL ?? null,
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: {
          displayName: fbUser.displayName ?? "",
          photoUrl: fbUser.photoURL ?? null,
        },
      })
      .returning();
    firebaseToPostgresId.set(fbUser.uid, pgUser.id);
  }

  console.log(`  migrated ${fbUsers.users.length} users`);
  return firebaseToPostgresId;
}

// ─── Characters migration ─────────────────────────────────────────────────────

async function migrateCharacters(uidMap: Map<string, string>): Promise<Map<string, string>> {
  const charIdMap = new Map<string, string>();
  console.log("Migrating characters...");
  let count = 0;

  const charactersSnap = await firestore.collectionGroup("characters").get();
  for (const doc of charactersSnap.docs) {
    const data = doc.data();
    const fbUid = data.uid as string;
    const pgUserId = uidMap.get(fbUid);
    if (!pgUserId) continue;

    const [pgChar] = await db
      .insert(schema.characters)
      .values({
        userId: pgUserId,
        name: data.name ?? "Unknown",
        system: data.system ?? "ironsworn",
        statsJson: data.stats ?? {},
        conditionMetersJson: data.conditionMeters ?? {},
        momentum: data.momentum ?? 2,
        specialTracksJson: data.specialTracks ?? {},
        experienceJson: data.experience ?? {},
        debilitiesJson: data.debilities ?? {},
        expansionIds: data.expansionIds ?? [],
        customTracksJson: data.customTracks ?? {},
        theme: data.theme ?? null,
        backstory: data.backstory ?? null,
      })
      .returning();

    charIdMap.set(doc.id, pgChar.id);
    count++;

    // Migrate character portrait
    if (data.profileImage?.filename) {
      await copyStorageFile(
        `characters/${fbUid}/characters/${doc.id}/${data.profileImage.filename}`,
        `characters/${pgUserId}/characters/${pgChar.id}/${data.profileImage.filename}`
      );
    }
  }

  console.log(`  migrated ${count} characters`);
  return charIdMap;
}

// ─── Campaigns migration ──────────────────────────────────────────────────────

async function migrateCampaigns(uidMap: Map<string, string>): Promise<Map<string, string>> {
  const campaignIdMap = new Map<string, string>();
  console.log("Migrating campaigns...");
  let count = 0;

  const snap = await firestore.collection("campaigns").get();
  for (const doc of snap.docs) {
    const data = doc.data();

    const [pgCampaign] = await db
      .insert(schema.campaigns)
      .values({
        name: data.name ?? "Unnamed Campaign",
        system: data.system ?? "ironsworn",
        type: (data.type ?? "solo") as any,
        theme: data.theme ?? null,
        expansionIds: data.expansionIds ?? [],
        customTracksJson: data.customTracks ?? [],
        conditionMetersJson: data.conditionMeters ?? {},
        specialTracksJson: data.specialTracks ?? {},
      })
      .returning();

    campaignIdMap.set(doc.id, pgCampaign.id);
    count++;

    // Add members
    const users: string[] = data.users ?? [];
    for (const fbUid of users) {
      const pgUserId = uidMap.get(fbUid);
      if (!pgUserId) continue;
      await db.insert(schema.campaignMembers)
        .values({ campaignId: pgCampaign.id, userId: pgUserId })
        .onConflictDoNothing();
    }

    // Add GMs
    const gmIds: string[] = data.gmIds ?? [];
    for (const fbUid of gmIds) {
      const pgUserId = uidMap.get(fbUid);
      if (!pgUserId) continue;
      await db.insert(schema.campaignGms)
        .values({ campaignId: pgCampaign.id, userId: pgUserId })
        .onConflictDoNothing();
    }
  }

  console.log(`  migrated ${count} campaigns`);
  return campaignIdMap;
}

// ─── Worlds migration ─────────────────────────────────────────────────────────

async function migrateWorlds(uidMap: Map<string, string>): Promise<Map<string, string>> {
  const worldIdMap = new Map<string, string>();
  console.log("Migrating worlds...");
  let count = 0;

  const snap = await firestore.collection("worlds").get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const settingsDoc = await firestore.doc(`worlds/${doc.id}/settings/ai-prompts`).get();
    const aiSettings = settingsDoc.exists ? settingsDoc.data() : null;

    const [pgWorld] = await db
      .insert(schema.worlds)
      .values({
        name: data.name ?? "Unnamed World",
        system: data.system ?? "ironsworn",
        newTruthsJson: data.newTruths ?? {},
        settingKey: data.settingKey ?? null,
      })
      .returning();

    worldIdMap.set(doc.id, pgWorld.id);
    count++;

    // World owners (first user in ownerIds or data.uid)
    const ownerIds: string[] = data.ownerIds ?? (data.uid ? [data.uid] : []);
    for (const fbUid of ownerIds) {
      const pgUserId = uidMap.get(fbUid);
      if (!pgUserId) continue;
      await db.insert(schema.worldOwners)
        .values({ worldId: pgWorld.id, userId: pgUserId })
        .onConflictDoNothing();
    }

    // AI settings
    if (aiSettings) {
      await db.insert(schema.worldAiSettings)
        .values({
          worldId: pgWorld.id,
          provider: aiSettings.provider ?? "openai",
          configJson: aiSettings,
        })
        .onConflictDoNothing();
    }
  }

  console.log(`  migrated ${count} worlds`);
  return worldIdMap;
}

// ─── Homebrew migration ───────────────────────────────────────────────────────

async function migrateHomebrew(uidMap: Map<string, string>): Promise<void> {
  console.log("Migrating homebrew collections...");
  let count = 0;

  const snap = await firestore.collection("homebrew").get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const creatorFbUid = data.creator as string;
    const creatorPgId = uidMap.get(creatorFbUid);
    if (!creatorPgId) continue;

    const [pgHb] = await db
      .insert(schema.homebrewCollections)
      .values({
        name: data.name ?? "Unnamed Homebrew",
        creator: creatorPgId,
        description: data.description ?? null,
        editors: (data.editors as string[] ?? []).map((e) => uidMap.get(e)).filter(Boolean) as string[],
        viewers: (data.viewers as string[] ?? []).map((v) => uidMap.get(v)).filter(Boolean) as string[],
      })
      .returning();

    count++;

    // Content
    const contentSnap = await firestore.collection(`homebrew/${doc.id}/content`).get();
    for (const contentDoc of contentSnap.docs) {
      const cd = contentDoc.data();
      await db.insert(schema.homebrewContent).values({
        collectionId: pgHb.id,
        contentType: cd.type as any,
        dataJson: cd,
      }).onConflictDoNothing();
    }
  }

  console.log(`  migrated ${count} homebrew collections`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Starforged Firebase → PostgreSQL Migration ===\n");

  const uidMap = await migrateUsers();
  const charIdMap = await migrateCharacters(uidMap);
  const campaignIdMap = await migrateCampaigns(uidMap);
  const worldIdMap = await migrateWorlds(uidMap);
  await migrateHomebrew(uidMap);

  console.log("\n=== Migration complete ===");
  console.log(`Users: ${uidMap.size}`);
  console.log(`Characters: ${charIdMap.size}`);
  console.log(`Campaigns: ${campaignIdMap.size}`);
  console.log(`Worlds: ${worldIdMap.size}`);

  await pool.end();
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
