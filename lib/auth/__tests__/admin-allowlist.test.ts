import { describe, it, expect, afterEach } from 'vitest';
import { getAdminEmailAllowlist, isAdminEmail, OWNER_EMAIL } from '../admin-allowlist';

const ORIGINAL = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ORIGINAL;
});

describe('getAdminEmailAllowlist', () => {
  it('always contains the hardcoded owner, even when unset', () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAdminEmailAllowlist()).toEqual([OWNER_EMAIL.toLowerCase()]);
  });

  it('adds env entries after the owner, splitting on commas/whitespace and lowercasing', () => {
    process.env.ADMIN_EMAILS = 'A@x.com, B@Y.com\n  c@z.com';
    expect(getAdminEmailAllowlist()).toEqual([
      OWNER_EMAIL.toLowerCase(),
      'a@x.com',
      'b@y.com',
      'c@z.com',
    ]);
  });

  it('ignores empty entries and de-duplicates the owner', () => {
    process.env.ADMIN_EMAILS = ` , ,${OWNER_EMAIL},a@x.com,`;
    expect(getAdminEmailAllowlist()).toEqual([OWNER_EMAIL.toLowerCase(), 'a@x.com']);
  });
});

describe('isAdminEmail', () => {
  it('matches the owner case-insensitively and trimmed, with no env set', () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail(OWNER_EMAIL.toUpperCase())).toBe(true);
    expect(isAdminEmail(`  ${OWNER_EMAIL}  `)).toBe(true);
  });

  it('returns false for any non-owner, null, undefined, or empty', () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail('someone@else.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });

  it('also authorizes additional emails configured via ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = 'extra@team.com';
    expect(isAdminEmail('extra@team.com')).toBe(true);
    expect(isAdminEmail(OWNER_EMAIL)).toBe(true);
    expect(isAdminEmail('nope@team.com')).toBe(false);
  });
});
