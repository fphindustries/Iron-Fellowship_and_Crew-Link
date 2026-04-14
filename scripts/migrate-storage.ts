#!/usr/bin/env ts-node
/**
 * migrate-storage.ts
 *
 * Downloads all files from Firebase Storage and re-uploads to Supabase Storage.
 *
 * Usage:
 *   npx ts-node scripts/migrate-storage.ts \
 *     --firebase-service-account ./firebase-service-account.json \
 *     --supabase-url http://localhost:8000 \
 *     --supabase-service-role-key <key> \
 *     [--dry-run]
 *
 * Firebase Storage buckets → Supabase Storage buckets:
 *   {project}.appspot.com/portraits/  → character-portraits/{userId}/characters/{charId}/{file}
 *   {project}.appspot.com/worlds/     → world-images/{worldId}/{type}/{itemId}/{file}
 *
 * The script is idempotent: files that already exist in Supabase are skipped
 * unless --force is passed.
 */

import * as admin from "firebase-admin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ---------------------------------------------------------------------------
// CLI args
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
const force = args.includes("--force");

if (!firebaseServiceAccountPath || !supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Usage: ts-node migrate-storage.ts \\\n" +
    "  --firebase-service-account ./firebase-service-account.json \\\n" +
    "  --supabase-url http://localhost:8000 \\\n" +
    "  --supabase-service-role-key <key> \\\n" +
    "  [--dry-run] [--force]"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(firebaseServiceAccountPath), "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const bucket = admin.storage().bucket();

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const report: {
  uploaded: number;
  skipped: number;
  errors: { file: string; error: string }[];
} = { uploaded: 0, skipped: 0, errors: [] };

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Path mapping
// ---------------------------------------------------------------------------
interface MappedPath {
  supabaseBucket: string;
  supabaseObjectPath: string;
}

/**
 * Map a Firebase Storage file path to a Supabase bucket + object path.
 * Firebase paths observed in this app:
 *   portraits/{userId}/{charId}/{filename}
 *   worlds/{setting}/{worldId}/locations/{locId}/{filename}
 *   worlds/{setting}/{worldId}/npcs/{npcId}/{filename}
 *   worlds/{setting}/{worldId}/lore/{loreId}/{filename}
 */
function mapFirebasePath(firebasePath: string): MappedPath | null {
  if (firebasePath.startsWith("portraits/")) {
    // portraits/{userId}/{charId}/{filename} → character-portraits/{userId}/characters/{charId}/{filename}
    const parts = firebasePath.split("/");
    if (parts.length >= 4) {
      const [, userId, charId, ...rest] = parts;
      return {
        supabaseBucket: "character-portraits",
        supabaseObjectPath: `${userId}/characters/${charId}/${rest.join("/")}`,
      };
    }
  }

  if (firebasePath.startsWith("worlds/")) {
    // worlds/{setting}/{worldId}/{type}/{itemId}/{filename} → world-images/{worldId}/{type}/{itemId}/{filename}
    const parts = firebasePath.split("/");
    if (parts.length >= 6) {
      const [, , worldId, type, itemId, ...rest] = parts;
      return {
        supabaseBucket: "world-images",
        supabaseObjectPath: `${worldId}/${type}/${itemId}/${rest.join("/")}`,
      };
    }
  }

  // Unknown path structure — put in world-images with original path
  return {
    supabaseBucket: "world-images",
    supabaseObjectPath: firebasePath,
  };
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------
async function fileExistsInSupabase(bucketName: string, objectPath: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(bucketName).list(
    objectPath.split("/").slice(0, -1).join("/"),
    { search: objectPath.split("/").pop() }
  );
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

async function migrateFile(file: { name: string }): Promise<void> {
  const firebasePath = file.name;
  const mapped = mapFirebasePath(firebasePath);
  if (!mapped) {
    log(`  Skipping unmappable path: ${firebasePath}`);
    report.skipped++;
    return;
  }

  const { supabaseBucket, supabaseObjectPath } = mapped;

  if (!force) {
    const exists = await fileExistsInSupabase(supabaseBucket, supabaseObjectPath);
    if (exists) {
      report.skipped++;
      return;
    }
  }

  if (dryRun) {
    log(`  [DRY RUN] ${firebasePath} → ${supabaseBucket}/${supabaseObjectPath}`);
    report.uploaded++;
    return;
  }

  const tmpPath = path.join(os.tmpdir(), `migration_${Date.now()}_${path.basename(firebasePath)}`);

  try {
    // Download from Firebase
    const fileRef = bucket.file(firebasePath);
    await fileRef.download({ destination: tmpPath });

    // Upload to Supabase
    const fileBuffer = fs.readFileSync(tmpPath);

    // Detect content type from extension
    const ext = path.extname(firebasePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    const contentType = contentTypeMap[ext] ?? "application/octet-stream";

    const { error } = await supabase.storage
      .from(supabaseBucket)
      .upload(supabaseObjectPath, fileBuffer, {
        contentType,
        upsert: force,
      });

    if (error) {
      throw error;
    }

    report.uploaded++;
    log(`  ✓ ${firebasePath} → ${supabaseBucket}/${supabaseObjectPath}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report.errors.push({ file: firebasePath, error: msg });
    console.error(`  ERROR ${firebasePath}: ${msg}`);
  } finally {
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
}

async function main() {
  log("Starting Firebase Storage → Supabase Storage migration");
  if (dryRun) log("DRY RUN MODE: no files will be uploaded");

  // Ensure Supabase buckets exist
  if (!dryRun) {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketNames = (buckets ?? []).map((b) => b.name);

    if (!bucketNames.includes("character-portraits")) {
      await supabase.storage.createBucket("character-portraits", { public: true, fileSizeLimit: 5242880 });
      log("Created bucket: character-portraits");
    }
    if (!bucketNames.includes("world-images")) {
      await supabase.storage.createBucket("world-images", { public: false, fileSizeLimit: 5242880 });
      log("Created bucket: world-images");
    }
  }

  // List all files in Firebase Storage
  log("Listing Firebase Storage files...");
  const [files] = await bucket.getFiles();
  log(`Found ${files.length} files in Firebase Storage`);

  // Migrate in batches of 10 concurrent
  const BATCH_SIZE = 10;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(migrateFile));
    if (i % 100 === 0) {
      log(`Progress: ${i}/${files.length} (${report.uploaded} uploaded, ${report.skipped} skipped, ${report.errors.length} errors)`);
    }
  }

  // Write report
  const reportPath = path.join(process.cwd(), "storage-migration-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Storage migration complete.`);
  log(`Uploaded: ${report.uploaded}, Skipped: ${report.skipped}, Errors: ${report.errors.length}`);
  log(`Report written to ${reportPath}`);

  if (report.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
