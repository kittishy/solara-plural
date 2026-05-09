'use client';

import { useEffect } from 'react';
import { listenForForegroundPush, registerSolaraServiceWorker } from '@/lib/notifications/browser';

export function NotificationRuntime() {
  useEffect(() => {
    void registerSolaraServiceWorker();

    let unsubscribe: (() => void) | undefined;
    void listenForForegroundPush().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  return null;
}

