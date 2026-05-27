// Reusable Cache-Control header presets for GET API endpoints.
//
// `private` = browser caches per-user, CDNs don't
// `max-age=N` = browser keeps it fresh for N seconds (no network call)
// `stale-while-revalidate=M` = after expiry, serve stale and refresh in background
//
// Pair with SWR's `dedupingInterval` so duplicate component mounts don't even
// hit the network.

// `Vary: Cookie` makes intermediate caches (browser, SW) key by session
// cookie too — prevents one user's response being served to another on a
// shared device.

export const CACHE_FRESH_SHORT = {
  // Hot data that changes frequently (front entry, notifications).
  // 5s browser-fresh, 30s background refresh.
  'Cache-Control': 'private, max-age=5, stale-while-revalidate=30',
  'Vary': 'Cookie',
} as const;

export const CACHE_FRESH_MEDIUM = {
  // Lists that change a few times per session (members, notes, journal).
  // 15s browser-fresh, 120s background refresh.
  'Cache-Control': 'private, max-age=15, stale-while-revalidate=120',
  'Vary': 'Cookie',
} as const;

export const CACHE_FRESH_LONG = {
  // Mostly static metadata (custom fields, language settings).
  // 60s browser-fresh, 300s background refresh.
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
  'Vary': 'Cookie',
} as const;

export const CACHE_NO_STORE = {
  'Cache-Control': 'no-store',
} as const;
