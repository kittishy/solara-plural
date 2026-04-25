'use client';

import { SWRConfig } from 'swr';

export function DashboardClientProviders({ children }: { children: React.ReactNode }) {
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
