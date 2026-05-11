'use client';

import { useEffect } from 'react';
import { SWRConfig } from 'swr';
import {
  applySolaraAppearance,
  applySolaraTheme,
  readStoredSolaraAppearance,
  readStoredSolaraTheme,
} from '@/lib/theme';
import { NotificationRuntime } from '@/components/notifications/NotificationRuntime';

export function DashboardClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applySolaraTheme(readStoredSolaraTheme());
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
