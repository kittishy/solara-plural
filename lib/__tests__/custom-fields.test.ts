import { describe, it, expect } from 'vitest';
import {
  parseCustomFieldType,
  normalizeCustomFieldName,
  normalizeCustomFieldDescription,
  parseCustomFieldOptions,
  serializeCustomFieldOptions,
  parseStoredCustomFieldOptions,
} from '../custom-fields';

describe('parseCustomFieldType', () => {
  it('accepts valid types', () => {
    expect(parseCustomFieldType('text')).toBe('text');
    expect(parseCustomFieldType('number')).toBe('number');
    expect(parseCustomFieldType('checkbox')).toBe('checkbox');
    expect(parseCustomFieldType('select')).toBe('select');
    expect(parseCustomFieldType('date')).toBe('date');
    expect(parseCustomFieldType('long_text')).toBe('long_text');
  });

  it('returns null for invalid types', () => {
    expect(parseCustomFieldType('invalid')).toBeNull();
    expect(parseCustomFieldType(null)).toBeNull();
    expect(parseCustomFieldType(42)).toBeNull();
  });
});

describe('normalizeCustomFieldName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeCustomFieldName('  my  field  ')).toBe('my field');
  });

  it('returns null for empty string', () => {
    expect(normalizeCustomFieldName('')).toBeNull();
    expect(normalizeCustomFieldName('   ')).toBeNull();
  });

  it('returns null for strings over 80 characters', () => {
    expect(normalizeCustomFieldName('a'.repeat(81))).toBeNull();
  });

  it('accepts exactly 80 characters', () => {
    const name = 'a'.repeat(80);
    expect(normalizeCustomFieldName(name)).toBe(name);
  });
});

describe('normalizeCustomFieldDescription', () => {
  it('returns null for non-string input', () => {
    expect(normalizeCustomFieldDescription(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeCustomFieldDescription('  ')).toBeNull();
  });

  it('truncates descriptions over 180 characters', () => {
    const long = 'x'.repeat(200);
    expect(normalizeCustomFieldDescription(long)).toHaveLength(180);
  });
});

describe('parseCustomFieldOptions', () => {
  it('parses an array of label strings', () => {
    const options = parseCustomFieldOptions(['Option A', 'Option B']);
    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({ label: 'Option A' });
  });

  it('deduplicates case-insensitively', () => {
    const options = parseCustomFieldOptions(['apple', 'Apple', 'APPLE']);
    expect(options).toHaveLength(1);
  });

  it('parses a newline-delimited string', () => {
    const options = parseCustomFieldOptions('Red\nGreen\nBlue');
    expect(options).toHaveLength(3);
  });

  it('caps at 20 options', () => {
    const many = Array.from({ length: 30 }, (_, i) => `Option ${i}`);
    expect(parseCustomFieldOptions(many)).toHaveLength(20);
  });

  it('skips empty entries', () => {
    const options = parseCustomFieldOptions(['', '  ', 'Valid']);
    expect(options).toHaveLength(1);
  });
});

describe('serializeCustomFieldOptions / parseStoredCustomFieldOptions roundtrip', () => {
  it('roundtrips cleanly', () => {
    const options = parseCustomFieldOptions(['Red', 'Green', 'Blue']);
    const serialized = serializeCustomFieldOptions(options);
    expect(serialized).toBeTruthy();
    const parsed = parseStoredCustomFieldOptions(serialized);
    expect(parsed).toEqual(options);
  });

  it('returns empty array for null', () => {
    expect(parseStoredCustomFieldOptions(null)).toEqual([]);
  });

  it('returns empty array for malformed JSON', () => {
    expect(parseStoredCustomFieldOptions('not-json')).toEqual([]);
  });
});
