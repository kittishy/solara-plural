// Resilience helpers for the App Router error boundaries.
//
// The #1 cause of "white screen / dead buttons after a deploy" in a PWA is a
// stale client trying to lazy-load a JS chunk whose hash changed in the new
// build. The browser throws a ChunkLoadError and React unmounts the tree. We
// detect that specific failure and reload once so the client picks up the
// fresh build, instead of leaving the user stranded on a blank page.

/** True when the error is a failed code-split chunk / dynamic import. */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: unknown; message?: unknown };
  const name = typeof err.name === 'string' ? err.name : '';
  const message = typeof err.message === 'string' ? err.message : '';
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [^\s]+ failed/i.test(message) ||
    /Loading CSS chunk/i.test(message) ||
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message)
  );
}

const RELOAD_GUARD_KEY = 'solara:chunk-reloaded-at';
const RELOAD_GUARD_WINDOW_MS = 10_000;

/**
 * Reload the page once to recover from a stale-deploy chunk failure.
 * Guards against reload loops: if we already reloaded within the last few
 * seconds, we give up and let the error UI show instead.
 * Returns true if a reload was triggered.
 */
export function attemptChunkReload(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const now = Date.now();
    const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
    if (Number.isFinite(last) && now - last < RELOAD_GUARD_WINDOW_MS) {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    // sessionStorage can throw in private mode; fall through to a plain reload.
  }
  window.location.reload();
  return true;
}
