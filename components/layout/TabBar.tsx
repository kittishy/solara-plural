"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Layers, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: Home, label: "Início" },
  { href: "/members", icon: Users, label: "Membros" },
  { href: "/front", icon: Layers, label: "Frente" },
  { href: "/journal", icon: BookOpen, label: "Diário" },
  { href: "/settings", icon: Settings, label: "Config" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
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
                className={cn(
                  "ios-transition",
                  isActive && "scale-110"
                )}
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
      </nav>
    </div>
  );
}
