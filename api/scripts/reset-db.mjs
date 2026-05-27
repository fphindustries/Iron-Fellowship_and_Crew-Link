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

const url = new URL(DATABASE_URL);
console.log(`Resetting ${url.protocol}//${url.username}:***@${url.host}${url.pathname}`);
console.log('ALL DATA WILL BE LOST. Ctrl+C within 5 seconds to abort...');
await new Promise(r => setTimeout(r, 5000));

const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5_000 });

try {
  // Drop all tables in the public schema (CASCADE handles FK order)
  const tables = await pool.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
  `);
  for (const { tablename } of tables.rows) {
    await pool.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
    console.log(`  Dropped table: ${tablename}`);
  }

  // Drop all custom types (enums, composites, etc.)
  const types = await pool.query(`
    SELECT typname FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE nspname = 'public'
      AND typtype IN ('e', 'c')
  `);
  for (const { typname } of types.rows) {
    await pool.query(`DROP TYPE IF EXISTS "${typname}" CASCADE`);
    console.log(`  Dropped type: ${typname}`);
  }

  // Clear Drizzle's migration tracking table (lives in the 'drizzle' schema, not 'public')
  await pool.query(`DELETE FROM drizzle.__drizzle_migrations WHERE true`).catch(() => {});
  console.log('  Cleared drizzle.__drizzle_migrations');

  console.log('\nDatabase wiped. Now run: npm run drizzle:migrate:debug');
} finally {
  await pool.end();
}
