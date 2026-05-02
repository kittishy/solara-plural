const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PROVIDERS,
  mapPluralKitMember,
  planMemberSync,
} = require('../lib/integrations/member-sync-core.js');

test('plans updates through an existing external link instead of creating a duplicate', () => {
  const result = planMemberSync({
    existingMembers: [
      {
        id: 'local-a',
        name: 'Aster',
        pronouns: null,
        avatarUrl: null,
        description: null,
        color: null,
        role: null,
        tags: null,
        notes: null,
      },
    ],
    existingLinks: [
      {
        provider: PROVIDERS.PLURALKIT,
        externalId: 'pk-uuid-a',
        externalSecondaryId: 'abcde',
        memberId: 'local-a',
      },
    ],
    externalMembers: [
      mapPluralKitMember({
        id: 'abcde',
        uuid: 'pk-uuid-a',
        name: 'Aster',
        pronouns: 'they/them',
      }),
    ],
    options: {
      overrideFields: {
        pronouns: true,
      },
    },
  });

  assert.equal(result.summary.create, 0);
  assert.equal(result.summary.update, 1);
  assert.equal(result.operations[0].memberId, 'local-a');
  assert.equal(result.operations[0].patch.pronouns, 'they/them');
});

test('skips ambiguous local duplicate names instead of guessing a merge target', () => {
  const result = planMemberSync({
    existingMembers: [
      { id: 'local-a', name: 'Aster', pronouns: null, role: null, tags: null },
      { id: 'local-b', name: 'aster ', pronouns: null, role: null, tags: null },
    ],
    existingLinks: [],
    externalMembers: [
      mapPluralKitMember({
        id: 'abcde',
        uuid: 'pk-uuid-a',
        name: 'Aster',
      }),
    ],
    options: {},
  });

  assert.equal(result.summary.create, 0);
  assert.equal(result.summary.skip, 1);
  assert.equal(result.operations[0].reason, 'ambiguous_existing_match');
});

test('default sync options fill empty fields but do not overwrite existing local fields', () => {
  const result = planMemberSync({
    existingMembers: [
      {
        id: 'local-a',
        name: 'Aster',
        pronouns: 'they/them',
        avatarUrl: null,
        description: 'Local description',
        color: null,
        role: null,
        tags: null,
        notes: null,
      },
    ],
    existingLinks: [],
    externalMembers: [
      mapPluralKitMember({
        id: 'abcde',
        uuid: 'pk-uuid-a',
        name: 'Aster',
        pronouns: 'it/its',
        description: 'Remote description',
        color: 'A78BFA',
      }),
    ],
    options: {},
  });

  assert.equal(result.summary.update, 1);
  assert.equal(result.operations[0].patch.pronouns, undefined);
  assert.equal(result.operations[0].patch.description, undefined);
  assert.equal(result.operations[0].patch.color, '#a78bfa');
});

test('skips duplicate names in the external source before creating members', () => {
  const result = planMemberSync({
    existingMembers: [],
    existingLinks: [],
    externalMembers: [
      mapPluralKitMember({ id: 'sp-a', name: 'Aster' }),
      mapPluralKitMember({ id: 'sp-b', name: ' aster ' }),
    ],
    options: {},
  });

  assert.equal(result.summary.create, 0);
  assert.equal(result.summary.skip, 2);
  assert.equal(result.summary.skippedReasons.ambiguous_source_name, 2);
});
