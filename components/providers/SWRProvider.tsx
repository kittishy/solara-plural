"use client";

import { useEffect, useMemo, useState } from "react";
import { SWRConfig } from "swr";
import { useSession } from "next-auth/react";
import { apiFetcher, isAppRuntime } from "@/lib/swr";
import { createPersistentProvider } from "@/lib/swr-cache-provider";

// Global SWR defaults tuned for a feel-instant PWA:
// - `provider`: a user-scoped localStorage-backed cache so revisits and app
//   reopens (installed PWA / Android TWA included) paint last-known data
//   instantly instead of refetching from a blank state. Real-time / shared
//   keys are never persisted (see lib/swr-cache-provider.ts), and the cache is
//   cleared on logout / user change.
// - `keepPreviousData`: never blank the UI while a refetch happens
// - `dedupingInterval`: collapse duplicate requests (covers "remounts twice")
// - `revalidateOnFocus` / `revalidateIfStale` / `revalidateOnReconnect`: keep
//   data live — the seeded cache only changes what paints first, never whether
//   we refresh
// - page-level realtime or focused revalidation keeps hot data fresh without a
//   global interval waking every SWR key in the app.
export function SWRProvider({ children }: { children: React.ReactNode }) {
  const [isApp, setIsApp] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    setIsApp(isAppRuntime());
  }, []);

  // Rebuilt only when the account changes (login / logout / switch). The
  // factory is client-only (guards `window`), so SSR uses an ephemeral cache.
  const provider = useMemo(
    () => (userId ? createPersistentProvider(userId) : undefined),
    [userId],
  );

  return (
    <SWRConfig
      // Remount the cache context on account change so one user's persisted
      // cache can never leak into another's session.
      key={userId ?? "anon"}
      value={{
        provider,
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
