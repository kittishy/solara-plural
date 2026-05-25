"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import {
  User,
  Bell,
  Shield,
  Download,
  Upload,
  Trash2,
  Moon,
  Globe,
  LogOut,
  Palette,
  ListPlus,
} from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { LanguageSelector } from "@/components/language/LanguageSelector";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [signingOut, setSigningOut] = useState(false);

  const themeLabel =
    theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  async function handleExport() {
    const res = await fetch("/api/export", { credentials: "same-origin" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "solara-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2">
        <LargeTitle className="px-0">{t("settings.title")}</LargeTitle>
      </div>

      {/* Profile */}
      <div className="px-4 mb-6">
        <Link href="/settings/profile">
          <GroupedSection>
            <div className="flex items-center gap-3 px-4 py-3 min-h-[44px] active:bg-muted/50 ios-transition cursor-pointer">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="text-body bg-ios-blue/20 text-ios-blue">
                  {(session?.user?.name ?? "S")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-foreground truncate">
                  {session?.user?.name ?? "Sistema"}
                </p>
                <p className="text-caption-1 text-muted-foreground truncate">
                  {session?.user?.email ?? t("settings.profile")}
                </p>
              </div>
              <svg
                width="8"
                height="13"
                viewBox="0 0 8 13"
                fill="none"
                className="text-muted-foreground/60 flex-shrink-0"
              >
                <path
                  d="M1 1L7 6.5L1 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </GroupedSection>
        </Link>
      </div>

      {/* Appearance */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("settings.appearance")}
        </p>
        <GroupedSection>
          <Link href="/settings/theme">
            <GroupedRow
              label={t("settings.themeColors")}
              icon={<Palette size={18} />}
              value={themeLabel}
              chevron
              className="cursor-pointer"
            />
          </Link>
          <div className="flex items-center gap-3 px-4 py-2 min-h-[44px]">
            <span className="w-8 h-8 flex items-center justify-center text-ios-blue flex-shrink-0">
              <Globe size={18} />
            </span>
            <span className="flex-1 text-body text-foreground">{t("settings.language")}</span>
            <LanguageSelector />
          </div>
        </GroupedSection>
      </div>

      {/* Customization */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("settings.customization")}
        </p>
        <GroupedSection>
          <Link href="/settings/custom-fields">
            <GroupedRow
              label={t("settings.customFields")}
              icon={<ListPlus size={18} />}
              chevron
              className="cursor-pointer"
            />
          </Link>
        </GroupedSection>
      </div>

      {/* Account */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("settings.account")}
        </p>
        <GroupedSection>
          <Link href="/settings/profile">
            <GroupedRow
              label={t("settings.profile")}
              icon={<User size={18} />}
              chevron
              className="cursor-pointer"
            />
          </Link>
          <Link href="/settings/notifications">
            <GroupedRow
              label={t("settings.notifications")}
              icon={<Bell size={18} />}
              chevron
              className="cursor-pointer"
            />
          </Link>
          <Link href="/settings/privacy">
            <GroupedRow
              label={t("settings.privacy")}
              icon={<Shield size={18} />}
              chevron
              className="cursor-pointer"
            />
          </Link>
        </GroupedSection>
      </div>

      {/* Data */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("settings.data")}
        </p>
        <GroupedSection>
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] active:bg-muted/50 ios-transition"
          >
            <span className="w-8 h-8 flex items-center justify-center text-ios-blue flex-shrink-0">
              <Download size={18} />
            </span>
            <span className="flex-1 text-left text-body text-foreground">
              {t("settings.exportData")}
            </span>
          </button>
          <Link href="/settings/import">
            <GroupedRow
              label={t("settings.importData")}
              icon={<Upload size={18} />}
              chevron
              className="cursor-pointer"
            />
          </Link>
        </GroupedSection>
      </div>

      {/* Danger */}
      <div className="px-4 mb-6">
        <GroupedSection>
          <Link href="/settings/delete-account">
            <GroupedRow
              label={t("settings.deleteAccount")}
              icon={<Trash2 size={18} className="text-ios-red" />}
              chevron
              className="cursor-pointer"
            />
          </Link>
        </GroupedSection>
      </div>

      {/* Sign out */}
      <div className="px-4 mb-10">
        <Button
          variant="outline"
          className="w-full text-ios-red border-ios-red/30 hover:bg-ios-red/5"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut size={18} />
          {signingOut ? t("settings.signingOut") : t("settings.signOut")}
        </Button>
      </div>
    </div>
  );
}
