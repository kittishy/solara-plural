"use client";

import { useEffect } from "react";
import { mutate } from "swr";

// Registers the Solara service worker and wires up seamless updates:
// - On a new SW being available, we immediately tell it to `skipWaiting`
//   (the SW itself calls `clients.claim` on activation) and once the new
//   controller is in charge we silently revalidate all SWR caches so the
//   user sees fresh data without any manual refresh.
// - SWR owns focus/reconnect data refresh. This runtime only manages service
//   worker updates, avoiding duplicate request bursts when Android resumes.
export function ServiceWorkerRuntime() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // A production service worker controlling `next dev` can serve stale
    // chunks and make the development UI appear randomly broken. Production
    // builds still exercise the real registration path.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations
              .filter((registration) => registration.scope.startsWith(window.location.origin))
              .map((registration) => registration.unregister())
          )
        )
        .catch(() => undefined);
      return;
    }

    let refreshing = false;
    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;
    let updateInterval: number | null = null;
    const refreshAll = () => {
      void mutate(() => true, undefined, { revalidate: true });
    };

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      // Wipe SWR caches so the next render fetches from the fresh SW.
      refreshAll();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const checkForUpdate = () => {
      void registration?.update().catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    const onNativeResume = () => checkForUpdate();
    const onInstallingStateChange = () => {
      if (
        installingWorker?.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        installingWorker.postMessage({ type: "SKIP_WAITING" });
      }
    };
    const onUpdateFound = () => {
      installingWorker?.removeEventListener(
        "statechange",
        onInstallingStateChange
      );
      installingWorker = registration?.installing ?? null;
      installingWorker?.addEventListener(
        "statechange",
        onInstallingStateChange
      );
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("solara:native-resume", onNativeResume);

    void navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
      .then((registered) => {
        if (disposed) return;
        registration = registered;

        // If there's already a waiting worker, activate it now.
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        registration.addEventListener("updatefound", onUpdateFound);

        // Periodically check for new SW versions while the app stays open.
        updateInterval = window.setInterval(checkForUpdate, 60 * 60 * 1000);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      if (updateInterval !== null) window.clearInterval(updateInterval);
      installingWorker?.removeEventListener(
        "statechange",
        onInstallingStateChange
      );
      registration?.removeEventListener("updatefound", onUpdateFound);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("solara:native-resume", onNativeResume);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
