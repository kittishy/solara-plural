"use client";

import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { apiFetcher, isAppRuntime } from "@/lib/swr";

// Global SWR defaults tuned for a feel-instant PWA:
// - the in-memory cache survives client navigation without persisting private
//   dashboard data or remounting the application after hydration
// - `keepPreviousData`: never blank the UI while a refetch happens
// - `dedupingInterval`: collapse duplicate requests (covers "remounts twice")
// - `revalidateOnFocus` / `revalidateIfStale` / `revalidateOnReconnect`: keep
//   data live — the seeded cache only changes what paints first, never whether
//   we refresh
// - page-level realtime or focused revalidation keeps hot data fresh without a
//   global interval waking every SWR key in the app.
export function SWRProvider({ children }: { children: React.ReactNode }) {
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    setIsApp(isAppRuntime());
  }, []);

  return (
    <SWRConfig
      value={{
        fetcher: apiFetcher,
        keepPreviousData: true,
        dedupingInterval: isApp ? 1_000 : 4_000,
        focusThrottleInterval: isApp ? 2_000 : 10_000,
        refreshInterval: 0,
        revalidateOnFocus: true,
        revalidateIfStale: true,
        revalidateOnReconnect: true,
        errorRetryCount: 3,
        shouldRetryOnError: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
