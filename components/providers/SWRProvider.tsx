"use client";

import { SWRConfig } from "swr";
import { apiFetcher, isNativeAppRuntime } from "@/lib/swr";

// Global SWR defaults tuned for a feel-instant PWA:
// - `keepPreviousData`: never blank the UI while a refetch happens
// - `dedupingInterval`: collapse duplicate requests within 4s (covers most
//   "component remounts twice on navigation" cases)
// - `revalidateOnFocus`: refresh when the user re-focuses the tab/PWA so they
//   never see stale data after coming back from another app
// - `revalidateIfStale` + `revalidateOnReconnect`: catch up automatically
// - `focusThrottleInterval`: don't hammer the API if focus events fire fast
// - `errorRetryCount`: bounded retries so a flaky network doesn't loop forever
export function SWRProvider({ children }: { children: React.ReactNode }) {
  const isNativeApp = isNativeAppRuntime();

  return (
    <SWRConfig
      value={{
        fetcher: apiFetcher,
        keepPreviousData: true,
        dedupingInterval: isNativeApp ? 1_000 : 4_000,
        focusThrottleInterval: isNativeApp ? 2_000 : 10_000,
        refreshInterval: isNativeApp ? 5_000 : 0,
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
