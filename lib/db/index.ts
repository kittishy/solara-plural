import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

type SchemaDB = LibSQLDatabase<typeof schema>;

let _db: SchemaDB | undefined;

function initDb(): SchemaDB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  _db = drizzle(client, { schema });
  // SQLite disables FK enforcement by default. Enabling it here ensures that
  // ON DELETE CASCADE / ON DELETE RESTRICT constraints are enforced at runtime.
  void _db.run(sql`PRAGMA foreign_keys = ON`);
  return _db;
}

// Proxy defers createClient until first actual use so that importing this
// module during Next.js build (when DATABASE_URL is absent) does not crash.
export const db: SchemaDB = new Proxy({} as SchemaDB, {
  get(_, prop: string | symbol) {
    const instance = initDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(instance) : value;
  },
});

export type DB = SchemaDB;
