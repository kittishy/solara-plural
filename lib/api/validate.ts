// Server-side input caps and validators (docs/SYSTEM_DESIGN.md §4).
//
// The server is the source of truth for field limits — client `maxLength`
// attributes are a courtesy only. Zero-dependency on purpose: these are the
// only validation primitives the API layer needs, and a schema library would
// be a new runtime dependency for no additional guarantee.

// ---------------------------------------------------------------------------
// Field caps (characters)
// ---------------------------------------------------------------------------
export const CAPS = {
  memberName: 100,
  pronouns: 100,
  role: 100,
  color: 32,
  tag: 50,
  tagCount: 50,
  description: 5_000,
  memberNotes: 10_000,
  noteTitle: 200,
  noteContent: 20_000,
  noteCategory: 50,
  journalTitle: 200,
  journalContent: 50_000,
  frontNote: 2_000,
  avatarHttpsUrl: 2_048,
} as const;

// Data-URL avatars are stored in the DB. Client encodes at 512px/~350KB
// (~480KB base64) favoring photo quality over storage thrift — at current
// usage (2 active systems) the 500MB Supabase free tier isn't a real
// constraint (docs/SYSTEM_DESIGN.md §5). The cap just needs headroom above
// the encoder's own worst case.
export const AVATAR_DATA_URL_MAX = 600_000;

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

/** True when `value` is a string whose trimmed length is within `max` (and non-empty when `required`). */
export function fitsMax(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length <= max;
}

/**
 * Returns the trimmed string when valid, or `undefined` when the value is
 * absent/empty, or `null` when it exceeds the cap (distinguishing "not sent"
 * from "invalid" so callers can reject with a clear error).
 */
export function optionalStrMax(value: unknown, max: number): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length <= max ? trimmed : null;
}

/**
 * Returns a user-facing error message for the first field exceeding its cap,
 * or null when everything fits. Non-string values are ignored here — type
 * validation stays with each route's existing checks.
 */
export function firstCapViolation(
  fields: Array<{ label: string; value: unknown; max: number }>,
): string | null {
  for (const field of fields) {
    if (typeof field.value === 'string' && field.value.trim().length > field.max) {
      return `${field.label} is too long (max ${field.max} characters)`;
    }
  }
  return null;
}

/** Validates a tags array: each tag within cap, bounded count. */
export function tagsCapViolation(tags: string[] | null): string | null {
  if (!tags) return null;
  if (tags.length > CAPS.tagCount) return `Too many tags (max ${CAPS.tagCount})`;
  for (const tag of tags) {
    if (tag.length > CAPS.tag) return `Tag is too long (max ${CAPS.tag} characters)`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Avatar URL validation
// ---------------------------------------------------------------------------

const DATA_URL_PREFIX = /^data:image\/(png|jpeg|webp|gif|avif);base64,/;

/**
 * An avatar URL is either an https:// URL (bounded length) or a base64 data
 * URL of an allowed image type under the DB-budget cap. Everything else —
 * javascript:, data:text/html, http://, oversized payloads — is rejected.
 * The value ends up in an <img src>, so this is both an XSS guard and a
 * storage guard.
 */
export function isValidAvatarUrl(value: string): boolean {
  if (value.length <= CAPS.avatarHttpsUrl && value.startsWith('https://')) {
    try {
      // Constructor throws on malformed URLs; protocol re-checked to block
      // tricks like "https:\\" normalization surprises.
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }
  if (DATA_URL_PREFIX.test(value)) {
    return value.length <= AVATAR_DATA_URL_MAX;
  }
  return false;
}
