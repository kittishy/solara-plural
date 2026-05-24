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

const tabs = [
  { href: "/", icon: Home, label: "Início" },
  { href: "/members", icon: Users, label: "Membros" },
  { href: "/front", icon: Layers, label: "Frente" },
  { href: "/journal", icon: BookOpen, label: "Diário" },
];

const moreItems = [
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/friends", icon: Users, label: "Amigos" },
  { href: "/partners", icon: Heart, label: "Parcerias" },
  { href: "/notes", icon: FileText, label: "Notas" },
  { href: "/notifications", icon: Bell, label: "Notificações" },
  { href: "/settings", icon: Settings, label: "Configurações" },
];

const moreHrefs = moreItems.map((item) => item.href);

export function TabBar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isMaisActive = moreHrefs.some((href) => pathname.startsWith(href));

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

          {/* Mais tab */}
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
              Mais
            </span>
          </button>
        </nav>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Mais"
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
