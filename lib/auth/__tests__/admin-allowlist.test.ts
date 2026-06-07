import { describe, it, expect, afterEach } from 'vitest';
import { getAdminEmailAllowlist, isAdminEmail } from '../admin-allowlist';

const ORIGINAL = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ORIGINAL;
});

describe('getAdminEmailAllowlist', () => {
  it('returns an empty list when unset', () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAdminEmailAllowlist()).toEqual([]);
  });

  it('splits on commas and whitespace and lowercases', () => {
    process.env.ADMIN_EMAILS = 'A@x.com, B@Y.com\n  c@z.com';
    expect(getAdminEmailAllowlist()).toEqual(['a@x.com', 'b@y.com', 'c@z.com']);
  });

  it('ignores empty entries', () => {
    process.env.ADMIN_EMAILS = ' , ,a@x.com,';
    expect(getAdminEmailAllowlist()).toEqual(['a@x.com']);
  });
});

describe('isAdminEmail', () => {
  it('matches case-insensitively and trims', () => {
    process.env.ADMIN_EMAILS = 'owner@example.com';
    expect(isAdminEmail('Owner@Example.com')).toBe(true);
    expect(isAdminEmail('  owner@example.com  ')).toBe(true);
  });

  it('returns false for non-listed, null, undefined, or empty', () => {
    process.env.ADMIN_EMAILS = 'owner@example.com';
    expect(isAdminEmail('someone@else.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });

  it('returns false when allowlist is empty', () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail('owner@example.com')).toBe(false);
  });
});
