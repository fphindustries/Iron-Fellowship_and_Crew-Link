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

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const url = new URL(process.env.DATABASE_URL);
console.log(`Migrating ${url.protocol}//${url.username}:***@${url.host}${url.pathname}`);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
});

// ALTER TYPE ... ADD VALUE cannot run reliably inside a transaction (pre-PG12)
// and behaves unexpectedly inside a multi-migration transaction even in PG12+.
// Detect these statements so we can run them in auto-commit mode.
function needsAutoCommit(sql) {
  return /alter\s+type\s+.+\s+add\s+value/i.test(sql);
}

try {
  // Ensure Drizzle's migration tracking schema/table exist
  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `);

  const applied = await pool.query(
    `SELECT hash FROM drizzle.__drizzle_migrations`,
  );
  const appliedHashes = new Set(applied.rows.map((r) => r.hash));

  const journal = JSON.parse(readFileSync('./drizzle/meta/_journal.json', 'utf8'));

  for (const entry of journal.entries) {
    const sqlContent = readFileSync(`./drizzle/${entry.tag}.sql`, 'utf8');
    const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');

    if (appliedHashes.has(hash)) {
      console.log(`  ${entry.tag} — already applied, skipping.`);
      continue;
    }

    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`  ${entry.tag} — applying ${statements.length} statement(s)...`);

    // Run each migration in its own transaction, except ALTER TYPE ADD VALUE
    // which must run in auto-commit mode.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const stmt of statements) {
        if (needsAutoCommit(stmt)) {
          // Commit any open work first, then run outside a transaction
          await client.query('COMMIT');
          await client.query(stmt);
          await client.query('BEGIN');
        } else {
          await client.query(stmt);
        }
      }
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [hash, entry.when],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw Object.assign(new Error(`Migration ${entry.tag} failed: ${err.message}`), { cause: err });
    } finally {
      client.release();
    }

    console.log(`  ${entry.tag} — done.`);
  }

  console.log('Migrations applied.');
} catch (error) {
  console.error('Migration failed with detailed error:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
