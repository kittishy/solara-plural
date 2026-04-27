const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const VALIDATION_EMAIL_PATTERN = /^(alpha|beta)\..+@example\.com$/i;

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

function isValidationEmail(email) {
  return VALIDATION_EMAIL_PATTERN.test(String(email ?? '').trim().toLowerCase());
}

function pickValidationAccounts(rows) {
  return rows.filter((row) => isValidationEmail(row.email));
}

async function cleanupValidationData({ apply = false } = {}) {
  loadEnvLocal();
  const db = createDbClient();

  const res = await db.execute('SELECT id, name, email, created_at FROM systems ORDER BY created_at ASC');
  const candidates = pickValidationAccounts(res.rows);

  if (candidates.length === 0) {
    console.log('No validation accounts found.');
    return;
  }

  console.log('Validation accounts matched:', JSON.stringify(
    candidates.map((row) => ({ id: row.id, email: row.email, name: row.name })),
  ));

  if (!apply) {
    console.log('Dry run only. Run `node scripts/cleanup-validation-data.cjs --apply` to delete these accounts.');
    return;
  }

  await db.batch(
    candidates.map((row) => ({
      sql: 'DELETE FROM systems WHERE id = ?',
      args: [row.id],
    })),
    'write',
  );

  console.log(`Done. Deleted ${candidates.length} validation account(s).`);
}

if (require.main === module) {
  cleanupValidationData(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  cleanupValidationData,
  isValidationEmail,
  parseArgs,
  pickValidationAccounts,
};

