'use client';

import { isNativeAppRuntime } from '@/lib/swr';

type PermissionResult = {
  display?: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
};

type LocalNotification = {
  id: number;
  title: string;
  body: string;
  schedule?: { at: Date };
  extra?: Record<string, string>;
};

type LocalNotificationsPlugin = {
  checkPermissions?: () => Promise<PermissionResult>;
  requestPermissions?: () => Promise<PermissionResult>;
  schedule?: (input: { notifications: LocalNotification[] }) => Promise<unknown>;
};

type NativeWindow = Window & {
  Capacitor?: {
    Plugins?: {
      LocalNotifications?: LocalNotificationsPlugin;
    };
  };
};

function getLocalNotifications() {
  if (typeof window === 'undefined') return null;
  const nativeWindow = window as NativeWindow;
  if (!isNativeAppRuntime()) return null;
  return nativeWindow.Capacitor?.Plugins?.LocalNotifications ?? null;
}

function notificationIdFromString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 2147483647) || 1;
}

export async function ensureNativeNotificationPermission() {
  const localNotifications = getLocalNotifications();
  if (!localNotifications) return false;

  const current = await localNotifications.checkPermissions?.().catch(() => null);
  if (current?.display === 'granted') return true;

  const requested = await localNotifications.requestPermissions?.().catch(() => null);
  return requested?.display === 'granted';
}

export async function showNativeAppNotification(input: {
  id: string;
  title: string;
  body: string;
  url?: string;
}) {
  const localNotifications = getLocalNotifications();
  if (!localNotifications?.schedule) return;

  const allowed = await ensureNativeNotificationPermission();
  if (!allowed) return;

  await localNotifications.schedule({
    notifications: [{
      id: notificationIdFromString(input.id),
      title: input.title,
      body: input.body,
      schedule: { at: new Date(Date.now() + 100) },
      extra: {
        notificationId: input.id,
        url: input.url ?? '/notifications',
      },
    }],
  });
}
