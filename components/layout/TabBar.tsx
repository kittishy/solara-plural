"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Sun,
  Hand,
  BookOpen,
  Ellipsis,
  FileText,
  Bell,
  Settings,
} from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useHaptics } from "@/lib/haptics";
import { stripLanguageFromPathname } from "@/lib/i18n";
import { apiFetcher, swrKeys } from "@/lib/swr";
import { LocalizedLink } from "@/components/navigation/LocalizedLink";

const moreHrefList = ["/journal", "/friends", "/notes", "/notifications", "/settings"];

export function TabBar() {
  // Localized routes are prefixed with the language (/en, /pt-BR, …) —
  // strip it so the active-tab checks match the canonical hrefs.
  const pathname = stripLanguageFromPathname(usePathname() ?? "/");
  const [sheetOpen, setSheetOpen] = useState(false);
  const { t } = useLanguage();
  const { selection } = useHaptics();

  const tabs = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/members", icon: Users, label: t("nav.people") },
    { href: "/front", icon: Hand, label: t("home.passLight") },
    { href: "/front/history", icon: Sun, label: t("nav.day") },
  ];

  const moreItems = [
    { href: "/journal", icon: BookOpen, label: t("journal.title"), color: "#AF52DE" },
    { href: "/friends", icon: Users, label: t("nav.friends"), color: "#32ADE6" },
    { href: "/notes", icon: FileText, label: t("notes.title"), color: "#FF9500" },
    { href: "/notifications", icon: Bell, label: t("nav.notifications"), color: "#34C759" },
    { href: "/settings", icon: Settings, label: t("nav.settings"), color: "#8E8E93" },
  ];

  // NotificationRuntime (in the dashboard layout) drives realtime updates
  // via SSE + visibility change, so this cache stays fresh without polling.
  const { data: notifData } = useSWR<{ notifications: unknown[]; unreadCount: number }>(
    swrKeys.notifications,
    apiFetcher
  );
  const unreadCount = notifData?.unreadCount ?? 0;

  const isDayActive = pathname.startsWith("/front/history");
  const isMaisActive = moreHrefList.some((href) => pathname.startsWith(href));

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-50"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
          paddingLeft: "max(env(safe-area-inset-left, 0px), 8px)",
          paddingRight: "max(env(safe-area-inset-right, 0px), 8px)",
          background: "var(--tabbar-bg)",
          borderTop: "1px solid var(--tabbar-border)",
        }}
      >
        <nav
          aria-label={t("nav.mobilePrimary")}
          className="mx-auto flex h-[62px] w-full max-w-xl items-stretch px-2"
        >
          {tabs.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : href === "/front"
                  ? pathname === "/front"
                  : href === "/front/history"
                    ? isDayActive
                    : pathname.startsWith(href);
            return (
              <LocalizedLink
                key={href}
                href={href}
                // Always-mounted nav → eagerly prefetch the primary routes so
                // tapping a tab paints instantly (bundle + RSC already warm).
                prefetch
                onPointerDown={() => { if (!isActive) selection(); }}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 ios-transition solara-pressable",
                  isActive
                    ? "text-ios-blue"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={{ ["--press-scale" as string]: "0.92" }}
              >
                {isActive && (
                  <span
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-ios-blue"
                    aria-hidden
                  />
                )}
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className="ios-transition"
                />
                <span
                  className={cn(
                    "max-w-full truncate text-xs font-semibold leading-4 tracking-[0.01em] ios-transition",
                    isActive && "font-bold"
                  )}
                >
                  {label}
                </span>
              </LocalizedLink>
            );
          })}

          {/* More tab */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            onPointerDown={() => selection()}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 ios-transition solara-pressable",
              isMaisActive
                ? "text-ios-blue"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={{ ["--press-scale" as string]: "0.92" }}
            aria-label={t("nav.moreOptions")}
          >
            {isMaisActive && (
              <span
                className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-ios-blue"
                aria-hidden
              />
            )}
            <div className="relative">
              <Ellipsis
                size={22}
                strokeWidth={isMaisActive ? 2.4 : 1.8}
                className="ios-transition"
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-ios-red rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span
              className={cn(
                "max-w-full truncate text-xs font-semibold leading-4 tracking-[0.01em] ios-transition",
                isMaisActive && "font-bold"
              )}
            >
              {t("nav.more")}
            </span>
          </button>
        </nav>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("nav.more")}
      >
        <div className="grid grid-cols-2 gap-3">
          {moreItems.map(({ href, icon: Icon, label, color }) => {
            const showBadge = href === "/notifications" && unreadCount > 0;
            return (
              <LocalizedLink
                key={href}
                href={href}
                prefetch
                onClick={() => setSheetOpen(false)}
                className="solara-surface rounded-ios p-4 flex flex-col items-center gap-2.5 ios-press active:scale-95 ios-transition"
              >
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-ios flex items-center justify-center"
                    style={{ background: `${color}1f` }}
                  >
                    <Icon size={24} strokeWidth={2} style={{ color }} />
                  </div>
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-ios-red rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-caption-1 font-semibold text-foreground text-center">
                  {label}
                </span>
              </LocalizedLink>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
