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

export async function registerSolaraServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
  } catch {
    return null;
  }
}

export async function requestAndSavePushToken(): Promise<
  { success: true; endpoint: string } | { success: false; reason: string }
> {
  if (typeof window === 'undefined') return { success: false, reason: 'not_in_browser' };
  if (!('Notification' in window)) return { success: false, reason: 'notifications_unsupported' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'push_unsupported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { success: false, reason: 'permission_not_granted' };

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) return { success: false, reason: 'web_push_not_configured' };

  const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
  const expectedKey = urlBase64ToUint8Array(publicKey);

  let existing = await registration.pushManager.getSubscription();

  // If a subscription exists but was created with a different VAPID public
  // key (e.g. before the key was configured in production), it's dead —
  // the server can't push to it. Drop it and re-subscribe with the current key.
  if (existing) {
    const existingKey = existing.options?.applicationServerKey;
    const matches = existingKey instanceof ArrayBuffer
      && existingKey.byteLength === expectedKey.byteLength
      && new Uint8Array(existingKey).every((byte, i) => byte === expectedKey[i]);
    if (!matches) {
      try { await existing.unsubscribe(); } catch { /* ignore */ }
      existing = null;
    }
  }

  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: expectedKey,
  });

  const subscriptionJson = subscription.toJSON();

  const res = await fetch('/api/notifications/tokens', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscriptionJson }),
  });

  if (!res.ok) return { success: false, reason: 'subscription_save_failed' };
  return { success: true, endpoint: subscription.endpoint };
}
