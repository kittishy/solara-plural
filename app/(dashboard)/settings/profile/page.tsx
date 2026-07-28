"use client";

import { useEffect, useState } from "react";
import { useLocalizedRouter } from "@/components/navigation/useLocalizedRouter";
import { ArrowLeft, Save } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { prepareAvatarDataUrl } from "@/lib/client/avatar-upload";
import { useLanguage } from "@/components/providers/LanguageProvider";

const EMOJI_OPTIONS = ["☀️", "🌙", "⭐", "✨", "🌸", "🌈", "🦋", "🌊", "🔥", "💎", "🌷", "🍃"];

export default function ProfileSettingsPage() {
  const router = useLocalizedRouter();
  const { t } = useLanguage();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarMode, setAvatarMode] = useState<"emoji" | "url">("emoji");
  const [avatarEmoji, setAvatarEmoji] = useState("☀️");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/account/profile", {
        credentials: "same-origin",
      });
      const json = await res.json();
      if (json.success && !cancelled) {
        setName(json.data.name);
        setDescription(json.data.description ?? "");
        setAvatarMode(json.data.avatarMode === "url" ? "url" : "emoji");
        setAvatarEmoji(json.data.avatarEmoji ?? "☀️");
        setAvatarUrl(json.data.avatarUrl);
      }
      if (!cancelled) setLoaded(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("members.nameRequired"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          avatarMode,
          avatarEmoji,
          avatarUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? t("common.saveError"));
        return;
      }
      router.push("/settings");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(file: File) {
    setError("");
    try {
      const dataUrl = await prepareAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
      setAvatarMode("url");
    } catch {
      setError(t("settings.imageError"));
    }
  }

  if (!loaded) {
    return (
      <div className="px-4 pt-14">
        <div className="h-8 w-40 rounded bg-muted animate-pulse mb-4" />
        <div className="h-48 rounded-ios-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40 pt-[var(--safe-top)]">
        <div className="flex items-center justify-between px-4 h-11">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("settings.title")}</span>
          </button>
          <h1 className="text-headline font-semibold absolute left-1/2 -translate-x-1/2">
            {t("settings.profile")}
          </h1>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="text-body font-semibold text-ios-blue ios-press disabled:opacity-40"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4 px-4 pt-4">
        <GlassCard padding="lg" className="flex flex-col gap-4 items-center">
          {avatarMode === "url" && avatarUrl ? (
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-ios-md">
              <DynamicAvatarImage
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-5xl shadow-ios-md">
              {avatarEmoji}
            </div>
          )}

          <div className="flex gap-1 rounded-ios-sm bg-secondary p-0.5">
            <button
              type="button"
              onClick={() => setAvatarMode("emoji")}
              className={cn(
                "px-3 py-1 text-caption-1 font-semibold rounded-ios-xs ios-transition",
                avatarMode === "emoji"
                  ? "bg-white dark:bg-ios-gray-3/30 text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Emoji
            </button>
            <button
              type="button"
              onClick={() => setAvatarMode("url")}
              className={cn(
                "px-3 py-1 text-caption-1 font-semibold rounded-ios-xs ios-transition",
                avatarMode === "url"
                  ? "bg-white dark:bg-ios-gray-3/30 text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {t("settings.imageMode")}
            </button>
          </div>

          {avatarMode === "emoji" ? (
            <div className="grid grid-cols-6 gap-2 w-full">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatarEmoji(e)}
                  className={cn(
                    "aspect-square rounded-ios-sm text-2xl flex items-center justify-center ios-press",
                    avatarEmoji === e
                      ? "bg-ios-blue/15 ring-2 ring-ios-blue"
                      : "bg-secondary"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          ) : (
            <div className="w-full">
              <input
                type="file"
                accept="image/*"
                id="avatar-file"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              <label
                htmlFor="avatar-file"
                className="block w-full py-3 text-center rounded-ios-sm bg-ios-blue text-white text-subheadline font-semibold cursor-pointer ios-press"
              >
                {t("settings.chooseImage")}
              </label>
            </div>
          )}
        </GlassCard>

        <GlassCard padding="lg" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("settings.systemNameLabel")} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">{t("members.description")}</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={600}
              className="min-h-[112px] px-4 py-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body resize-y focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>
        </GlassCard>

        {error && (
          <p className="text-subheadline text-ios-red text-center">{error}</p>
        )}

        <Button type="submit" disabled={saving || !name.trim()} className="w-full">
          <Save size={16} />
          {saving ? t("common.saving") : t("settings.saveProfile")}
        </Button>
      </form>
    </div>
  );
}
