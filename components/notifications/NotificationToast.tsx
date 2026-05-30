"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { mutate } from "swr";
import { swrKeys } from "@/lib/swr";
import {
  SOLARA_NOTIFICATION_EVENT,
  type SolaraNotificationPayload,
} from "@/components/notifications/NotificationRuntime";

// In-app toast for new notifications. Subscribes to the `solara:notification`
// CustomEvent dispatched by NotificationRuntime (one shared SSE connection).

type ToastItem = {
  id: string;
  title: string;
  body: string;
  expiresAt: number;
};

const TOAST_TTL_MS = 5_000;
const MAX_VISIBLE = 3;

export function NotificationToast() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onNotification = (event: Event) => {
      const detail = (event as CustomEvent<SolaraNotificationPayload>).detail;
      if (!detail?.id || !detail.title) return;
      // Don't toast while the user is looking at the notifications page
      // — they're already there and the badge would be misleading.
      if (window.location.pathname.endsWith("/notifications")) return;

      setToasts((prev) => {
        if (prev.some((toast) => toast.id === detail.id)) return prev;
        return [
          ...prev,
          {
            id: detail.id,
            title: detail.title,
            body: detail.body ?? "",
            expiresAt: Date.now() + TOAST_TTL_MS,
          },
        ].slice(-MAX_VISIBLE);
      });
    };

    window.addEventListener(SOLARA_NOTIFICATION_EVENT, onNotification);
    return () => window.removeEventListener(SOLARA_NOTIFICATION_EVENT, onNotification);
  }, []);

  // Tick to expire toasts.
  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((toast) => toast.expiresAt > now));
    }, 500);
    return () => window.clearInterval(interval);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-[calc(var(--safe-top)+0.75rem)] left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none w-[min(420px,calc(100%-1.5rem))]"
      aria-live="polite"
      role="status"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            void mutate(swrKeys.notifications);
            router.push("/notifications");
          }}
          className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-ios-xl text-left ios-press animate-fade-in"
          style={{
            background: "var(--tabbar-bg)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid var(--tabbar-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}
        >
          <Bell size={18} className="text-ios-blue mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-subheadline font-semibold text-foreground truncate">{toast.title}</p>
            {toast.body && (
              <p className="text-caption-1 text-muted-foreground line-clamp-2">{toast.body}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
