import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
console.log(`Connecting to ${url.protocol}//${url.username}:***@${url.host}${url.pathname}`);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
});

try {
  const { rows } = await pool.query(`
    select
      current_database() as database,
      current_user as user,
      current_schema() as schema,
      inet_server_addr() as server_addr,
      inet_server_port() as server_port,
      has_database_privilege(current_user, current_database(), 'CREATE') as can_create_database_objects,
      has_schema_privilege(current_user, 'public', 'USAGE') as can_use_public_schema,
      has_schema_privilege(current_user, 'public', 'CREATE') as can_create_in_public_schema,
      gen_random_uuid() is not null as can_generate_random_uuid
  `);

  console.table(rows);
} finally {
  await pool.end();
}
