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

const journal = JSON.parse(readFileSync('./drizzle/meta/_journal.json', 'utf8'));

const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5_000 });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `);
  console.log('Ensured __drizzle_migrations table exists.');

  for (const entry of journal.entries) {
    const sql = readFileSync(`./drizzle/${entry.tag}.sql`, 'utf8');
    const hash = crypto.createHash('sha256').update(sql).digest('hex');
    const existing = await pool.query('SELECT id FROM __drizzle_migrations WHERE hash = $1', [hash]);
    if (existing.rows.length > 0) {
      console.log(`  ${entry.tag} — already tracked, skipping.`);
    } else {
      await pool.query('INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)', [hash, entry.when]);
      console.log(`  ${entry.tag} — inserted.`);
    }
  }

  console.log('\nDone. Now run: npm run drizzle:migrate:debug');
} finally {
  await pool.end();
}
