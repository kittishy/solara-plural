"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { registerSolaraServiceWorker } from "@/lib/notifications/browser";
import { swrKeys } from "@/lib/swr";

export function NotificationRuntime() {
  useEffect(() => {
    void registerSolaraServiceWorker();

    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "solara-push") {
        void mutate(swrKeys.notifications);
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  return null;
}
