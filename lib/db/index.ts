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
  // Pool sizing (docs/SYSTEM_DESIGN.md §5): the postgres.js default of 10
  // connections per serverless instance risks exhausting the shared pooler as
  // instances multiply, and holds idle sockets indefinitely. 5 covers a burst
  // of parallel route handlers on one instance; idle/lifetime caps return
  // connections to the pooler promptly.
  const client = postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
  });
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
