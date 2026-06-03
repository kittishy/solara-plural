// Persistent, user-scoped SWR cache backed by localStorage.
//
// Why: the dashboard's client pages fetch via SWR. With the default in-memory
// Map cache, every cold navigation / app reopen refetches from scratch and
// shows a skeleton. Seeding the cache from localStorage makes revisits and app
// relaunches (installed PWA / Android TWA included) paint last-known data
// instantly, while SWR's `revalidateIfStale` / `revalidateOnFocus` /
// installed-app `refreshInterval` still refresh in the background — so nothing
// stays stale on screen beyond one fast round-trip.
//
// Real-time / shared-data safety: data that friends rely on in real time is
// NEVER persisted (see NEVER_PERSIST_PREFIXES). Those keys always refetch fresh
// on a cold reopen, so a friend's notifications or a friend system's shared
// state can never paint from a stale local blob.
//
// Shared-device safety: the cache is keyed by user id, actively cleared on
// logout, and a sentinel wipes everything if the active user ever changes.

import type { Cache, State } from 'swr';

type AnyState = State<unknown, unknown>;

const CACHE_PREFIX = 'solara-swr-cache:';
const ACTIVE_KEY = `${CACHE_PREFIX}active`;

// Keys (SWR uses the request URL as the key) that must always be fresh on a
// cold reopen because they carry real-time / cross-user shared information.
const NEVER_PERSIST_PREFIXES = [
  '/api/notifications', // live notifications (SSE drives the realtime push)
  '/api/friends', // friends list + friend member shares (shared, realtime)
  '/api/partners', // partner systems' live front/state (shared, realtime)
];

function storageKeyFor(userId: string): string {
  return `${CACHE_PREFIX}${userId}`;
}

// Only persist our own API data keys, excluding the realtime/shared ones and
// any non-string / internal SWR bookkeeping keys.
function isPersistable(key: string): boolean {
  if (!key.startsWith('/api/')) return false;
  return !NEVER_PERSIST_PREFIXES.some((prefix) => key.startsWith(prefix));
}

// Removes every persisted cache blob for every user on this device.
export function clearPersistentSwrCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* localStorage unavailable — nothing to clear */
  }
}

// Factory compatible with SWRConfig's `provider`. Pass the current user id so
// the cache is isolated per account. Returns an in-memory-only cache when there
// is no user (logged out / SSR) so nothing is ever persisted under a wrong key.
//
// Listener lifecycle: a single tab only ever has one logical session active, so
// we attach `visibilitychange` / `pagehide` / `beforeunload` ONCE per page load
// (see `ensureListeners` below). Each new provider just swaps the function they
// call via `currentPersist`. This keeps the listener count at O(1) regardless
// of how many times the user logs in/out, and lets the previous user's `Map`
// (closed over by the previous `persist`) become GC-eligible immediately.
let currentPersist: (() => void) | null = null;
let listenersAttached = false;

function ensureListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  const flush = () => currentPersist?.();
  // visibilitychange fires when the tab/installed-app is hidden — the most
  // reliable "user is leaving" signal on mobile + TWA.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  // pagehide covers bfcache navigations and is more reliable than beforeunload
  // on mobile Safari / Chrome.
  window.addEventListener('pagehide', flush);
  // beforeunload covers desktop browser tab close.
  window.addEventListener('beforeunload', flush);
}

export function createPersistentProvider(userId: string | null) {
  return (): Cache => {
    const map = new Map<string, AnyState>();

    if (typeof window === 'undefined' || !userId) {
      // No user means we have nothing to persist under. Drop any previously
      // installed persist hook so a backgrounded tab in the logged-out state
      // can never write the prior user's in-memory Map back to disk.
      currentPersist = null;
      return map as unknown as Cache;
    }

    // Layer C — sentinel: if the last active user differs, wipe everything
    // before seeding (catches a session swap that bypassed the logout button).
    try {
      const active = localStorage.getItem(ACTIVE_KEY);
      if (active && active !== userId) clearPersistentSwrCache();
      localStorage.setItem(ACTIVE_KEY, userId);
    } catch {
      /* ignore */
    }

    const storageKey = storageKeyFor(userId);

    // Seed from the previous session's blob.
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const entries = JSON.parse(raw) as [string, AnyState][];
        for (const [key, value] of entries) {
          if (isPersistable(key) && value && value.data !== undefined && !value.error) {
            map.set(key, value);
          }
        }
      }
    } catch {
      /* corrupt blob — start empty */
    }

    const persist = () => {
      try {
        const entries: [string, AnyState][] = [];
        for (const [key, value] of Array.from(map.entries())) {
          if (isPersistable(key) && value && value.data !== undefined && !value.error) {
            // Store only the data; transient flags (isValidating/isLoading)
            // must not be persisted or revalidation wouldn't fire on reopen.
            entries.push([key, { data: value.data } as AnyState]);
          }
        }
        localStorage.setItem(storageKey, JSON.stringify(entries));
      } catch {
        /* quota / serialization error — drop this write */
      }
    };

    // Hand this provider's persist to the singleton listeners. Any prior
    // `persist` (and the Map it captured) becomes GC-eligible at this point.
    currentPersist = persist;
    ensureListeners();

    return map as unknown as Cache;
  };
}
