import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(envFile);
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ''] = match;
    process.env[key] ??= rawValue.trim().replace(/^['"]|['"]$/g, '');
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5_000 });

try {
  // Migration 0007: ALTER TYPE must run outside a transaction
  await pool.query(`ALTER TYPE "public"."campaign_type" ADD VALUE IF NOT EXISTS 'ai-guided'`);
  console.log('0007: Added ai-guided to campaign_type enum');

  // Migration 0008: create campaign_ai_guide_state table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "campaign_ai_guide_state" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "campaign_id" uuid NOT NULL UNIQUE,
      "state_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await pool.query(`
    ALTER TABLE "campaign_ai_guide_state"
      ADD CONSTRAINT "campaign_ai_guide_state_campaign_id_campaigns_id_fk"
      FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action
  `).catch(e => {
    if (e.code === '42710') return; // constraint already exists
    throw e;
  });
  console.log('0008: Created campaign_ai_guide_state table');

  // Record both migrations in Drizzle's tracking table
  const journal = JSON.parse(readFileSync('./drizzle/meta/_journal.json', 'utf8'));
  for (const tag of ['0007_ai_guided_campaign_type', '0008_campaign_ai_guide_state']) {
    const entry = journal.entries.find(e => e.tag === tag);
    const sql = readFileSync(`./drizzle/${tag}.sql`, 'utf8');
    const hash = crypto.createHash('sha256').update(sql).digest('hex');
    await pool.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [hash, entry.when],
    );
    console.log(`  Recorded ${tag} in migration tracking`);
  }

  console.log('\nDone. Restart the API server.');
} finally {
  await pool.end();
}
