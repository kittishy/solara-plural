"use client";

import { useSession, signOut } from "next-auth/react";
import { clearPersistentSwrCache } from "@/lib/swr-cache-provider";
import { useState } from "react";
import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
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
  RefreshCw,
  AlertTriangle,
  GitFork,
  ShieldCheck,
} from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { LanguageSelector } from "@/components/language/LanguageSelector";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { localizePathname } from "@/lib/i18n";
import { BottomSheet } from "@/components/glass/BottomSheet";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [signingOut, setSigningOut] = useState(false);
  const [showAccountType, setShowAccountType] = useState(false);
  const [switchingType, setSwitchingType] = useState(false);
  const [typeError, setTypeError] = useState("");

  const currentType: "system" | "singlet" = (session?.user as { accountType?: "system" | "singlet" } | undefined)?.accountType ?? "system";

  async function handleSwitchType() {
    const targetType = currentType === "system" ? "singlet" : "system";
    setSwitchingType(true);
    setTypeError("");
    try {
      const res = await fetch("/api/account/type", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: targetType,
          acknowledgeDataRisk: true,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setTypeError(json.error ?? t("common.saveError"));
        return;
      }
      setShowAccountType(false);
      window.location.reload();
    } finally {
      setSwitchingType(false);
    }
  }

  const themeLabel =
    theme === "light" ? t("theme.light") : theme === "dark" ? t("theme.dark") : t("theme.system");

  async function handleSignOut() {
    setSigningOut(true);
    // Wipe this device's persisted SWR cache before leaving so the next user
    // on a shared device never sees the previous account's data.
    clearPersistentSwrCache();
    await signOut({ callbackUrl: localizePathname("/login", language) });
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
            <div className="flex items-center gap-3.5 px-4 py-4 active:bg-muted/50 ios-transition cursor-pointer">
              <Avatar className="w-14 h-14 shadow-lg shadow-ios-blue/20">
                <AvatarFallback className="text-title-3 font-bold text-white bg-gradient-to-br from-[#8b5cf6] to-[#ec4899]">
                  {(session?.user?.name ?? t("settings.system"))[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-headline font-bold text-foreground truncate">
                  {session?.user?.name ?? t("settings.system")}
                </p>
                <p className="text-footnote text-muted-foreground truncate">
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

      {/* Admin panel — only visible to admin accounts */}
      {(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin && (
        <div className="px-4 mb-6">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("settings.adminSection")}
          </p>
          <GroupedSection>
            <Link href="/admin">
              <GroupedRow
                label={t("settings.adminPanel")}
                icon={<ShieldCheck size={18} />}
                tint="#5856D6"
                chevron
                className="cursor-pointer"
              />
            </Link>
          </GroupedSection>
        </div>
      )}

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
              tint="#AF52DE"
              value={themeLabel}
              chevron
              className="cursor-pointer"
            />
          </Link>
          <div className="flex items-center gap-3 px-4 py-2 min-h-[48px]">
            <span
              className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{ color: "#32ADE6", background: "#32ADE61f" }}
            >
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
              tint="#FF9500"
              chevron
              className="cursor-pointer"
            />
          </Link>
          <Link href="/settings/integrations">
            <GroupedRow
              label={t("settings.integrations")}
              icon={<GitFork size={18} />}
              tint="#34C759"
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
              tint="#8B5CF6"
              chevron
              className="cursor-pointer"
            />
          </Link>
          <Link href="/settings/notifications">
            <GroupedRow
              label={t("settings.notifications")}
              icon={<Bell size={18} />}
              tint="#FF2D55"
              chevron
              className="cursor-pointer"
            />
          </Link>
          <Link href="/settings/privacy">
            <GroupedRow
              label={t("settings.privacy")}
              icon={<Shield size={18} />}
              tint="#3B82F6"
              chevron
              className="cursor-pointer"
            />
          </Link>
          <GroupedRow
            label={t("settings.accountType")}
            value={currentType === "singlet" ? t("settings.singlet") : t("settings.system")}
            icon={<RefreshCw size={18} />}
            tint="#8E8E93"
            chevron
            className="cursor-pointer"
            onClick={() => setShowAccountType(true)}
          />
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
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] active:bg-muted/50 ios-transition"
          >
            <span
              className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{ color: "#34C759", background: "#34C7591f" }}
            >
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
              tint="#32ADE6"
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
              icon={<Trash2 size={18} />}
              tint="#FF3B30"
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

      <BottomSheet
        open={showAccountType}
        onClose={() => setShowAccountType(false)}
        title={t("settings.accountType")}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 rounded-ios-lg bg-ios-blue/5 border border-ios-blue/15">
            <RefreshCw size={20} className="text-ios-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body font-semibold text-foreground">
                {currentType === "singlet" ? t("settings.system") : t("settings.singlet")}
              </p>
              <p className="text-subheadline text-muted-foreground mt-1">
                {currentType === "singlet"
                  ? t("settings.accountTypeUpgradeDesc")
                  : t("settings.accountTypeSwitchDesc")}
              </p>
            </div>
          </div>

          {typeError && (
            <p className="text-subheadline text-ios-red text-center">{typeError}</p>
          )}

          <Button
            onClick={handleSwitchType}
            disabled={switchingType}
            className="w-full"
          >
            {switchingType ? t("common.saving") : t("common.confirm")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowAccountType(false)}
            className="w-full"
          >
            {t("common.cancel")}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
