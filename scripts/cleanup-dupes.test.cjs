const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findDuplicateMemberIds,
  parseArgs,
} = require('./cleanup-dupes.cjs');

test('findDuplicateMemberIds keeps first member and trims case-insensitive duplicate names', () => {
  const rows = [
    { id: 'm1', name: ' Akemi ', created_at: 1 },
    { id: 'm2', name: 'akemi', created_at: 2 },
    { id: 'm3', name: 'Noor', created_at: 3 },
    { id: 'm4', name: 'NOOR ', created_at: 4 },
    { id: 'm5', name: 'Sol', created_at: 5 },
  ];

  const duplicates = findDuplicateMemberIds(rows);

  assert.deepEqual(duplicates, ['m2', 'm4']);
});

test('parseArgs defaults to dry-run mode', () => {
  assert.deepEqual(parseArgs([]), { apply: false });
});

test('parseArgs enables deletion only with --apply', () => {
  assert.deepEqual(parseArgs(['--apply']), { apply: true });
});
