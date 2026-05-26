"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { revalidateJournal } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

interface JournalEditorProps {
  entryId?: string;
}

export function JournalEditor({ entryId }: JournalEditorProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const isNew = !entryId;
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | null>(null);

  const MOODS = [
    { value: "great", emoji: "😄", label: t("journal.moodGreat") },
    { value: "good", emoji: "🙂", label: t("journal.moodGood") },
    { value: "okay", emoji: "😐", label: t("journal.moodOkay") },
    { value: "bad", emoji: "😕", label: t("journal.moodBad") },
    { value: "terrible", emoji: "😞", label: t("journal.moodTerrible") },
  ];

  useEffect(() => {
    if (!entryId) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/journal/${entryId}`, {
          credentials: "same-origin",
        });
        const json = await res.json();
        if (json.success && !cancelled) {
          setTitle(json.data.title ?? "");
          setContent(json.data.content ?? "");
          setMood(json.data.mood ?? null);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError(t("notes.emptyContent"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      const body = {
        title: title.trim() || null,
        content: content.trim(),
        mood,
      };
      const res = await fetch(
        isNew ? "/api/journal" : `/api/journal/${entryId}`,
        {
          method: isNew ? "POST" : "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? t("common.saveError"));
        return;
      }
      revalidateJournal();
      router.push("/journal");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entryId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/journal/${entryId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        revalidateJournal();
        router.push("/journal");
        router.refresh();
      } else {
        setDeleting(false);
      }
    } catch {
      setDeleting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="px-4 pt-14">
        <div className="h-8 w-40 rounded bg-muted animate-pulse mb-4" />
        <div className="h-72 rounded-ios-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-11">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("common.back")}</span>
          </button>
          <h1 className="text-headline font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
            {isNew ? t("journal.new") : t("common.edit")}
          </h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="text-body font-semibold text-ios-blue ios-press disabled:opacity-40"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4 px-4 pt-4">
        <GlassCard padding="lg" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">{t("journal.title_label")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("common.optional")}
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("journal.mood")}</Label>
            <div className="flex gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(mood === m.value ? null : m.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2 rounded-ios-sm ios-transition ios-press",
                    mood === m.value
                      ? "bg-ios-blue/15 ring-2 ring-ios-blue"
                      : "bg-secondary"
                  )}
                  aria-label={m.label}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-caption-2 text-muted-foreground">
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="content">{t("journal.content")} *</Label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              required
              maxLength={20000}
              placeholder={t("journal.contentPlaceholder")}
              className="min-h-[240px] px-4 py-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body resize-y focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>
        </GlassCard>

        {error && (
          <p className="text-subheadline text-ios-red text-center">{error}</p>
        )}

        {!isNew && (
          <Button
            type="button"
            variant="outline"
            className="w-full text-ios-red border-ios-red/30 hover:bg-ios-red/5"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={16} />
            {t("journal.delete")}
          </Button>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={saving || !content.trim()}
        >
          <Save size={16} />
          {saving ? t("common.saving") : isNew ? t("journal.save") : t("journal.saveChanges")}
        </Button>
      </form>

      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("journal.confirmDeleteTitle")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-foreground">
            {t("common.irreversible")}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full"
            >
              {deleting ? t("common.deleting") : t("common.yes")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              className="w-full"
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
