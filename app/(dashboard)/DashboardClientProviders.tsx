'use client';

import { useEffect } from 'react';
import { SWRConfig } from 'swr';
import {
  applyCustomTheme,
  applySolaraAppearance,
  readStoredCustomTheme,
  readStoredSolaraAppearance,
} from '@/lib/theme';
import { NotificationRuntime } from '@/components/notifications/NotificationRuntime';

export function DashboardClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyCustomTheme(readStoredCustomTheme());
    applySolaraAppearance(readStoredSolaraAppearance());
  }, []);

  return (
    <SWRConfig
      value={{
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 10_000,
        keepPreviousData: true,
      }}
    >
      <NotificationRuntime />
      {children}
    </SWRConfig>
  );
}
