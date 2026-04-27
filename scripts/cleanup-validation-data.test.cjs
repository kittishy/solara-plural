const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isValidationEmail,
  parseArgs,
  pickValidationAccounts,
} = require('./cleanup-validation-data.cjs');

test('isValidationEmail matches alpha.*@example.com and beta.*@example.com', () => {
  assert.equal(isValidationEmail('alpha.123@example.com'), true);
  assert.equal(isValidationEmail('beta.abc@example.com'), true);
  assert.equal(isValidationEmail('ALPHA.456@EXAMPLE.COM'), true);

  assert.equal(isValidationEmail('gamma.123@example.com'), false);
  assert.equal(isValidationEmail('alpha@example.com'), false);
  assert.equal(isValidationEmail('alpha.123@another.com'), false);
});

test('pickValidationAccounts returns only validation accounts', () => {
  const rows = [
    { id: '1', email: 'alpha.1@example.com' },
    { id: '2', email: 'real.user@example.com' },
    { id: '3', email: 'beta.9@example.com' },
  ];

  assert.deepEqual(
    pickValidationAccounts(rows).map((row) => row.id),
    ['1', '3'],
  );
});

test('parseArgs defaults to dry-run and supports --apply', () => {
  assert.deepEqual(parseArgs([]), { apply: false });
  assert.deepEqual(parseArgs(['--apply']), { apply: true });
});

