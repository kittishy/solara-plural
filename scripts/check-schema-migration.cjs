const { execFileSync } = require('node:child_process');

function output(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

let base;
if (process.env.GITHUB_BASE_REF) {
  base = `origin/${process.env.GITHUB_BASE_REF}`;
} else {
  try {
    base = output('git', ['rev-parse', 'HEAD^']);
  } catch {
    console.log('[migration-gate] no parent commit; nothing to compare');
    process.exit(0);
  }
}

const mergeBase = process.env.GITHUB_BASE_REF
  ? output('git', ['merge-base', base, 'HEAD'])
  : base;
const changed = output('git', ['diff', '--name-only', `${mergeBase}...HEAD`])
  .split('\n')
  .filter(Boolean);

const schemaChanged = changed.includes('lib/db/schema.ts');
const migrationChanged = changed.some((path) => path.startsWith('drizzle/migrations/') && path.endsWith('.sql'));

if (schemaChanged && !migrationChanged) {
  console.error('[migration-gate] lib/db/schema.ts changed without a SQL migration in drizzle/migrations/');
  process.exit(1);
}

console.log('[migration-gate] schema/migration diff is consistent');
