"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  ShieldAlert,
  ScrollText,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { localizePathname } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Accounts", icon: Users },
  { href: "/admin/maintenance", label: "Maintenance & Announcements", icon: Megaphone },
  { href: "/admin/moderation", label: "Moderation & Health", icon: ShieldAlert },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string | null;
  children: React.ReactNode;
}) {
  const { language } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // pathname includes the language prefix (e.g. /pt/admin/users); compare on the
  // unprefixed segment so the active state survives localization.
  const normalized = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const loc = (href: string) => localizePathname(href, language);

  const navLinks = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact ? normalized === item.href : normalized.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={loc(item.href)}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-ios-blue text-white shadow-ios"
                : "text-foreground/80 hover:bg-muted/60",
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-[var(--ios-bg)] text-foreground">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-[var(--ios-bg-secondary)]/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] backdrop-blur">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldAlert size={18} className="text-ios-blue" />
          Solara Admin
        </div>
        <button
          aria-label="Menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg p-2 active:bg-muted"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {mobileOpen && (
        <div className="md:hidden border-b border-border/60 bg-[var(--ios-bg-secondary)] px-4 py-3">
          {navLinks}
          <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
            <Link
              href={loc("/")}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink size={16} /> Back to app
            </Link>
            {adminEmail && (
              <p className="truncate px-1 text-xs text-muted-foreground" title={adminEmail}>
                {adminEmail}
              </p>
            )}
            <button
              onClick={() => signOut({ callbackUrl: loc("/login") })}
              className="flex items-center gap-2 px-1 text-sm text-ios-red hover:opacity-80"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex sticky top-0 h-[100dvh] w-64 flex-col gap-6 border-r border-border/60 bg-[var(--ios-bg-secondary)] p-5">
          <div className="flex items-center gap-2 px-1 text-lg font-bold">
            <ShieldAlert size={22} className="text-ios-blue" />
            Solara Admin
          </div>
          {navLinks}
          <div className="mt-auto space-y-3 border-t border-border/60 pt-4">
            <Link
              href={loc("/")}
              className="flex items-center gap-2 px-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink size={14} /> Back to app
            </Link>
            {adminEmail && (
              <p className="truncate px-1 text-xs text-muted-foreground" title={adminEmail}>
                {adminEmail}
              </p>
            )}
            <button
              onClick={() => signOut({ callbackUrl: loc("/login") })}
              className="flex items-center gap-2 px-1 text-xs text-ios-red hover:opacity-80"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 pb-24 md:p-8">{children}</main>
      </div>
    </div>
  );
}
