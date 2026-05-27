// Solara Plural service worker — feel-instant PWA.
//
// Caching strategy (a la Uber's PWA):
// - /_next/static/* (hashed JS/CSS): cache-first, immutable. Bumping the build
//   bumps the hashes, so a new deploy = new URLs = automatic refresh.
// - /icons/*, /manifest.json, /favicon.ico: stale-while-revalidate.
// - HTML navigations: network-first with a cache fallback (so a flaky network
//   never gives a blank screen — last good HTML is served and revalidated).
// - /api/* GET: stale-while-revalidate so the UI paints instantly with the
//   last response, then refreshes in the background. POST/PUT/DELETE/PATCH
//   are never cached.
//
// Updates: on `install` we skipWaiting(); on `activate` we clients.claim()
// and clear old cache buckets. The client-side runtime listens for
// `controllerchange` and revalidates SWR. Net effect: no F5, no close/open,
// no clearing cache. New deploys land seamlessly.

const VERSION = 'solara-v4';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const API_CACHE = `${VERSION}-api`;

const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const CACHE_BUCKETS = [STATIC_CACHE, RUNTIME_CACHE, API_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !CACHE_BUCKETS.includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Listen for explicit SKIP_WAITING messages from the runtime (used when a
// fresh SW is detected while the page is open).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'Solara Plural';
  const options = {
    body: payload.body || 'You have a new update.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: payload.url || '/notifications',
      notificationId: payload.notificationId || null,
    },
    // Use `tag` so a burst of pushes for the same notification collapses
    // into a single OS banner instead of spamming the user.
    tag: payload.notificationId ? `solara-${payload.notificationId}` : 'solara-update',
    renotify: false,
  };

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });

    // Always wake the app so it refreshes the UI right away.
    for (const client of clientsList) {
      client.postMessage({ type: 'solara-push', notificationId: options.data.notificationId });
    }

    // If a Solara window is currently focused, skip the OS banner — the user
    // is already looking at the app and the in-app toast (driven by the
    // postMessage above) is enough. This avoids the noisy double-notify.
    // Push spec requires userVisibleOnly, so we still call showNotification
    // when no client is focused.
    const hasFocusedClient = clientsList.some((client) => client.focused);
    if (!hasFocusedClient) {
      await self.registration.showNotification(title, options);
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';
  event.waitUntil(self.clients.openWindow(url));
});

// ----- fetch strategies -----

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/');
}

function isPrecached(url) {
  return PRECACHE_URLS.includes(url.pathname) || url.pathname.startsWith('/icons/');
}

function isApiGet(request, url) {
  return request.method === 'GET' && url.pathname.startsWith('/api/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate'
    || (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html'));
}

// Don't cache auth/session/push/stream endpoints — they MUST be live.
const NEVER_CACHE_PATHS = [
  '/api/auth',
  '/api/notifications/tokens',
  '/api/notifications/stream',
  '/api/register',
  '/api/password-reset',
];

function isNeverCache(url) {
  return NEVER_CACHE_PATHS.some((prefix) => url.pathname.startsWith(prefix));
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await networkFetch) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Non-GET: pass through (mutations must always hit network).
  if (request.method !== 'GET') return;

  // Never-cache endpoints (auth/session): always go to network.
  if (isNeverCache(url)) return;

  // Hashed Next.js static assets — cache-first, they're immutable.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Icons / manifest — stale-while-revalidate.
  if (isPrecached(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // API GETs — stale-while-revalidate so the UI paints instantly.
  if (isApiGet(request, url)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // HTML navigations: pass through to the network. We deliberately don't
  // cache full HTML because the dashboard is SSR with the user's session
  // data — caching it could leak one user's view to another on a shared
  // device. Next.js Link prefetch + the API/static caches above already
  // make navigations feel instant.
  if (isNavigationRequest(request)) return;

  // Everything else (fonts, images served from /public): stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});
