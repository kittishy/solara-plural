import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type SchemaDB = PostgresJsDatabase<typeof schema>;

let _db: SchemaDB | undefined;

function initDb(): SchemaDB {
  if (_db) return _db;
  const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('SUPABASE_DATABASE_URL environment variable is not set');
  // The app runs against the Supabase transaction pooler (port 6543). pgBouncer
  // in transaction mode does not support prepared statements, so disable them.
  const client = postgres(url, { prepare: false });
  _db = drizzle(client, { schema });
  // Postgres enforces foreign keys natively — no PRAGMA needed.
  return _db;
}

// Proxy defers connecting until first actual use so that importing this
// module during Next.js build (when the URL is absent) does not crash.
export const db: SchemaDB = new Proxy({} as SchemaDB, {
  get(_, prop: string | symbol) {
    const instance = initDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(instance) : value;
  },
});

export type DB = SchemaDB;
