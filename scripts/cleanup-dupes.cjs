const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
  };
}

function loadEnvLocal() {
  const envFile = path.join(__dirname, '..', '.env.local');

  if (!fs.existsSync(envFile)) {
    throw new Error(`Missing env file: ${envFile}`);
  }

  fs.readFileSync(envFile, 'utf8').split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

function createDbClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  return createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
}

function normalizeMemberName(name) {
  return String(name ?? '').trim().toLowerCase();
}

function findDuplicateMemberIds(rows) {
  const seen = new Map();
  const toDelete = [];

  for (const row of rows) {
    const key = normalizeMemberName(row.name);
    if (!key) continue;

    if (seen.has(key)) {
      toDelete.push(String(row.id));
    } else {
      seen.set(key, row.id);
    }
  }

  return toDelete;
}

async function cleanup({ apply = false } = {}) {
  loadEnvLocal();
  const db = createDbClient();

  const res = await db.execute('SELECT id, name, created_at FROM members ORDER BY created_at ASC');
  const rows = res.rows;
  const toDelete = findDuplicateMemberIds(rows);

  console.log('All members:', JSON.stringify(rows.map((r) => ({ id: r.id, name: r.name }))));

  if (toDelete.length === 0) {
    console.log('No duplicates found.');
    return;
  }

  if (!apply) {
    console.log('Dry run. Duplicate member IDs that would be deleted:', toDelete);
    console.log('Run `node scripts/cleanup-dupes.cjs --apply` to delete these rows.');
    return;
  }

  console.log('Deleting duplicates:', toDelete);
  await db.batch(
    toDelete.map((id) => ({
      sql: 'DELETE FROM members WHERE id = ?',
      args: [id],
    })),
    'write'
  );
  console.log('Done. Deleted', toDelete.length, 'duplicate(s).');
}

if (require.main === module) {
  cleanup(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  cleanup,
  findDuplicateMemberIds,
  normalizeMemberName,
  parseArgs,
};
