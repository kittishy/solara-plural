'use client';

import { useEffect } from 'react';
import { SWRConfig } from 'swr';
import { applySolaraTheme, readStoredSolaraTheme } from '@/lib/theme';

export function DashboardClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applySolaraTheme(readStoredSolaraTheme());
  }, []);

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 10_000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
