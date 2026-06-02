/*
 * One-shot data copy: Turso (libSQL/SQLite) -> Supabase (Postgres).
 *
 * Reads every table from the current Turso database and inserts the rows into
 * the Supabase Postgres database, converting epoch-second timestamps into real
 * Postgres `timestamp` values. Tables are copied in FK-dependency order, and
 * every insert uses `ON CONFLICT (id) DO NOTHING`, so the script is safe to
 * re-run.
 *
 * It only READS from Turso — it never writes to it. Turso stays untouched as
 * the rollback.
 *
 * Required env (in .env.local):
 *   DATABASE_URL          - Turso libSQL URL  (source)
 *   DATABASE_AUTH_TOKEN   - Turso auth token  (source)
 *   SUPABASE_DIRECT_URL   - Supabase direct connection, port 5432 (target)
 *
 * Usage:  node scripts/migrate-turso-to-supabase.cjs
 */
const { createClient } = require('@libsql/client');
const postgres = require('postgres');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

// Tables in FK-safe insertion order, each with the columns that hold
// epoch-second timestamps in SQLite and must become Postgres timestamps.
const TABLES = [
  ['systems', ['deletion_requested_at', 'deletion_scheduled_for', 'created_at', 'updated_at']],
  ['members', ['created_at', 'updated_at']],
  ['custom_fields', ['created_at', 'updated_at']],
  ['password_reset_tokens', ['expires_at', 'used_at', 'created_at']],
  ['system_friend_requests', ['created_at', 'responded_at']],
  ['system_friendships', ['created_at']],
  ['system_partner_requests', ['created_at', 'responded_at']],
  ['system_partnerships', ['partnered_since', 'anniversary_date', 'last_checkin_at', 'created_at']],
  ['system_blocks', ['created_at']],
  ['system_integrations', ['created_at', 'updated_at']],
  ['notification_push_tokens', ['last_seen_at', 'revoked_at', 'created_at', 'updated_at']],
  ['notifications', ['read_at', 'created_at']],
  ['front_entries', ['started_at', 'ended_at', 'created_at']],
  ['system_notes', ['created_at', 'updated_at']],
  ['system_journal', ['created_at', 'updated_at']],
  ['system_chat_channels', ['created_at']],
  ['system_chat_messages', ['created_at']],
  ['member_field_values', ['created_at', 'updated_at']],
  ['member_external_links', ['last_synced_at', 'created_at', 'updated_at']],
  ['partnership_notes', ['created_at', 'updated_at']],
  ['alter_partner_pairings', ['created_at']],
  ['partnership_milestones', ['occurred_on', 'created_at']],
  ['partnership_bucket_items', ['completed_at', 'created_at', 'updated_at']],
  ['notification_deliveries', ['sent_at', 'created_at', 'updated_at']],
  ['system_friend_member_shares', ['created_at', 'updated_at']],
];

function epochToDate(value) {
  if (value === null || value === undefined) return null;
  // SQLite stored these as integer seconds since the epoch.
  return new Date(Number(value) * 1000);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL (Turso) is required.');
  if (!process.env.SUPABASE_DIRECT_URL) throw new Error('SUPABASE_DIRECT_URL is required.');

  const turso = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const pg = postgres(process.env.SUPABASE_DIRECT_URL, { prepare: false });

  let grandTotal = 0;
  try {
    for (const [table, tsCols] of TABLES) {
      const { rows } = await turso.execute(`SELECT * FROM ${table}`);
      if (rows.length === 0) {
        console.log(`- ${table}: 0 rows (skip)`);
        continue;
      }

      const tsSet = new Set(tsCols);
      const records = rows.map((row) => {
        const out = {};
        for (const [key, value] of Object.entries(row)) {
          out[key] = tsSet.has(key) ? epochToDate(value) : value;
        }
        return out;
      });

      const columns = Object.keys(records[0]);
      const inserted = await pg`
        INSERT INTO ${pg(table)} ${pg(records, columns)}
        ON CONFLICT (id) DO NOTHING
      `;
      grandTotal += inserted.count;
      console.log(`✓ ${table}: ${rows.length} read, ${inserted.count} inserted`);
    }
    console.log(`\nDone. ${grandTotal} rows inserted into Supabase.`);
  } finally {
    await pg.end({ timeout: 5 });
    turso.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
