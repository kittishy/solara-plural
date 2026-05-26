"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellRing, BellOff } from "lucide-react";
import { GlassCard, GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { requestAndSavePushToken } from "@/lib/notifications/browser";
import { useLanguage } from "@/components/providers/LanguageProvider";

const errorKeyMap: Record<string, string> = {
  notifications_unsupported: "notifications.errors.unsupported",
  push_unsupported: "notifications.errors.pushUnsupported",
  permission_not_granted: "notifications.errors.denied",
  web_push_not_configured: "notifications.errors.notConfigured",
  subscription_save_failed: "notifications.errors.saveFailed",
};

export default function NotificationsSettingsPage() {
  const { t } = useLanguage();
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  async function enable() {
    setEnabling(true);
    setError("");
    const result = await requestAndSavePushToken();
    if (!result.success) {
      const key = errorKeyMap[result.reason] ?? "notifications.errors.unknown";
      setError(t(key as Parameters<typeof t>[0]));
    } else {
      setPermission("granted");
    }
    setEnabling(false);
  }

  const statusTitle =
    permission === "granted"
      ? t("notifications.pushEnabled")
      : permission === "denied"
        ? t("notifications.pushBlocked")
        : permission === "unsupported"
          ? t("notifications.pushUnsupported")
          : t("notifications.pushDisabled");

  const statusDesc =
    permission === "granted"
      ? t("notifications.pushEnabledDesc")
      : permission === "denied"
        ? t("notifications.pushBlockedDesc")
        : permission === "unsupported"
          ? t("notifications.pushUnsupportedDesc")
          : t("notifications.pushDisabledDesc");

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center px-4 h-11">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("settings.title")}</span>
          </Link>
          <h1 className="text-headline font-semibold absolute left-1/2 -translate-x-1/2">
            {t("notifications.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        <GlassCard padding="lg">
          <div className="flex flex-col items-center gap-3 text-center">
            {permission === "granted" ? (
              <BellRing size={32} className="text-ios-green" />
            ) : permission === "denied" ? (
              <BellOff size={32} className="text-ios-red" />
            ) : (
              <Bell size={32} className="text-muted-foreground" />
            )}
            <div>
              <h2 className="text-title-3 text-foreground">{statusTitle}</h2>
              <p className="text-subheadline text-muted-foreground mt-1">
                {statusDesc}
              </p>
            </div>
            {permission === "default" && (
              <Button onClick={enable} disabled={enabling}>
                {enabling ? t("notifications.enabling") : t("notifications.enablePush")}
              </Button>
            )}
            {error && (
              <p className="text-subheadline text-ios-red">{error}</p>
            )}
          </div>
        </GlassCard>

        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("notifications.types")}
          </p>
          <GroupedSection>
            <GroupedRow label={t("notifications.frontChanges")} value={t("notifications.active")} />
            <GroupedRow label={t("notifications.friendRequests")} value={t("notifications.active")} />
            <GroupedRow label={t("notifications.partnerRequests")} value={t("notifications.active")} />
            <GroupedRow label={t("notifications.checkInReminders")} value={t("notifications.active")} />
          </GroupedSection>
          <p className="text-caption-1 text-muted-foreground mt-2 px-1">
            {t("notifications.allSentWhenActive")}
          </p>
        </div>
      </div>
    </div>
  );
}
