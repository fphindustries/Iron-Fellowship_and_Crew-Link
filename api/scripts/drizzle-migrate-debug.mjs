import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(envFile);

  if (!existsSync(envPath)) {
    continue;
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue = ''] = match;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, '');

    process.env[key] ??= value;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const url = new URL(process.env.DATABASE_URL);
console.log(`Migrating ${url.protocol}//${url.username}:***@${url.host}${url.pathname}`);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
});

try {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');
} catch (error) {
  console.error('Migration failed with detailed error:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
