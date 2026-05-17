import { defineConfig } from 'drizzle-kit';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const configDir = __dirname;

for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(configDir, envFile);

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

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/starforged',
  },
});
