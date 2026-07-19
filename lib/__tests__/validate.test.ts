import { describe, expect, it } from 'vitest';
import {
  CAPS,
  AVATAR_DATA_URL_MAX,
  firstCapViolation,
  tagsCapViolation,
  optionalStrMax,
  isValidAvatarUrl,
} from '@/lib/api/validate';

describe('firstCapViolation', () => {
  it('returns null when every field fits', () => {
    expect(
      firstCapViolation([
        { label: 'Name', value: 'Luna', max: CAPS.memberName },
        { label: 'Notes', value: undefined, max: CAPS.memberNotes },
        { label: 'Color', value: null, max: CAPS.color },
      ]),
    ).toBeNull();
  });

  it('reports the first overflowing field with its cap', () => {
    expect(
      firstCapViolation([
        { label: 'Name', value: 'x'.repeat(CAPS.memberName + 1), max: CAPS.memberName },
        { label: 'Color', value: 'y'.repeat(CAPS.color + 1), max: CAPS.color },
      ]),
    ).toBe(`Name is too long (max ${CAPS.memberName} characters)`);
  });

  it('measures trimmed length', () => {
    const padded = `  ${'x'.repeat(CAPS.color)}  `;
    expect(firstCapViolation([{ label: 'Color', value: padded, max: CAPS.color }])).toBeNull();
  });

  it('ignores non-string values (type checks live elsewhere)', () => {
    expect(firstCapViolation([{ label: 'Name', value: 42, max: 1 }])).toBeNull();
  });
});

describe('tagsCapViolation', () => {
  it('accepts null and small tag lists', () => {
    expect(tagsCapViolation(null)).toBeNull();
    expect(tagsCapViolation(['host', 'protector'])).toBeNull();
  });

  it('rejects too many tags', () => {
    const tags = Array.from({ length: CAPS.tagCount + 1 }, (_, i) => `t${i}`);
    expect(tagsCapViolation(tags)).toBe(`Too many tags (max ${CAPS.tagCount})`);
  });

  it('rejects an oversized tag', () => {
    expect(tagsCapViolation(['x'.repeat(CAPS.tag + 1)])).toBe(
      `Tag is too long (max ${CAPS.tag} characters)`,
    );
  });
});

describe('optionalStrMax', () => {
  it('returns undefined for absent or empty values', () => {
    expect(optionalStrMax(undefined, 10)).toBeUndefined();
    expect(optionalStrMax(null, 10)).toBeUndefined();
    expect(optionalStrMax('   ', 10)).toBeUndefined();
  });

  it('returns the trimmed string when within cap', () => {
    expect(optionalStrMax('  hello  ', 10)).toBe('hello');
  });

  it('returns null for non-strings and overflow', () => {
    expect(optionalStrMax(42, 10)).toBeNull();
    expect(optionalStrMax('x'.repeat(11), 10)).toBeNull();
  });
});

describe('isValidAvatarUrl', () => {
  it('accepts https URLs within length', () => {
    expect(isValidAvatarUrl('https://example.com/avatar.png')).toBe(true);
  });

  it('accepts each allowed data-URL image type', () => {
    for (const mime of ['png', 'jpeg', 'webp', 'gif', 'avif']) {
      expect(isValidAvatarUrl(`data:image/${mime};base64,AAAA`)).toBe(true);
    }
  });

  it('rejects http, javascript, and non-image data URLs', () => {
    expect(isValidAvatarUrl('http://example.com/a.png')).toBe(false);
    // eslint-disable-next-line no-script-url
    expect(isValidAvatarUrl('javascript:alert(1)')).toBe(false);
    expect(isValidAvatarUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(isValidAvatarUrl('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(isValidAvatarUrl('ftp://example.com/a.png')).toBe(false);
    expect(isValidAvatarUrl('not a url')).toBe(false);
  });

  it('rejects oversized payloads', () => {
    const big = `data:image/webp;base64,${'A'.repeat(AVATAR_DATA_URL_MAX)}`;
    expect(big.length).toBeGreaterThan(AVATAR_DATA_URL_MAX);
    expect(isValidAvatarUrl(big)).toBe(false);
    expect(isValidAvatarUrl(`https://example.com/${'a'.repeat(CAPS.avatarHttpsUrl)}`)).toBe(false);
  });
});
