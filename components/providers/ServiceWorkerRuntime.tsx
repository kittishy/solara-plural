"use client";

import { useEffect } from "react";
import { mutate } from "swr";

// Registers the Solara service worker and wires up seamless updates:
// - On a new SW being available, we immediately tell it to `skipWaiting`
//   (the SW itself calls `clients.claim` on activation) and once the new
//   controller is in charge we silently revalidate all SWR caches so the
//   user sees fresh data without any manual refresh.
// - Also revalidates when the document regains focus or visibility, so
//   reopening the PWA after a deploy never shows stale UI.
export function ServiceWorkerRuntime() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production" && !window.location.hostname) return;

    let refreshing = false;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      // Wipe SWR caches so the next render fetches from the fresh SW.
      void mutate(() => true, undefined, { revalidate: true });
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
      .then((registration) => {
        // If there's already a waiting worker, activate it now.
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // A new SW is ready and an old SW is still in charge — switch over.
              installing.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
        // Periodically check for new SW versions while the app stays open.
        const checkForUpdate = () => { void registration.update().catch(() => undefined); };
        const interval = window.setInterval(checkForUpdate, 60 * 60 * 1000);

        const onVisible = () => {
          if (document.visibilityState === "visible") {
            checkForUpdate();
            // Refresh data the user is about to look at.
            void mutate(() => true, undefined, { revalidate: true });
          }
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
          window.clearInterval(interval);
          document.removeEventListener("visibilitychange", onVisible);
        };
      })
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
