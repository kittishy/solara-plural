"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { swrKeys, isNativeAppRuntime } from "@/lib/swr";
import {
  ensureNativeNotificationPermission,
  showNativeAppNotification,
} from "@/lib/notifications/native-app";
import { shouldOpenSseStream } from "@/lib/notifications/sse-gate";

// Realtime notification runtime.
//
// Strategy (docs/SYSTEM_DESIGN.md §3/§5 — realtime rides on push first):
// - Push-granted browser tabs and the Capacitor app get realtime via push:
//   the service worker posts `solara-push` to open tabs and we revalidate
//   SWR on that message. These sessions NEVER open the SSE stream — each
//   open stream costs a continuous serverless invocation on the free tier.
// - Only when push is unavailable (permission denied/undecided, or no
//   Notification API) do we fall back to /api/notifications/stream (SSE).
//   New notifications there trigger immediate SWR revalidation.
// - Dispatch a `solara:notification` CustomEvent so other components (the
//   in-app toast) can react without opening their own SSE connection. For
//   push-granted tabs the OS notification takes that role instead.
// - When the document regains focus or visibility, force a revalidation as
//   a belt-and-suspenders catch-up, and re-evaluate the SSE gate (the user
//   may have granted or revoked push mid-session).

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

    // Silent re-sync of push subscription.
    //
    // Covers the case where the user previously granted notification
    // permission, but the server-side push token is missing (e.g. cleared
    // by a fresh install, or never saved because VAPID wasn't configured
    // when they first opted in). Re-subscribing with the current VAPID
    // public key is idempotent — the token row is upserted by endpoint
    // hash — so it's safe to run on every PWA load.
    void (async () => {
      try {
        // Inside the installed Android app (Capacitor) use NATIVE FCM push — it
        // works regardless of the user's default browser. A TWA/web-push path
        // breaks for Samsung-default users because the TWA runs Samsung
        // Internet, which doesn't deliver web-push notifications reliably.
        const { isCapacitorNative, registerNativePush } = await import("@/lib/notifications/native-push");
        if (isCapacitorNative()) {
          await registerNativePush();
          return;
        }

        // Browser / installed PWA: web push (VAPID).
        await ensureNativeNotificationPermission();
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        const { requestAndSavePushToken } = await import("@/lib/notifications/browser");
        await requestAndSavePushToken();
      } catch { /* ignore — we'll retry on next load */ }
    })();

    const dispatchNotification = (payload: SolaraNotificationPayload) => {
      window.dispatchEvent(
        new CustomEvent<SolaraNotificationPayload>(SOLARA_NOTIFICATION_EVENT, { detail: payload }),
      );
      void showNativeAppNotification({
        id: payload.id,
        title: payload.title,
        body: payload.body,
      });
    };

    // --- SSE for live in-app delivery ---
    let source: EventSource | null = null;
    let retryTimer: number | null = null;
    let stopped = false;

    const closeSource = () => {
      if (source) {
        source.close();
        source = null;
      }
    };

    const sseAllowed = () =>
      shouldOpenSseStream({
        permission: "Notification" in window ? Notification.permission : null,
        isCapacitorNative: isNativeAppRuntime(),
      });

    const connect = () => {
      if (stopped || document.visibilityState === "hidden") return;
      // Cost gate: push-covered sessions must not hold an SSE stream open.
      if (!sseAllowed()) return;
      if (source && source.readyState !== EventSource.CLOSED) return;
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
          if (source && source.readyState === EventSource.CLOSED) {
            closeSource();
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

    // --- Catch-up on focus / visibility (also re-evaluates the SSE gate) ---
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshNotifications();
        if (source && !sseAllowed()) {
          // Push was granted mid-session — the stream is now redundant cost.
          closeSource();
        } else if (!source || source.readyState === EventSource.CLOSED) {
          if (retryTimer) window.clearTimeout(retryTimer);
          connect();
        }
      } else {
        if (retryTimer) window.clearTimeout(retryTimer);
        closeSource();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refreshNotifications);

    // --- React to permission changes without waiting for a tab switch ---
    // Chromium fires this when the user grants/revokes notifications while
    // the page is open; Safari lacks 'notifications' in the Permissions API,
    // in which case the visibilitychange re-check above is the fallback.
    let permissionStatus: PermissionStatus | null = null;
    const onPermissionChange = () => {
      if (stopped) return;
      if (source && !sseAllowed()) closeSource();
      else if (!source) connect();
    };
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          if (stopped) return;
          permissionStatus = status;
          status.addEventListener("change", onPermissionChange);
        })
        .catch(() => { /* unsupported — visibility fallback covers it */ });
    }

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
      closeSource();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refreshNotifications);
      if (permissionStatus) permissionStatus.removeEventListener("change", onPermissionChange);
      if (removeSwListener) removeSwListener();
    };
  }, []);

  return null;
}
