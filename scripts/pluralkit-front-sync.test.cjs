const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPluralKitFrontSync,
  normalizeMemberIds,
} = require('../lib/integrations/pluralkit-front-sync.js');

test('normalizeMemberIds removes duplicates and blanks', () => {
  const result = normalizeMemberIds([' a ', '', 'b', 'a', '   ', 'b']);
  assert.deepEqual(result, ['a', 'b']);
});

test('sync skips when no persisted token exists', async () => {
  const sync = createPluralKitFrontSync({
    readPersistedToken: async () => null,
    resolveExternalIds: async () => ({ externalMemberIds: [], missingCount: 0 }),
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    },
    logger: { info() {}, warn() {}, error() {} },
  });

  const result = await sync('system-1', ['member-a']);
  assert.equal(result.status, 'skipped');
  assert.equal(result.reasonCode, 'missing_saved_token');
  assert.equal(result.providerStatus, 'skipped');
  assert.deepEqual(result.unmappedIds, ['member-a']);
});

test('sync proceeds when one or more members are not linked', async () => {
  const sync = createPluralKitFrontSync({
    readPersistedToken: async () => 'pk-token',
    resolveExternalIds: async () => ({
      externalMemberIds: ['pk-member-a'],
      resolvedLocalMemberIds: ['member-a'],
      unresolvedLocalMemberIds: ['member-b'],
    }),
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'switch-1' }),
    }),
    logger: { info() {}, warn() {}, error() {} },
  });

  const result = await sync('system-1', ['member-a', 'member-b']);
  assert.equal(result.status, 'synced');
  assert.equal(result.reasonCode, 'partial_member_links');
  assert.equal(result.providerStatus, 'ok');
  assert.equal(result.mappedCount, 1);
  assert.deepEqual(result.unmappedIds, ['member-b']);
});

test('sync pushes switch to pluralKit when mapping is complete', async () => {
  const seen = [];
  const sync = createPluralKitFrontSync({
    readPersistedToken: async () => 'pk-token',
    resolveExternalIds: async () => ({ externalMemberIds: ['pk-member-a', 'pk-member-b'], missingCount: 0 }),
    fetchImpl: async (url, init) => {
      seen.push({ url, init });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: 'switch-1' }),
      };
    },
    logger: { info() {}, warn() {}, error() {} },
  });

  const result = await sync('system-1', ['member-a', 'member-b']);
  assert.equal(result.status, 'synced');
  assert.equal(result.reasonCode, 'switch_created');
  assert.equal(result.providerStatus, 'ok');
  assert.equal(result.httpStatus, 200);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, 'https://api.pluralkit.me/v2/systems/@me/switches');
  assert.equal(seen[0].init.method, 'POST');
  assert.equal(JSON.parse(seen[0].init.body).members.length, 2);
});

test('sync reports provider failure when pluralKit rejects the switch update', async () => {
  const sync = createPluralKitFrontSync({
    readPersistedToken: async () => 'pk-token',
    resolveExternalIds: async () => ({ externalMemberIds: [], missingCount: 0 }),
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: 'unauthorized token' }),
    }),
    logger: { info() {}, warn() {}, error() {} },
  });

  const result = await sync('system-1', []);
  assert.equal(result.status, 'failed');
  assert.equal(result.reasonCode, 'provider_rejected_switch');
  assert.equal(result.providerStatus, 'error');
  assert.equal(result.details.statusCode, 401);
  assert.equal(result.details.message, 'unauthorized token');
});
