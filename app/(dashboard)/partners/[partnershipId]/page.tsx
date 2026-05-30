"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { ArrowLeft, Heart, Calendar, MessageSquare, ListChecks, Plus, Trash2, CheckSquare, Square, Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/glass/BottomSheet";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { apiFetcher } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Partnership = {
  partnershipId: string;
  relationshipLabel?: string | null;
  partneredSince?: string | null;
  anniversaryDate?: string | null;
  howWeMet?: string | null;
  other: {
    id: string;
    name: string;
    description?: string | null;
    avatarMode?: string;
    avatarEmoji?: string;
    avatarUrl?: string | null;
  };
};

type Note = {
  id: string;
  authorSystemId: string;
  content: string;
  mood: string | null;
  createdAt: string;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  occurredOn: string;
  createdAt: string;
};

type BucketItem = {
  id: string;
  title: string;
  note: string | null;
  category: string | null;
  completedAt: string | null;
  createdAt: string;
};

const MOODS = ["😊", "🥰", "😌", "😐", "😔", "😤", "❤️", "🌟", "🌀", "💫"];

function DiarySheet({ partnershipId, onClose, t, language }: { partnershipId: string; onClose: () => void; t: (k: TranslationKey, v?: Record<string, string | number>) => string; language: string }) {
  const notesKey = `/api/partners/${partnershipId}/notes`;
  const { data: notes, isLoading } = useSWR<Note[]>(notesKey, apiFetcher);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await fetch(notesKey, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), mood: mood || undefined }),
      });
      setContent("");
      setMood("");
      void mutate(notesKey);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-ios-md" />)}
        </div>
      ) : !notes || notes.length === 0 ? (
        <p className="text-center text-subheadline text-muted-foreground py-4">{t("partners.diaryEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div key={note.id} className="bg-secondary rounded-ios-md px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                {note.mood && <span className="text-lg">{note.mood}</span>}
                <span className="text-caption-1 text-muted-foreground">
                  {new Date(note.createdAt).toLocaleDateString(language, { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="text-body text-foreground whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addNote} className="flex flex-col gap-3 pt-2 border-t border-border/40">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder={t("partners.noteContentPlaceholder")}
          className="w-full px-3 py-2.5 rounded-ios-md bg-secondary text-body resize-none focus:outline-none focus:ring-2 focus:ring-ios-pink/50"
        />
        <div>
          <p className="text-caption-1 text-muted-foreground mb-1.5">{t("partners.moodLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(mood === m ? "" : m)}
                className={cn(
                  "w-9 h-9 rounded-full text-lg flex items-center justify-center ios-press",
                  mood === m ? "bg-ios-pink/20 ring-2 ring-ios-pink" : "bg-secondary"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={saving || !content.trim()} className="w-full">
          <Plus size={16} />
          {saving ? t("common.saving") : t("partners.addNote")}
        </Button>
      </form>
    </div>
  );
}

function MilestonesSheet({ partnershipId, onClose, t, language }: { partnershipId: string; onClose: () => void; t: (k: TranslationKey, v?: Record<string, string | number>) => string; language: string }) {
  const milestonesKey = `/api/partners/${partnershipId}/milestones`;
  const { data: milestones, isLoading } = useSWR<Milestone[]>(milestonesKey, apiFetcher);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" });
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      await fetch(milestonesKey, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), occurredOn: date, description: description.trim() || undefined }),
      });
      setTitle("");
      setDate("");
      setDescription("");
      void mutate(milestonesKey);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-ios-md" />)}
        </div>
      ) : !milestones || milestones.length === 0 ? (
        <p className="text-center text-subheadline text-muted-foreground py-4">{t("partners.milestonesEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {milestones.map((ms) => (
            <div key={ms.id} className="bg-secondary rounded-ios-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-ios-pink flex-shrink-0" />
                <span className="text-body font-semibold text-foreground flex-1">{ms.title}</span>
                <span className="text-caption-1 text-muted-foreground">{formatDate(ms.occurredOn)}</span>
              </div>
              {ms.description && (
                <p className="text-subheadline text-muted-foreground mt-1 pl-5">{ms.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addMilestone} className="flex flex-col gap-3 pt-2 border-t border-border/40">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("partners.milestoneNameLabel")}
          className="w-full px-3 py-2.5 rounded-ios-md bg-secondary text-body focus:outline-none focus:ring-2 focus:ring-ios-pink/50"
        />
        <div className="flex flex-col gap-1">
          <label className="text-caption-1 text-muted-foreground">{t("partners.milestoneDateLabel")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-ios-md bg-secondary text-body focus:outline-none focus:ring-2 focus:ring-ios-pink/50"
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={t("partners.milestoneDescLabel")}
          className="w-full px-3 py-2.5 rounded-ios-md bg-secondary text-body resize-none focus:outline-none focus:ring-2 focus:ring-ios-pink/50"
        />
        <Button type="submit" disabled={saving || !title.trim() || !date} className="w-full">
          <Plus size={16} />
          {saving ? t("common.saving") : t("partners.addMilestone")}
        </Button>
      </form>
    </div>
  );
}

function BucketSheet({ partnershipId, onClose, t }: { partnershipId: string; onClose: () => void; t: (k: TranslationKey, v?: Record<string, string | number>) => string }) {
  const bucketKey = `/api/partners/${partnershipId}/bucket`;
  const { data: items, isLoading } = useSWR<BucketItem[]>(bucketKey, apiFetcher);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await fetch(bucketKey, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setNewTitle("");
      void mutate(bucketKey);
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(item: BucketItem) {
    setTogglingId(item.id);
    try {
      await fetch(`${bucketKey}/${item.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !item.completedAt }),
      });
      void mutate(bucketKey);
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteItem(item: BucketItem) {
    setDeletingId(item.id);
    try {
      await fetch(`${bucketKey}/${item.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      void mutate(bucketKey);
    } finally {
      setDeletingId(null);
    }
  }

  const pending = (items ?? []).filter((i) => !i.completedAt);
  const done = (items ?? []).filter((i) => !!i.completedAt);

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-11 rounded-ios-md" />)}
        </div>
      ) : !items || items.length === 0 ? (
        <p className="text-center text-subheadline text-muted-foreground py-4">{t("partners.bucketEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {pending.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-ios-md bg-secondary">
              <button
                type="button"
                onClick={() => toggleItem(item)}
                disabled={togglingId === item.id}
                className="text-muted-foreground ios-press flex-shrink-0"
                aria-label={t("partners.markDone")}
              >
                <Square size={20} />
              </button>
              <span className="flex-1 text-body text-foreground">{item.title}</span>
              <button
                type="button"
                onClick={() => deleteItem(item)}
                disabled={deletingId === item.id}
                className="text-muted-foreground/60 hover:text-ios-red ios-press flex-shrink-0"
                aria-label={t("common.delete")}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {done.length > 0 && (
            <>
              <div className="mt-2 mb-1 px-1">
                <p className="text-caption-1 text-muted-foreground font-semibold uppercase tracking-wide">
                  {t("partners.bucketDoneCount", { count: done.length })}
                </p>
              </div>
              {done.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-ios-md bg-secondary opacity-60">
                  <button
                    type="button"
                    onClick={() => toggleItem(item)}
                    disabled={togglingId === item.id}
                    className="text-ios-green ios-press flex-shrink-0"
                    aria-label={t("partners.markUndone")}
                  >
                    <CheckSquare size={20} />
                  </button>
                  <span className="flex-1 text-body text-muted-foreground line-through">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => deleteItem(item)}
                    disabled={deletingId === item.id}
                    className="text-muted-foreground/40 hover:text-ios-red ios-press flex-shrink-0"
                    aria-label={t("common.delete")}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <form onSubmit={addItem} className="flex gap-2 pt-2 border-t border-border/40">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={t("partners.bucketItemPlaceholder")}
          className="flex-1 px-3 py-2.5 rounded-ios-md bg-secondary text-body focus:outline-none focus:ring-2 focus:ring-ios-pink/50"
        />
        <Button type="submit" disabled={saving || !newTitle.trim()} size="icon" className="flex-shrink-0">
          <Plus size={18} />
        </Button>
      </form>
    </div>
  );
}

export default function PartnershipDetailPage({
  params,
}: {
  params: { partnershipId: string };
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { data, isLoading } = useSWR<Partnership>(
    `/api/partners/${params.partnershipId}`,
    apiFetcher
  );

  const [sheet, setSheet] = useState<"diary" | "milestones" | "bucket" | null>(null);

  function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" });
  }

  if (isLoading) {
    return (
      <div className="px-4 pt-14">
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-32 rounded-ios-lg mb-4" />
        <Skeleton className="h-48 rounded-ios-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 pt-14 text-center">
        <p className="text-body text-muted-foreground">{t("partners.noPartners")}</p>
        <Link href="/partners" className="inline-block mt-4 text-ios-blue ios-press">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const { other } = data;

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40 pt-[var(--safe-top)]">
        <div className="flex items-center px-4 h-11">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("partners.title")}</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="pt-8 pb-5 px-4 flex flex-col items-center gap-3 bg-gradient-to-b from-ios-pink/10 to-transparent">
        {other.avatarMode === "url" && other.avatarUrl ? (
          <div className="w-28 h-28 rounded-full overflow-hidden shadow-ios-md border-2 border-ios-pink/30">
            <DynamicAvatarImage
              src={other.avatarUrl}
              alt={other.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-28 h-28 rounded-full bg-secondary flex items-center justify-center text-5xl shadow-ios-md">
            {other.avatarEmoji || "☀️"}
          </div>
        )}
        <div className="text-center">
          <h1 className="text-title-1 text-foreground">{other.name}</h1>
          {data.relationshipLabel && (
            <p className="text-subheadline text-ios-pink mt-1 font-semibold">
              <Heart size={14} className="inline mr-1" />
              {data.relationshipLabel}
            </p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="px-4 mb-5">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("partners.details")}
        </p>
        <GroupedSection>
          <GroupedRow
            label={t("partners.since")}
            value={formatDate(data.partneredSince)}
            icon={<Calendar size={18} />}
          />
          {data.anniversaryDate && (
            <GroupedRow
              label={t("partners.anniversary")}
              value={formatDate(data.anniversaryDate)}
              icon={<Heart size={18} />}
            />
          )}
          {data.howWeMet && (
            <div className="px-4 py-3">
              <p className="text-caption-1 text-muted-foreground mb-1">
                {t("partners.howWeMet")}
              </p>
              <p className="text-body text-foreground">{data.howWeMet}</p>
            </div>
          )}
        </GroupedSection>
      </div>

      {/* Shared features */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("partners.shared")}
        </p>
        <GroupedSection>
          <GroupedRow
            label={t("partners.sharedDiary")}
            icon={<MessageSquare size={18} />}
            chevron
            className="cursor-pointer"
            onClick={() => setSheet("diary")}
          />
          <GroupedRow
            label={t("partners.milestones")}
            icon={<Flag size={18} />}
            chevron
            className="cursor-pointer"
            onClick={() => setSheet("milestones")}
          />
          <GroupedRow
            label={t("partners.bucketList")}
            icon={<ListChecks size={18} />}
            chevron
            className="cursor-pointer"
            onClick={() => setSheet("bucket")}
          />
        </GroupedSection>
      </div>

      <div className="px-4">
        <Link
          href={`/systems/${other.id}`}
          className="block w-full text-center py-3 rounded-ios-md bg-secondary ios-press text-body font-semibold text-foreground"
        >
          {t("partners.viewProfile")}
        </Link>
      </div>

      <BottomSheet
        open={sheet === "diary"}
        onClose={() => setSheet(null)}
        title={t("partners.sharedDiary")}
      >
        <DiarySheet
          partnershipId={params.partnershipId}
          onClose={() => setSheet(null)}
          t={t}
          language={language}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "milestones"}
        onClose={() => setSheet(null)}
        title={t("partners.milestones")}
      >
        <MilestonesSheet
          partnershipId={params.partnershipId}
          onClose={() => setSheet(null)}
          t={t}
          language={language}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "bucket"}
        onClose={() => setSheet(null)}
        title={t("partners.bucketList")}
      >
        <BucketSheet
          partnershipId={params.partnershipId}
          onClose={() => setSheet(null)}
          t={t}
        />
      </BottomSheet>
    </div>
  );
}
