'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { mutate } from 'swr';
import { swrKeys } from '@/lib/swr';
import type { FirebasePublicConfig } from '@/lib/notifications/firebase-public-config';

type FirebaseConfigResponse = {
  success: boolean;
  data: FirebasePublicConfig | null;
};

async function fetchFirebaseConfig(): Promise<FirebasePublicConfig | null> {
  const res = await fetch('/api/notifications/firebase-config', { credentials: 'same-origin' });
  const json = await res.json().catch(() => null) as FirebaseConfigResponse | null;
  return json?.success ? json.data : null;
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
  { success: true; token: string } | { success: false; reason: string }
> {
  if (typeof window === 'undefined') return { success: false, reason: 'not_in_browser' };
  if (!('Notification' in window)) return { success: false, reason: 'notifications_unsupported' };

  const supported = await isSupported().catch(() => false);
  if (!supported) return { success: false, reason: 'fcm_unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { success: false, reason: 'permission_not_granted' };

  const config = await fetchFirebaseConfig();
  if (!config) return { success: false, reason: 'firebase_not_configured' };

  const app = getApps().length ? getApps()[0] : initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) return { success: false, reason: 'token_unavailable' };

  const res = await fetch('/api/notifications/tokens', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) return { success: false, reason: 'token_save_failed' };
  return { success: true, token };
}

export async function listenForForegroundPush() {
  const supported = await isSupported().catch(() => false);
  if (!supported) return () => {};

  const config = await fetchFirebaseConfig();
  if (!config) return () => {};

  const app = getApps().length ? getApps()[0] : initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });

  const messaging = getMessaging(app);
  return onMessage(messaging, () => {
    void mutate(swrKeys.notifications);
  });
}

