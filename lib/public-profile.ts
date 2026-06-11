// Helpers for the public, shareable system profile (/u/<slug>).

// Slugs are the public handle in the URL, so keep them tight: lowercase
// letters, digits and single hyphens, 3–30 chars, no leading/trailing hyphen.
export const SLUG_MIN = 3;
export const SLUG_MAX = 30;

// Routes and words we never want a profile slug to shadow or impersonate.
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'login', 'logout', 'register', 'signup', 'signin',
  'settings', 'dashboard', 'members', 'front', 'notes', 'journal', 'friends',
  'partners', 'chat', 'notifications', 'systems', 'u', 'user', 'profile',
  'public', 'privacy', 'terms', 'about', 'help', 'support', 'maintenance',
  'well-known', 'manifest', 'icons', 'favicon', 'static', 'solara',
]);

// Normalize free user input toward a valid slug (does not guarantee validity —
// run isValidSlug afterward). Strips accents, lowercases, collapses runs of
// non-alphanumerics into single hyphens, trims hyphens.
export function normalizeSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    // Re-trim in case the slice landed on a hyphen boundary.
    .replace(/-+$/g, '');
}

export type SlugError = 'too_short' | 'too_long' | 'invalid_chars' | 'reserved';

export function validateSlug(slug: string): SlugError | null {
  if (slug.length < SLUG_MIN) return 'too_short';
  if (slug.length > SLUG_MAX) return 'too_long';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'invalid_chars';
  if (RESERVED_SLUGS.has(slug)) return 'reserved';
  return null;
}

export function isValidSlug(slug: string): boolean {
  return validateSlug(slug) === null;
}
