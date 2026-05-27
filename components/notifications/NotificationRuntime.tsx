"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { swrKeys } from "@/lib/swr";

// Realtime notification runtime.
//
// Strategy:
// - Connect to /api/notifications/stream (SSE) for live delivery while the
//   PWA is open. New notifications trigger immediate SWR revalidation, so
//   the badge + list update without polling.
// - Dispatch a `solara:notification` CustomEvent so other components (the
//   in-app toast) can react without opening their own SSE connection.
// - When the document regains focus or visibility, force a revalidation as
//   a belt-and-suspenders catch-up.
// - When the SW posts a `solara-push` message (background push received),
//   revalidate too.
// - EventSource handles reconnect automatically on close/error.
//
// The user no longer sees a 60s delay — updates land within ~100ms of the
// notification being created (same-instance) or within 3s (DB poll fallback
// for cross-instance).

export type SolaraNotificationPayload = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
};

export const SOLARA_NOTIFICATION_EVENT = "solara:notification";

export function NotificationRuntime() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshNotifications = () => {
      void mutate(swrKeys.notifications);
    };

    const dispatchNotification = (payload: SolaraNotificationPayload) => {
      window.dispatchEvent(
        new CustomEvent<SolaraNotificationPayload>(SOLARA_NOTIFICATION_EVENT, { detail: payload }),
      );
    };

    // --- SSE for live in-app delivery ---
    let source: EventSource | null = null;
    let retryTimer: number | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      try {
        source = new EventSource("/api/notifications/stream", { withCredentials: true });

        source.addEventListener("notification", (event) => {
          refreshNotifications();
          try {
            const parsed = JSON.parse((event as MessageEvent).data ?? "{}") as SolaraNotificationPayload;
            if (parsed.id && parsed.title) dispatchNotification(parsed);
          } catch { /* ignore malformed event */ }
        });

        source.addEventListener("ready", () => { /* connected */ });

        source.onerror = () => {
          // EventSource auto-retries when readyState=CONNECTING. If it's
          // CLOSED (auth lost, network gone), kick off a manual retry with
          // a small backoff.
          if (source && source.readyState === EventSource.CLOSED) {
            source.close();
            source = null;
            if (!stopped) {
              if (retryTimer) window.clearTimeout(retryTimer);
              retryTimer = window.setTimeout(connect, 5_000);
            }
          }
        };
      } catch {
        if (!stopped) {
          if (retryTimer) window.clearTimeout(retryTimer);
          retryTimer = window.setTimeout(connect, 10_000);
        }
      }
    };

    connect();

    // --- Catch-up on focus / visibility ---
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshNotifications();
        if (!source || source.readyState === EventSource.CLOSED) {
          if (retryTimer) window.clearTimeout(retryTimer);
          connect();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refreshNotifications);

    // --- SW push messages (background push received while tab open) ---
    let removeSwListener: (() => void) | null = null;
    if (navigator.serviceWorker) {
      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === "solara-push") {
          refreshNotifications();
        }
      };
      navigator.serviceWorker.addEventListener("message", onMessage);
      removeSwListener = () => navigator.serviceWorker.removeEventListener("message", onMessage);
    }

    return () => {
      stopped = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (source) {
        source.close();
        source = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refreshNotifications);
      if (removeSwListener) removeSwListener();
    };
  }, []);

  return null;
}
