"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { ArrowLeft, Clock, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { RolePicker } from "@/components/front/RolePicker";
import { FrontStats } from "@/components/front/FrontStats";
import { apiFetcher, swrKeys } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TIER_CONFIG, type FrontTier } from "@/lib/front";

type Member = {
  id: string;
  name: string;
  color?: string | null;
};

type FrontEntry = {
  id: string;
  memberIds: string[];
  memberTiers?: Record<string, FrontTier>;
  startedAt: string | number | Date;
  endedAt?: string | number | Date | null;
  note?: string | null;
};

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function FrontHistoryPage() {
  const { t, language } = useLanguage();

  function formatDateTime(value: string | number | Date) {
    return new Date(value).toLocaleString(language, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDuration(start: Date, end: Date) {
    const ms = end.getTime() - start.getTime();
    const min = Math.floor(ms / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const { data: history, isLoading } = useSWR<FrontEntry[]>(
    swrKeys.frontHistory,
    apiFetcher
  );
  const { data: membersData } = useSWR<{ data: Member[] }>("/api/members?limit=500", apiFetcher);
  const members = membersData?.data ?? [];

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));
  const entries = history ?? [];

  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editEntry, setEditEntry] = useState<FrontEntry | null>(null);
  const [formMemberIds, setFormMemberIds] = useState<string[]>([]);
  const [formMemberTiers, setFormMemberTiers] = useState<Record<string, FrontTier>>({});
  const [formStartedAt, setFormStartedAt] = useState(nowLocal());
  const [formEndedAt, setFormEndedAt] = useState(nowLocal());
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  // Which member's role picker is open within the entry form (null = closed).
  const [rolePickerFor, setRolePickerFor] = useState<string | null>(null);

  function openNewForm() {
    setEditEntry(null);
    setFormMemberIds([]);
    setFormMemberTiers({});
    setFormStartedAt(nowLocal());
    setFormEndedAt(nowLocal());
    setFormNote("");
    setFormError("");
    setShowEntryForm(true);
  }

  function openEditForm(entry: FrontEntry) {
    setEditEntry(entry);
    setFormMemberIds(entry.memberIds);
    // Preserve existing roles only — roles are optional, no default assigned.
    const tiers = entry.memberTiers ?? {};
    const resolved: Record<string, FrontTier> = {};
    entry.memberIds.forEach((id) => {
      if (tiers[id]) resolved[id] = tiers[id] as FrontTier;
    });
    setFormMemberTiers(resolved);
    const started = new Date(entry.startedAt);
    started.setMinutes(started.getMinutes() - started.getTimezoneOffset());
    setFormStartedAt(started.toISOString().slice(0, 16));
    if (entry.endedAt) {
      const ended = new Date(entry.endedAt);
      ended.setMinutes(ended.getMinutes() - ended.getTimezoneOffset());
      setFormEndedAt(ended.toISOString().slice(0, 16));
    } else {
      setFormEndedAt(nowLocal());
    }
    setFormNote(entry.note ?? "");
    setFormError("");
    setShowEntryForm(true);
  }

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (formMemberIds.length === 0) {
      setFormError(t("front.noMemberSelected"));
      return;
    }
    if (new Date(formEndedAt) < new Date(formStartedAt)) {
      setFormError(t("front.endBeforeStart"));
      return;
    }
    setSaving(true);
    try {
      const body = {
        memberIds: formMemberIds,
        memberTiers: formMemberTiers,
        startedAt: formStartedAt,
        endedAt: formEndedAt,
        note: formNote.trim() || undefined,
      };
      const url = editEntry
        ? `/api/front/history/${editEntry.id}`
        : "/api/front/history";
      const method = editEntry ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        setFormError(json.error ?? t("front.saveError"));
        return;
      }
      setShowEntryForm(false);
      void mutate(swrKeys.frontHistory);
    } finally {
      setSaving(false);
    }
  }

  function toggleMemberInForm(id: string) {
    setFormMemberIds((prev) => {
      if (prev.includes(id)) {
        // Remove — also clean up tier
        setFormMemberTiers((t) => {
          const { [id]: _, ...rest } = t;
          return rest;
        });
        return prev.filter((x) => x !== id);
      }
      // Add — no role assigned by default (roles are opt-in)
      return [...prev, id];
    });
  }

  function setFormRole(memberId: string, tier: FrontTier | null) {
    setFormMemberTiers((prev) => {
      const next = { ...prev };
      if (tier === null) {
        delete next[memberId];
      } else {
        next[memberId] = tier;
      }
      return next;
    });
  }

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40 pt-[var(--safe-top)]">
        <div className="flex items-center justify-between px-4 h-11">
          <Link
            href="/front"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("front.title")}</span>
          </Link>
          <h1 className="text-headline font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
            {t("front.history")}
          </h1>
          <button
            type="button"
            onClick={openNewForm}
            className="text-ios-blue ios-press"
            aria-label={t("front.addEntry")}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {!isLoading && entries.length > 0 && (
        <div className="px-4 pt-4">
          <FrontStats entries={entries} members={members} />
        </div>
      )}

      <div className="px-4 pt-4">
        <GlassCard padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-4 h-4 mt-1" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={t("front.noHistory")}
              description={t("front.historyEmptyDesc")}
              tint="var(--ios-blue)"
              action={
                <Button variant="outline" size="sm" onClick={openNewForm}>
                  <Plus size={16} />
                  {t("front.addEntry")}
                </Button>
              }
            />
          ) : (
            entries.map((entry) => {
              const entryMembers = entry.memberIds
                .map((id) => memberById.get(id))
                .filter(Boolean) as Member[];
              const duration =
                entry.endedAt &&
                formatDuration(new Date(entry.startedAt), new Date(entry.endedAt));
              return (
                <div
                  key={entry.id}
                  className="group flex items-start gap-3 px-4 py-3.5 border-b border-border/50 last:border-0"
                >
                  <Clock size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {entryMembers.map((m) => {
                        const tier = entry.memberTiers?.[m.id];
                        return (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-1 font-semibold"
                            style={{
                              background: m.color ? `${m.color}22` : "#8E8E9322",
                              color: m.color ?? "#8E8E93",
                            }}
                          >
                            {tier && (
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full"
                                style={{ background: TIER_CONFIG[tier].color }}
                              />
                            )}
                            {m.name}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-caption-1 text-muted-foreground">
                      {formatDateTime(entry.startedAt)}
                      {entry.endedAt && ` → ${formatDateTime(entry.endedAt)}`}
                      {duration && ` · ${duration}`}
                    </p>
                    {entry.note && (
                      <p className="text-subheadline text-foreground mt-1">
                        {entry.note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => openEditForm(entry)}
                      className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center ios-press opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label={t("members.edit")}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>

      <BottomSheet
        open={showEntryForm}
        onClose={() => setShowEntryForm(false)}
        title={editEntry ? t("front.editEntry") : t("front.addEntry")}
      >
        <form onSubmit={saveEntry} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("front.members")}</Label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 rounded-ios-md bg-secondary">
              {(members ?? []).map((m) => {
                const selected = formMemberIds.includes(m.id);
                const tier = formMemberTiers[m.id];
                return (
                  <div key={m.id} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleMemberInForm(m.id)}
                      className={`px-3 py-1.5 rounded-full text-caption-1 font-semibold ios-transition ${
                        selected
                          ? "bg-ios-blue/20 text-ios-blue"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.name}
                    </button>
                    {selected && (
                      tier ? (
                        <button
                          type="button"
                          onClick={() => setRolePickerFor(m.id)}
                          className="text-caption-2 font-semibold px-1.5 py-0.5 rounded-full ios-press"
                          style={{
                            background: `${TIER_CONFIG[tier].color}22`,
                            color: TIER_CONFIG[tier].color,
                          }}
                          title={t("front.chooseRole")}
                        >
                          {t(TIER_CONFIG[tier].labelKey as Parameters<typeof t>[0])}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRolePickerFor(m.id)}
                          className="text-caption-2 font-semibold px-2 py-0.5 rounded-full ios-press bg-muted text-muted-foreground"
                          title={t("front.chooseRole")}
                        >
                          {t("front.setRole")}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fe-start">{t("front.startTime")}</Label>
            <Input
              id="fe-start"
              type="datetime-local"
              value={formStartedAt}
              onChange={(e) => setFormStartedAt(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fe-end">{t("front.endTime")}</Label>
            <Input
              id="fe-end"
              type="datetime-local"
              value={formEndedAt}
              onChange={(e) => setFormEndedAt(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fe-note">{t("front.note")}</Label>
            <Input
              id="fe-note"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder={t("front.notePlaceholder")}
              maxLength={500}
            />
          </div>

          {formError && (
            <p className="text-subheadline text-ios-red text-center">{formError}</p>
          )}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? t("common.saving") : editEntry ? t("common.save") : t("front.addEntry")}
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setShowEntryForm(false)}
            className="w-full"
          >
            {t("common.cancel")}
          </Button>
        </form>
      </BottomSheet>

      {/* Role picker modal for the entry form */}
      <RolePicker
        open={rolePickerFor !== null}
        onClose={() => setRolePickerFor(null)}
        memberName={rolePickerFor ? memberById.get(rolePickerFor)?.name : undefined}
        value={rolePickerFor ? formMemberTiers[rolePickerFor] ?? null : null}
        onSelect={(tier) => {
          if (rolePickerFor) setFormRole(rolePickerFor, tier);
        }}
      />
    </div>
  );
}
