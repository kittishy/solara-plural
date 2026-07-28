import { mutate } from 'swr';

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error?: string };

export const swrKeys = {
  members: '/api/members?limit=500',
  front: '/api/front',
  notes: '/api/notes',
  journal: '/api/journal',
  frontHistory: '/api/front/history?limit=50&offset=0',
  notifications: '/api/notifications',
  friends: '/api/friends',
  customFields: '/api/custom-fields',
} as const;

// True only inside a Capacitor native shell. Kept narrow because the
// Capacitor-only code paths (LocalNotifications plugin, etc.) genuinely
// require `window.Capacitor` to exist.
export function isNativeAppRuntime() {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { Capacitor?: unknown }).Capacitor);
}

// True when running as an installed/standalone app: an Android TWA (the APK
// we ship via PWABuilder), an installed PWA, or iOS "Add to Home Screen".
//
// This is the case the old code missed entirely — it only checked for
// `window.Capacitor`, which a TWA never exposes. As a result none of the
// "app-like" tuning (live data, cache bypass) ever kicked in inside the
// actual shipped APK, so users saw stale data until they switched tabs.
export function isStandaloneApp() {
  if (typeof window === 'undefined') return false;

  const mql = typeof window.matchMedia === 'function' ? window.matchMedia : null;
  const displayModeStandalone = Boolean(
    mql &&
      (mql('(display-mode: standalone)').matches ||
        mql('(display-mode: fullscreen)').matches ||
        mql('(display-mode: minimal-ui)').matches ||
        mql('(display-mode: window-controls-overlay)').matches),
  );

  // iOS Safari home-screen webapp.
  const iosStandalone =
    (window.navigator as (Navigator & { standalone?: boolean }) | undefined)
      ?.standalone === true;

  // PWABuilder/Bubblewrap TWA: Chrome launches the page with an
  // `android-app://<package>` referrer on the initial document load.
  const twaReferrer =
    typeof document !== 'undefined' &&
    document.referrer?.startsWith('android-app://') === true;

  return displayModeStandalone || iosStandalone || twaReferrer;
}

// The "app experience" = a Capacitor native shell OR an installed standalone
// app (TWA / PWA). All live-data tuning keys off this so the shipped APK and
// installed PWA behave like a real app, not a cached web page.
export function isAppRuntime() {
  return isNativeAppRuntime() || isStandaloneApp();
}

export async function apiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    // Always read server truth. `no-store` bypasses BOTH the browser HTTP
    // cache (the GET routes send `max-age=5..60`) and the service worker's
    // stale-while-revalidate API cache (it early-returns on `no-store`).
    //
    // Without this, on the web a mutation + SWR revalidation would refetch
    // from those caches and paint the PRE-mutation data — making the app feel
    // laggy or broken (e.g. a saved change reverting until the cache expired).
    // Perceived speed is unaffected: SWR still paints its in-memory /
    // localStorage-seeded cache instantly (keepPreviousData), then this fetch
    // refreshes it against the server.
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!res.ok || !json || json.success !== true) {
    throw new Error(
      (json && 'error' in json && typeof json.error === 'string' && json.error) ||
      'Request failed'
    );
  }

  return json.data;
}

export function revalidateMembersAndFront() {
  void mutate(swrKeys.members);
  void mutate(swrKeys.front);
}

export function revalidateNotes() {
  void mutate(swrKeys.notes);
}

export function revalidateFrontHistory() {
  void mutate(swrKeys.frontHistory);
}

export function revalidateJournal() {
  void mutate(swrKeys.journal);
}
