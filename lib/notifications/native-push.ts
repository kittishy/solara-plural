'use client';

// Native Android push via the Capacitor @capacitor/push-notifications plugin.
// This path is independent from browser Web Push: the installed APK registers
// directly with FCM and the server targets the device token with Firebase Admin.

type PermResult = { receive?: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' };

type PushNotificationSchema = {
  id?: string;
  title?: string;
  body?: string;
  data?: {
    notificationId?: string;
    url?: string;
  };
};

type PushPlugin = {
  checkPermissions: () => Promise<PermResult>;
  requestPermissions: () => Promise<PermResult>;
  register: () => Promise<void>;
  addListener: (
    event: string,
    cb: (data: unknown) => void,
  ) => Promise<{ remove: () => void }> | { remove: () => void };
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: { PushNotifications?: PushPlugin };
};

export type NativePushRegistrationResult =
  | { success: true; tokenTail: string }
  | {
      success: false;
      reason:
        | 'native_push_unavailable'
        | 'permission_denied'
        | 'registration_failed'
        | 'registration_timeout'
        | 'token_save_failed';
    };

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

function getPlugin(): PushPlugin | null {
  return getCapacitor()?.Plugins?.PushNotifications ?? null;
}

export function isCapacitorNative(): boolean {
  const cap = getCapacitor();
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
  return Boolean(cap.Plugins?.PushNotifications);
}

async function saveNativeToken(token: string): Promise<boolean> {
  const res = await fetch('/api/notifications/native-tokens', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: 'android-fcm' }),
  }).catch(() => null);

  if (!res?.ok) return false;
  const json = await res.json().catch(() => null) as { success?: unknown } | null;
  return json?.success === true;
}

function dispatchForegroundNotification(notification: PushNotificationSchema) {
  try {
    window.dispatchEvent(new CustomEvent('solara:notification', {
      detail: {
        id: notification.data?.notificationId || notification.id || String(Date.now()),
        type: 'native_push',
        title: notification.title || 'Solara',
        body: notification.body || '',
        createdAt: new Date().toISOString(),
      },
    }));
  } catch {
    // The in-app toast is best-effort; FCM delivery itself already happened.
  }
}

let registrationPromise: Promise<NativePushRegistrationResult> | null = null;
let listenersInstalled = false;

function installForegroundListeners(plugin: PushPlugin) {
  if (listenersInstalled) return;
  listenersInstalled = true;

  void plugin.addListener('pushNotificationActionPerformed', (data) => {
    const action = data as { notification?: { data?: Record<string, string> } };
    const url = action.notification?.data?.url || '/notifications';
    try {
      window.location.assign(url);
    } catch {
      // Ignore navigation failures; the user is still in the app.
    }
  });

  void plugin.addListener('pushNotificationReceived', (data) => {
    dispatchForegroundNotification(data as PushNotificationSchema);
  });
}

export async function registerNativePush(): Promise<NativePushRegistrationResult> {
  const plugin = getPlugin();
  if (!plugin) return { success: false, reason: 'native_push_unavailable' };
  installForegroundListeners(plugin);
  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    let perm = await plugin.checkPermissions().catch(() => ({ receive: 'prompt' } as PermResult));
    if (perm.receive !== 'granted') {
      perm = await plugin.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      registrationPromise = null;
      return { success: false, reason: 'permission_denied' } as const;
    }

    return new Promise<NativePushRegistrationResult>((resolve) => {
      let settled = false;
      const finish = (result: NativePushRegistrationResult) => {
        if (settled) return;
        settled = true;
        if (!result.success) registrationPromise = null;
        resolve(result);
      };

      const timeout = window.setTimeout(() => {
        finish({ success: false, reason: 'registration_timeout' });
      }, 15_000);

      void plugin.addListener('registration', (data) => {
        void (async () => {
          const token = (data as { value?: string }).value?.trim();
          if (!token) {
            window.clearTimeout(timeout);
            finish({ success: false, reason: 'registration_failed' });
            return;
          }

          const saved = await saveNativeToken(token);
          window.clearTimeout(timeout);
          finish(saved
            ? { success: true, tokenTail: token.slice(-12) }
            : { success: false, reason: 'token_save_failed' });
        })();
      });

      void plugin.addListener('registrationError', () => {
        window.clearTimeout(timeout);
        finish({ success: false, reason: 'registration_failed' });
      });

      void plugin.register().catch(() => {
        window.clearTimeout(timeout);
        finish({ success: false, reason: 'registration_failed' });
      });
    });
  })().catch(() => {
    registrationPromise = null;
    return { success: false, reason: 'registration_failed' } as const;
  });

  return registrationPromise;
}

export async function getNativePushState(): Promise<'enabled' | 'denied' | 'prompt' | 'unavailable'> {
  const plugin = getPlugin();
  if (!plugin) return 'unavailable';
  try {
    const perm = await plugin.checkPermissions();
    if (perm.receive === 'granted') return 'enabled';
    if (perm.receive === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unavailable';
  }
}
