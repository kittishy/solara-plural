"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Layers,
  BookOpen,
  Grid3X3,
  MessageCircle,
  Heart,
  FileText,
  Bell,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { useLanguage } from "@/components/providers/LanguageProvider";

const tabHrefs = ["/", "/members", "/front", "/chat"];
const moreHrefList = ["/journal", "/friends", "/partners", "/notes", "/notifications", "/settings"];

export function TabBar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { t } = useLanguage();

  const tabs = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/members", icon: Users, label: t("nav.members") },
    { href: "/front", icon: Layers, label: t("front.title") },
    { href: "/chat", icon: MessageCircle, label: t("nav.chat") },
  ];

  const moreItems = [
    { href: "/journal", icon: BookOpen, label: t("journal.title") },
    { href: "/friends", icon: Users, label: t("nav.friends") },
    { href: "/partners", icon: Heart, label: t("nav.partners") },
    { href: "/notes", icon: FileText, label: t("notes.title") },
    { href: "/notifications", icon: Bell, label: t("nav.notifications") },
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  const isMaisActive = moreHrefList.some((href) => pathname.startsWith(href));

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 safe-bottom">
        <nav
          className="flex items-center gap-1 px-3 py-2 rounded-ios-2xl shadow-ios-md"
          style={{
            background: "var(--tabbar-bg)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid var(--tabbar-border)",
          }}
        >
          {tabs.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-ios-lg ios-transition select-none min-w-[56px]",
                  isActive
                    ? "text-ios-blue"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={cn("ios-transition", isActive && "scale-110")}
                />
                <span
                  className={cn(
                    "text-caption-2 font-medium ios-transition",
                    isActive && "font-semibold"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-ios-lg ios-transition select-none min-w-[56px]",
              isMaisActive
                ? "text-ios-blue"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid3X3
              size={24}
              strokeWidth={isMaisActive ? 2.5 : 1.8}
              className={cn("ios-transition", isMaisActive && "scale-110")}
            />
            <span
              className={cn(
                "text-caption-2 font-medium ios-transition",
                isMaisActive && "font-semibold"
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
          {moreItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSheetOpen(false)}
              className="glass rounded-ios-xl p-4 flex flex-col items-center gap-2 ios-press active:scale-95 ios-transition"
            >
              <Icon size={28} strokeWidth={1.8} className="text-ios-blue" />
              <span className="text-caption-1 font-medium text-foreground text-center">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
