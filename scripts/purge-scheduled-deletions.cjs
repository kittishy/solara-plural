const { createClient } = require('@libsql/client');
const { loadEnvConfig } = require('@next/env');

const RECOVERY_HOURS = 72;

function parseArgs(argv) {
  return { apply: argv.includes('--apply') };
}

function createClientFromEnv() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }
  return createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
}

async function listDueAccounts(client, nowSeconds) {
  const result = await client.execute({
    sql: `
      SELECT id, email, deletion_requested_at, deletion_scheduled_for
      FROM systems
      WHERE deletion_scheduled_for IS NOT NULL
        AND deletion_scheduled_for <= ?
    `,
    args: [nowSeconds],
  });
  return result.rows;
}

async function purgeDueAccounts(client, accountIds) {
  for (const id of accountIds) {
    await client.execute({ sql: 'DELETE FROM systems WHERE id = ?', args: [id] });
  }
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const client = createClientFromEnv();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const due = await listDueAccounts(client, nowSeconds);

  console.log(`${due.length} account(s) past the ${RECOVERY_HOURS}h recovery window.`);
  if (!due.length) return;

  for (const row of due) {
    console.log(`- ${row.id} (${row.email}) scheduled_for=${row.deletion_scheduled_for}`);
  }

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to permanently delete these accounts.');
    return;
  }

  await purgeDueAccounts(client, due.map((row) => row.id));
  console.log(`Deleted ${due.length} account(s).`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

module.exports = { parseArgs, listDueAccounts, purgeDueAccounts };