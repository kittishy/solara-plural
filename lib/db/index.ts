import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;

// SQLite disables FK enforcement by default. Enabling it here ensures that
// ON DELETE CASCADE / ON DELETE RESTRICT constraints defined in the schema
// are actually enforced at runtime.
void db.run(sql`PRAGMA foreign_keys = ON`);
