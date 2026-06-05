'use client';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Classify where this subscription was created so server-side diagnostics can
// tell an installed Android TWA apart from a plain browser/PWA tab. The TWA is
// the wrapper that actually delivers push on phones, so knowing a token came
// from one ('twa') vs a desktop browser ('web') is the difference between
// "users have the working app" and "they don't".
function detectRuntimeContext(): 'twa' | 'standalone' | 'web' {
  if (typeof window === 'undefined') return 'web';
  try {
    if (typeof document !== 'undefined' && document.referrer.startsWith('android-app://')) {
      return 'twa';
    }
    const mql = (q: string) => window.matchMedia && window.matchMedia(q).matches;
    if (
      mql('(display-mode: standalone)') ||
      mql('(display-mode: fullscreen)') ||
      mql('(display-mode: minimal-ui)') ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    ) {
      return 'standalone';
    }
  } catch {
    /* ignore */
  }
  return 'web';
}

export async function registerSolaraServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
  } catch {
    return null;
  }
}

// Source-of-truth push state. Some browsers (notably Samsung Internet in an
// installed/standalone PWA) report `Notification.permission === "default"` even
// AFTER the user granted it, which made the settings screen show "Enable" again
// and re-prompt forever. An existing push subscription is a far more reliable
// signal that the user is actually set up, so we prefer it.
export async function getPushEnabledState(): Promise<
  'enabled' | 'granted-no-sub' | 'denied' | 'default' | 'unsupported'
> {
  if (typeof window === 'undefined') return 'default';
  if (!('Notification' in window)) return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';

  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) return 'enabled';
  } catch { /* fall through to permission-based answer */ }

  const perm = Notification.permission;
  if (perm === 'granted') return 'granted-no-sub';
  if (perm === 'denied') return 'denied';
  return 'default';
}

export async function requestAndSavePushToken(): Promise<
  { success: true; endpoint: string } | { success: false; reason: string }
> {
  if (typeof window === 'undefined') return { success: false, reason: 'not_in_browser' };
  if (!('Notification' in window)) return { success: false, reason: 'notifications_unsupported' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'push_unsupported' };
  }

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) return { success: false, reason: 'web_push_not_configured' };

  // "denied" is the only unrecoverable state. We deliberately do NOT bail on
  // "default": Samsung Internet reports "default" even when it's actually
  // granted with a live subscription.
  if (Notification.permission === 'denied') {
    return { success: false, reason: 'permission_not_granted' };
  }

  await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
  // Use the READY (active) registration. getSubscription() on a freshly
  // returned registration whose worker is still "installing" can resolve to
  // null even when a subscription exists — which made us re-subscribe and mint
  // a brand-new endpoint on every visit.
  const registration = await navigator.serviceWorker.ready;
  const expectedKey = urlBase64ToUint8Array(publicKey);

  let existing = await registration.pushManager.getSubscription();

  // If a subscription exists but was created with a DIFFERENT VAPID public key
  // it's dead — drop it and re-subscribe. Only treat it as a mismatch when the
  // browser actually EXPOSES the key. Samsung Internet returns
  // `applicationServerKey: null`, so the old `instanceof ArrayBuffer` check was
  // false every time → we unsubscribed + re-subscribed on every visit, minting
  // a new endpoint each time, 410'ing the old one, never delivering, and
  // re-prompting forever. When the key isn't exposed we KEEP the existing
  // subscription (server upsert is idempotent via the endpoint hash).
  if (existing) {
    const existingKey = existing.options?.applicationServerKey;
    if (existingKey instanceof ArrayBuffer) {
      const matches = existingKey.byteLength === expectedKey.byteLength
        && new Uint8Array(existingKey).every((byte, i) => byte === expectedKey[i]);
      if (!matches) {
        try { await existing.unsubscribe(); } catch { /* ignore */ }
        existing = null;
      }
    }
  }

  // Reuse the existing subscription with NO permission prompt — re-requesting on
  // Samsung Internet re-prompts every time even though it's already granted.
  // Only a fresh subscribe() shows the (single) prompt, and subscribe() itself
  // requests notification permission, so we don't call requestPermission too
  // (calling both caused the "asks twice" double prompt).
  let subscription = existing;
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedKey,
      });
    } catch {
      return { success: false, reason: 'permission_not_granted' };
    }
  }

  if (!subscription) return { success: false, reason: 'subscription_save_failed' };
  const subscriptionJson = subscription.toJSON();

  const res = await fetch('/api/notifications/tokens', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscriptionJson, context: detectRuntimeContext() }),
  });

  if (!res.ok) return { success: false, reason: 'subscription_save_failed' };
  return { success: true, endpoint: subscription.endpoint };
}
