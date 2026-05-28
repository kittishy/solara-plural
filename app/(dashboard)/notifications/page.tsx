"use client";

import useSWR, { mutate } from "swr";
import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Check, CheckCheck } from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetcher, swrKeys } from "@/lib/swr";
import { requestAndSavePushToken } from "@/lib/notifications/browser";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  readAt: string | number | Date | null;
  createdAt: string | number | Date;
};

type NotificationsPayload = {
  notifications: Notification[];
  unreadCount: number;
};

export default function NotificationsPage() {
  const { t } = useLanguage();

  function formatRelative(value: string | number | Date) {
    const ms = Date.now() - new Date(value).getTime();
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day}d`;
    if (hr > 0) return `${hr}h`;
    if (min > 0) return `${min}min`;
    return t("notifications.timeNow");
  }
  const { data, isLoading } = useSWR<NotificationsPayload>(
    swrKeys.notifications,
    apiFetcher
  );

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [enabling, setEnabling] = useState(false);
  const [marking, setMarking] = useState(false);
  const [pushError, setPushError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  async function enablePush() {
    setEnabling(true);
    setPushError("");
    const result = await requestAndSavePushToken();
    if (!result.success) {
      const messages: Record<string, string> = {
        notifications_unsupported: t("notifications.errors.unsupported"),
        push_unsupported: t("notifications.errors.pushUnsupported"),
        permission_not_granted: t("notifications.errors.denied"),
        web_push_not_configured: t("notifications.errors.notConfigured"),
        subscription_save_failed: t("notifications.errors.saveFailed"),
      };
      setPushError(messages[result.reason] ?? t("common.error"));
    } else {
      setPermission("granted");
    }
    setEnabling(false);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    void mutate(swrKeys.notifications);
  }

  async function markAllRead() {
    setMarking(true);
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "same-origin",
      });
      void mutate(swrKeys.notifications);
    } finally {
      setMarking(false);
    }
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const pushStatusLabel =
    permission === "granted"
      ? t("notifications.pushEnabled")
      : permission === "denied"
        ? t("notifications.pushBlocked")
        : permission === "unsupported"
          ? t("notifications.pushUnsupported")
          : t("notifications.pushDisabled");

  const canShowEnableButton =
    permission === "default" || permission === "granted";

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2">
        <LargeTitle className="px-0">{t("notifications.title")}</LargeTitle>
      </div>

      {/* Permission card */}
      <div className="px-4 mb-4">
        <GlassCard padding="md">
          <div className="flex items-center gap-3">
            {permission === "granted" ? (
              <BellRing size={24} className="text-ios-green flex-shrink-0" />
            ) : permission === "denied" ? (
              <BellOff size={24} className="text-ios-red flex-shrink-0" />
            ) : (
              <Bell size={24} className="text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-body font-semibold text-foreground">
                {pushStatusLabel}
              </p>
              <p className="text-caption-1 text-muted-foreground">
                {permission === "granted"
                  ? t("notifications.pushEnabledDesc")
                  : permission === "denied"
                    ? t("notifications.pushBlockedDesc")
                    : t("notifications.pushDisabledDesc")}
              </p>
            </div>
            {canShowEnableButton && (
              <Button
                size="sm"
                onClick={enablePush}
                disabled={enabling}
              >
                {enabling
                  ? t("notifications.enabling")
                  : permission === "granted"
                    ? t("notifications.resync")
                    : t("notifications.enable")}
              </Button>
            )}
          </div>
          {permission === "denied" && (
            <p className="text-caption-1 text-muted-foreground mt-2">
              {t("notifications.deniedHowTo")}
            </p>
          )}
          {pushError && (
            <p className="text-caption-1 text-ios-red mt-2">{pushError}</p>
          )}
        </GlassCard>
      </div>

      {/* Mark all read */}
      {unreadCount > 0 && (
        <div className="px-4 mb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllRead}
            disabled={marking}
            className="w-full"
          >
            <CheckCheck size={16} />
            {marking ? "..." : t("notifications.markAllRead", { n: unreadCount })}
          </Button>
        </div>
      )}

      {/* List */}
      <div className="px-4">
        <GlassCard padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-subheadline">
              <Bell size={32} className="mx-auto text-muted-foreground/40 mb-2" />
              {t("notifications.empty")}
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.readAt;
              return (
                <button
                  key={n.id}
                  onClick={() => isUnread && markRead(n.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3.5 border-b border-border/50 last:border-0 text-left active:bg-muted/50 ios-transition",
                    isUnread && "bg-ios-blue/5"
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                      isUnread ? "bg-ios-blue" : "bg-transparent"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-body font-semibold text-foreground">
                        {n.title}
                      </p>
                      <span className="text-caption-1 text-muted-foreground flex-shrink-0">
                        {formatRelative(n.createdAt)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="text-subheadline text-muted-foreground mt-0.5">
                        {n.body}
                      </p>
                    )}
                  </div>
                  {isUnread && (
                    <Check
                      size={14}
                      className="text-ios-blue/60 flex-shrink-0 mt-1"
                    />
                  )}
                </button>
              );
            })
          )}
        </GlassCard>
      </div>
    </div>
  );
}
