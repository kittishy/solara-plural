"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellRing, BellOff } from "lucide-react";
import { GlassCard, GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { PermissionPrimer } from "@/components/onboarding/PermissionPrimer";
import { requestAndSavePushToken } from "@/lib/notifications/browser";
import { isNativeAppRuntime } from "@/lib/swr";
import { useHaptics } from "@/lib/haptics";
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
  const { success, error: errorHaptic } = useHaptics();
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported" | "native-app"
  >("default");
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState("");
  const [primerOpen, setPrimerOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNativeAppRuntime() && !("Notification" in window)) {
      setPermission("native-app");
      return;
    }
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
      errorHaptic();
    } else {
      setPermission("granted");
      success();
    }
    setEnabling(false);
  }

  async function sendTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setTestMsg({ ok: true, text: t("notifications.testSent") });
        success();
      } else if (json?.error === "no_active_subscriptions") {
        setTestMsg({ ok: false, text: t("notifications.testNoSubs") });
        errorHaptic();
      } else {
        setTestMsg({ ok: false, text: t("notifications.testFailed") });
        errorHaptic();
      }
    } catch {
      setTestMsg({ ok: false, text: t("notifications.testFailed") });
      errorHaptic();
    }
    setTesting(false);
  }

  // Already-granted users (resync) skip the explainer; new users see the
  // pre-permission primer first so the OS popup never appears cold.
  function handleEnableClick() {
    if (permission === "granted") {
      void enable();
    } else {
      setPrimerOpen(true);
    }
  }

  const statusTitle =
    permission === "native-app"
      ? t("notifications.appActive")
      : permission === "granted"
      ? t("notifications.pushEnabled")
      : permission === "denied"
        ? t("notifications.pushBlocked")
        : permission === "unsupported"
          ? t("notifications.pushUnsupported")
          : t("notifications.pushDisabled");

  const statusDesc =
    permission === "native-app"
      ? t("notifications.appActiveDesc")
      : permission === "granted"
      ? t("notifications.pushEnabledDesc")
      : permission === "denied"
        ? t("notifications.pushBlockedDesc")
        : permission === "unsupported"
          ? t("notifications.pushUnsupportedDesc")
          : t("notifications.pushDisabledDesc");

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40 pt-[var(--safe-top)]">
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
            {permission === "granted" || permission === "native-app" ? (
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
            {(permission === "default" || permission === "granted") && (
              <Button onClick={handleEnableClick} disabled={enabling}>
                {enabling
                  ? t("notifications.enabling")
                  : permission === "granted"
                    ? t("notifications.resync")
                    : t("notifications.enablePush")}
              </Button>
            )}
            {permission === "denied" && (
              <p className="text-subheadline text-muted-foreground">
                {t("notifications.deniedHowTo")}
              </p>
            )}
            {error && (
              <p className="text-subheadline text-ios-red">{error}</p>
            )}
            {(permission === "granted" || permission === "native-app") && (
              <>
                <Button
                  variant="secondary"
                  onClick={sendTest}
                  disabled={testing}
                >
                  {testing
                    ? t("notifications.sendingTest")
                    : t("notifications.sendTest")}
                </Button>
                {testMsg && (
                  <p
                    className={`text-subheadline ${
                      testMsg.ok ? "text-ios-green" : "text-ios-red"
                    }`}
                  >
                    {testMsg.text}
                  </p>
                )}
              </>
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

      <PermissionPrimer
        open={primerOpen}
        onClose={() => setPrimerOpen(false)}
        onAllow={enable}
        icon={BellRing}
        title={t("notifications.primer.title")}
        description={t("notifications.primer.body")}
        benefits={[
          t("notifications.primer.b1"),
          t("notifications.primer.b2"),
          t("notifications.primer.b3"),
        ]}
        allowLabel={t("notifications.primer.allow")}
        laterLabel={t("notifications.primer.later")}
        tint="var(--ios-green)"
      />
    </div>
  );
}
