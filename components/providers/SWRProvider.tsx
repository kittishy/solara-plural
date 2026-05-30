"use client";

import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { apiFetcher, isAppRuntime } from "@/lib/swr";

// Global SWR defaults tuned for a feel-instant PWA:
// - `keepPreviousData`: never blank the UI while a refetch happens
// - `dedupingInterval`: collapse duplicate requests within 4s (covers most
//   "component remounts twice on navigation" cases)
// - `revalidateOnFocus`: refresh when the user re-focuses the tab/PWA so they
//   never see stale data after coming back from another app
// - `revalidateIfStale` + `revalidateOnReconnect`: catch up automatically
// - `focusThrottleInterval`: don't hammer the API if focus events fire fast
// - `errorRetryCount`: bounded retries so a flaky network doesn't loop forever
//
// Inside the installed app (TWA / PWA / native shell) we additionally poll on
// an interval so fronting, notifications, and members stay live without the
// user having to leave and re-enter a tab. The runtime is only knowable on the
// client, so we resolve it after mount and let SWRConfig pick up the change.
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
        refreshInterval: isApp ? 5_000 : 0,
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
