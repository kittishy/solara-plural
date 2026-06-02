import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations/DDL run against the DIRECT connection (port 5432), never the
    // transaction pooler.
    url: process.env.SUPABASE_DIRECT_URL!,
  },
});
