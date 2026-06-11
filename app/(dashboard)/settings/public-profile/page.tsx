"use client";

import useSWR from "swr";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Globe, Copy, Check, ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetcher } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { normalizeSlug } from "@/lib/public-profile";
import { cn } from "@/lib/utils";

type ProfileSettings = {
  slug: string | null;
  isPublic: boolean;
  showBio: boolean;
  showMembers: boolean;
  showFront: boolean;
  publicMemberIds: string[];
};

type Member = { id: string; name: string; color?: string | null };

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-[51px] h-[31px] rounded-full transition-colors flex-shrink-0",
        checked ? "bg-ios-green" : "bg-muted",
        disabled && "opacity-40"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

export default function PublicProfileSettingsPage() {
  const { t } = useLanguage();

  const { data: settingsData, isLoading: loadingSettings } = useSWR<{ data: ProfileSettings }>(
    "/api/public-profile",
    apiFetcher,
    { revalidateOnFocus: false }
  );
  const { data: membersData } = useSWR<{ data: Member[] }>(
    "/api/members?limit=500",
    apiFetcher,
    { revalidateOnFocus: false }
  );
  const members = membersData?.data ?? [];

  const [isPublic, setIsPublic] = useState(false);
  const [slug, setSlug] = useState("");
  const [showBio, setShowBio] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showFront, setShowFront] = useState(false);
  const [publicMemberIds, setPublicMemberIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedOk, setSavedOk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = settingsData?.data;
    if (s && !hydrated) {
      setIsPublic(s.isPublic);
      setSlug(s.slug ?? "");
      setShowBio(s.showBio);
      setShowMembers(s.showMembers);
      setShowFront(s.showFront);
      setPublicMemberIds(s.publicMemberIds ?? []);
      setHydrated(true);
    }
  }, [settingsData, hydrated]);

  function toggleMember(id: string) {
    setPublicMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function mapError(raw: string): string {
    switch (raw) {
      case "slug:required":
        return t("publicProfile.errSlugRequired");
      case "slug:taken":
        return t("publicProfile.errSlugTaken");
      case "slug:too_short":
        return t("publicProfile.errSlugShort");
      case "slug:too_long":
        return t("publicProfile.errSlugLong");
      case "slug:invalid_chars":
      case "slug:reserved":
        return t("publicProfile.errSlugInvalid");
      default:
        return t("common.saveError");
    }
  }

  async function handleSave() {
    setError("");
    setSavedOk(false);
    setSaving(true);
    try {
      const res = await fetch("/api/public-profile", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic,
          slug: slug.trim() || null,
          showBio,
          showMembers,
          showFront,
          publicMemberIds,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(mapError(json.error ?? ""));
        return;
      }
      setSlug(json.data.slug ?? "");
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const publicUrl =
    typeof window !== "undefined" && slug
      ? `${window.location.origin}/u/${normalizeSlug(slug)}`
      : slug
      ? `/u/${normalizeSlug(slug)}`
      : "";

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="animate-fade-in pb-10">
      <div className="sticky top-0 z-40 glass border-b border-border/40 pt-[var(--safe-top)]">
        <div className="flex items-center justify-between px-4 h-11">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("settings.title")}</span>
          </Link>
          <h1 className="text-headline font-semibold absolute left-1/2 -translate-x-1/2">
            {t("publicProfile.title")}
          </h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-body font-semibold text-ios-blue ios-press disabled:opacity-40"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>

      {loadingSettings ? (
        <div className="px-4 pt-4 flex flex-col gap-4">
          <Skeleton className="h-24 rounded-ios-lg" />
          <Skeleton className="h-40 rounded-ios-lg" />
        </div>
      ) : (
        <div className="px-4 pt-4 flex flex-col gap-5">
          {/* Intro */}
          <GlassCard padding="lg">
            <div className="flex items-start gap-3">
              <Globe size={24} className="text-ios-blue flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-headline font-semibold text-foreground mb-1">
                  {t("publicProfile.introTitle")}
                </h2>
                <p className="text-subheadline text-muted-foreground">
                  {t("publicProfile.introDesc")}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Master toggle */}
          <GlassCard padding="lg" className="flex items-center justify-between gap-4">
            <div>
              <p className="text-body font-semibold text-foreground">
                {t("publicProfile.enable")}
              </p>
              <p className="text-caption-1 text-muted-foreground mt-0.5">
                {t("publicProfile.enableHelp")}
              </p>
            </div>
            <Toggle checked={isPublic} onChange={setIsPublic} />
          </GlassCard>

          {/* Slug */}
          <GlassCard padding="lg" className="flex flex-col gap-2">
            <Label htmlFor="slug">{t("publicProfile.slug")}</Label>
            <div className="flex items-center gap-1 text-body">
              <span className="text-muted-foreground select-none">/u/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={() => setSlug((s) => normalizeSlug(s))}
                placeholder={t("publicProfile.slugPlaceholder")}
                maxLength={30}
                className="flex-1"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <p className="text-caption-1 text-muted-foreground">
              {t("publicProfile.slugHelp")}
            </p>

            {publicUrl && (
              <div className="flex items-center gap-2 mt-1 p-2 rounded-ios-sm bg-[var(--ios-bg-secondary)]">
                <span className="flex-1 text-caption-1 text-foreground truncate font-mono">
                  {publicUrl}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-ios-blue hover:bg-ios-blue/10 transition-colors flex-shrink-0"
                  aria-label={t("publicProfile.copyLink")}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                {isPublic && (
                  <a
                    href={`/u/${normalizeSlug(slug)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-ios-blue hover:bg-ios-blue/10 transition-colors flex-shrink-0"
                    aria-label={t("publicProfile.view")}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
          </GlassCard>

          {/* What to show */}
          <div>
            <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
              {t("publicProfile.whatToShow")}
            </p>
            <GlassCard padding="none" className="overflow-hidden divide-y divide-border/50">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-body text-foreground">
                  {t("publicProfile.showBio")}
                </span>
                <Toggle checked={showBio} onChange={setShowBio} />
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-body text-foreground">
                  {t("publicProfile.showMembers")}
                </span>
                <Toggle checked={showMembers} onChange={setShowMembers} />
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <span className="text-body text-foreground">
                    {t("publicProfile.showFront")}
                  </span>
                  {showFront && !showMembers && (
                    <p className="text-caption-1 text-amber-500 mt-0.5">
                      {t("publicProfile.frontNeedsMembers")}
                    </p>
                  )}
                </div>
                <Toggle checked={showFront} onChange={setShowFront} />
              </div>
            </GlassCard>
          </div>

          {/* Member picker */}
          {showMembers && (
            <div>
              <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                {t("publicProfile.selectMembers")}
              </p>
              <GlassCard padding="none" className="overflow-hidden">
                {members.length === 0 ? (
                  <p className="px-4 py-4 text-subheadline text-muted-foreground text-center">
                    {t("members.noMembers")}
                  </p>
                ) : (
                  members.map((m) => {
                    const checked = publicMemberIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/40 transition-colors text-left"
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: m.color ?? "#8E8E93" }}
                        />
                        <span className="flex-1 text-body text-foreground truncate">
                          {m.name}
                        </span>
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors",
                            checked
                              ? "bg-ios-blue border-ios-blue text-white"
                              : "border-border"
                          )}
                        >
                          {checked && <Check size={14} strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })
                )}
              </GlassCard>
              <p className="text-caption-1 text-muted-foreground mt-2 px-1">
                {t("publicProfile.selectMembersHelp")}
              </p>
            </div>
          )}

          {error && (
            <p className="text-subheadline text-ios-red text-center">{error}</p>
          )}
          {savedOk && (
            <p className="text-subheadline text-ios-green text-center">
              {t("publicProfile.saved")}
            </p>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
