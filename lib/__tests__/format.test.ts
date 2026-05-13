import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateLong,
  formatTime,
  formatDateTime,
  formatTimeSince,
} from '../client/format';

describe('formatDate', () => {
  it('formats a valid ISO string in short style', () => {
    // Use noon UTC so the date doesn't shift across timezone boundaries
    expect(formatDate('2026-05-12T12:00:00Z')).toMatch(/May 12, 2026/);
  });

  it('returns the fallback for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns the fallback for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('accepts a custom fallback string', () => {
    expect(formatDate(null, undefined, 'Unknown date')).toBe('Unknown date');
  });

  it('accepts a Date object', () => {
    const d = new Date('2026-01-01T12:00:00Z');
    expect(formatDate(d)).toMatch(/Jan 1, 2026/);
  });
});

describe('formatDateLong', () => {
  it('uses long month name', () => {
    expect(formatDateLong('2026-05-12T12:00:00Z')).toMatch(/May 12, 2026/);
  });

  it('returns — for null', () => {
    expect(formatDateLong(null)).toBe('—');
  });
});

describe('formatTime', () => {
  it('formats a valid date to a time string', () => {
    const result = formatTime('2026-05-12T15:30:00');
    // locale-dependent, just verify it looks like a time
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns the fallback for null', () => {
    expect(formatTime(null)).toBe('unknown time');
  });
});

describe('formatDateTime', () => {
  it('formats a valid date to a datetime string', () => {
    const result = formatDateTime('2026-05-12T15:30:00');
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns — for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('formatTimeSince', () => {
  it('returns "just now" for very recent times', () => {
    const now = new Date(Date.now() - 30_000); // 30 seconds ago
    expect(formatTimeSince(now)).toBe('just now');
  });

  it('returns minutes for times 1-59 minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
    expect(formatTimeSince(fiveMinutesAgo)).toBe('5m');
  });

  it('returns hours and minutes for times over an hour ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000 - 30 * 60_000);
    expect(formatTimeSince(twoHoursAgo)).toBe('2h 30m');
  });
});
