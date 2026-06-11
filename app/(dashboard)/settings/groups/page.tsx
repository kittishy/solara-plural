"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

type Group = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  memberCount: number;
};

const PRESET_COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8E8E93",
];

const GROUPS_SWR_KEY = "/api/groups";

export default function GroupsSettingsPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useSWR<Group[]>(GROUPS_SWR_KEY, apiFetcher, {
    revalidateOnFocus: false,
  });
  const groups = data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openNew() {
    setEditingGroup(null);
    setName("");
    setColor(PRESET_COLORS[0]);
    setDescription("");
    setError("");
    setShowForm(true);
  }

  function openEdit(group: Group) {
    setEditingGroup(group);
    setName(group.name);
    setColor(group.color ?? PRESET_COLORS[0]);
    setDescription(group.description ?? "");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingGroup(null);
    setError("");
  }

  async function saveGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const url = editingGroup ? `/api/groups/${editingGroup.id}` : "/api/groups";
      const method = editingGroup ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color: color || null,
          description: description.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? t("common.saveError"));
        return;
      }
      void mutate(GROUPS_SWR_KEY);
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${confirmDelete.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        void mutate(GROUPS_SWR_KEY);
        setConfirmDelete(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-11">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("settings.title")}</span>
          </Link>
          <h1 className="text-headline font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
            {t("groups.title")}
          </h1>
          <button
            type="button"
            onClick={openNew}
            className="text-body font-semibold text-ios-blue ios-press"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {isLoading ? (
          <GlassCard padding="none" className="overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-4 border-b border-border/50 last:border-0 flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </GlassCard>
        ) : groups.length === 0 ? (
          <GlassCard padding="lg" className="text-center">
            <p className="text-subheadline text-muted-foreground mb-3">
              {t("groups.noGroups")}
            </p>
            <Button onClick={openNew} variant="outline" size="sm">
              <Plus size={16} />
              {t("groups.new")}
            </Button>
          </GlassCard>
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            {groups.map((group) => {
              const c = group.color ?? "#8E8E93";
              return (
                <div
                  key={group.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                >
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0"
                    style={{ background: `${c}33` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate"
                      style={{ color: c }}>
                      {group.name}
                    </p>
                    <p className="text-caption-1 text-muted-foreground">
                      {group.memberCount} {t("groups.members")}
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(group)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-ios-blue hover:bg-ios-blue/10 transition-colors"
                    aria-label={t("groups.edit")}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(group)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-ios-red hover:bg-ios-red/10 transition-colors"
                    aria-label={t("groups.delete")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </GlassCard>
        )}
      </div>

      {/* Create / Edit sheet */}
      <BottomSheet
        open={showForm}
        onClose={closeForm}
        title={editingGroup ? t("groups.edit") : t("groups.new")}
      >
        <form onSubmit={(e) => void saveGroup(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-name">{t("groups.name")}</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("groups.namePlaceholder")}
              maxLength={60}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("groups.color")}</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    color === c
                      ? "ring-2 ring-offset-2 ring-current scale-110"
                      : "opacity-70 hover:opacity-100"
                  )}
                  style={{ background: c, color: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-description">{t("groups.description")}</Label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("groups.descriptionPlaceholder")}
              rows={3}
              maxLength={500}
              className="px-4 py-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body resize-none focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>

          {error && (
            <p className="text-subheadline text-ios-red text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeForm}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1"
              style={color ? { background: color, color: "#fff" } : {}}
            >
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Delete confirm sheet */}
      <BottomSheet
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={t("groups.confirmDeleteTitle")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-foreground">
            {t("groups.confirmDeleteDesc")}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              onClick={() => void deleteGroup()}
              disabled={deleting}
              className="w-full"
            >
              {deleting ? t("common.deleting") : t("common.yes")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
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
