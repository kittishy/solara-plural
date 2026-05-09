const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parsePluralKitFronters,
  readRetryAfter,
} = require('../lib/integrations/pluralkit-api.js');

test('parsePluralKitFronters reads member ids from PluralKit switch object', () => {
  const result = parsePluralKitFronters({
    id: 'switch-id',
    timestamp: '2026-05-08T12:34:56.000Z',
    members: [
      { id: 'abcde', uuid: 'member-uuid-a', name: 'Aster' },
      { id: 'fghij', uuid: 'member-uuid-b', name: 'Briar' },
    ],
  });

  assert.deepEqual(result.externalIds, ['member-uuid-a', 'member-uuid-b']);
  assert.equal(result.memberRecords.length, 2);
  assert.equal(result.startedAt.toISOString(), '2026-05-08T12:34:56.000Z');
});

test('parsePluralKitFronters treats 204/null as empty front', () => {
  const result = parsePluralKitFronters(null);

  assert.deepEqual(result.externalIds, []);
  assert.deepEqual(result.memberRecords, []);
  assert.equal(result.startedAt, null);
});

test('parsePluralKitFronters dedupes current fronters while preserving order', () => {
  const result = parsePluralKitFronters({
    timestamp: '2026-05-08T12:34:56.000Z',
    members: [
      { id: 'abcde', uuid: 'member-uuid-a' },
      { id: 'abcde', uuid: 'member-uuid-a' },
      { id: 'fghij' },
    ],
  });

  assert.deepEqual(result.externalIds, ['member-uuid-a', 'fghij']);
});

test('readRetryAfter formats PluralKit retry_after milliseconds', () => {
  assert.equal(readRetryAfter({ retry_after: 19 }), '19 ms');
  assert.equal(readRetryAfter({ retry_after: 1400 }), '2 seconds');
});
