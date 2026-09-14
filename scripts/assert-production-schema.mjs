import postgres from 'postgres';

const EXPECTED_SCHEMA_VERSION = '20260913_03';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('[schema-gate] non-production build; production schema assertion skipped');
  process.exit(0);
}

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) {
  console.error('[schema-gate] SUPABASE_DATABASE_URL is required for production builds');
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  idle_timeout: 2,
  connect_timeout: 8,
  prepare: false,
});

try {
  const rows = await sql`
    select value
    from public.app_settings
    where key = 'schema_version'
    limit 1
  `;
  const actual = rows[0]?.value ?? null;
  if (actual !== EXPECTED_SCHEMA_VERSION) {
    console.error(
      `[schema-gate] production database is behind: expected ${EXPECTED_SCHEMA_VERSION}, got ${actual ?? 'missing'}`
    );
    process.exitCode = 1;
  } else {
    console.log(`[schema-gate] production schema ${actual} confirmed`);
  }
} catch (error) {
  console.error('[schema-gate] could not verify production schema', error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}
