"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";
import { AvatarUpload } from "@/components/members/AvatarUpload";
import { MemberColorPicker } from "@/components/members/MemberColorPicker";
import {
  CustomFieldInputs,
  type MemberCustomField,
} from "@/components/members/CustomFieldInputs";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { revalidateMembersAndFront } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

interface MemberEditorProps {
  memberId?: string;
}

type Member = {
  id: string;
  name: string;
  pronouns: string | null;
  avatarUrl: string | null;
  description: string | null;
  color: string | null;
  role: string | null;
  tags: string[];
  notes: string | null;
  status?: string;
  groupIds?: string[];
};

type Group = { id: string; name: string; color: string | null };

const DEFAULT_COLOR = "#8B5CF6";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-ios-green/15 text-ios-green",
  dormant: "bg-amber-400/15 text-amber-500",
  unknown: "bg-muted text-muted-foreground",
};

export function MemberEditor({ memberId }: MemberEditorProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const isNew = !memberId;

  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"active" | "dormant" | "unknown">("active");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  const [customFields, setCustomFields] = useState<MemberCustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [memberRes, fieldsRes, groupsRes] = await Promise.all([
          memberId
            ? fetch(`/api/members/${memberId}`, { credentials: "same-origin" })
            : Promise.resolve(null),
          fetch("/api/custom-fields", { credentials: "same-origin" }),
          fetch("/api/groups", { credentials: "same-origin" }),
        ]);

        if (memberRes) {
          const memberJson = await memberRes.json();
          if (memberJson.success && !cancelled) {
            const m = memberJson.data as Member & {
              customFieldValues?: Record<string, string>;
            };
            setName(m.name);
            setPronouns(m.pronouns ?? "");
            setDescription(m.description ?? "");
            setRole(m.role ?? "");
            setColor(m.color ?? DEFAULT_COLOR);
            setTags(m.tags ?? []);
            setAvatarUrl(m.avatarUrl ?? null);
            setCustomValues(m.customFieldValues ?? {});
            setStatus((m.status as "active" | "dormant" | "unknown") ?? "active");
            setGroupIds(m.groupIds ?? []);
          }
        }

        const fieldsJson = await fieldsRes.json();
        if (fieldsJson.success && !cancelled) {
          setCustomFields(fieldsJson.data?.fields ?? []);
        }

        const groupsJson = await groupsRes.json();
        if (groupsJson.success && !cancelled) {
          setAvailableGroups(groupsJson.data ?? []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  function addTag() {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags([...tags, trimmed]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function toggleGroup(id: string) {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError(t("members.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        pronouns: pronouns.trim() || null,
        description: description.trim() || null,
        role: role.trim() || null,
        color,
        tags,
        avatarUrl: avatarUrl || null,
        customFieldValues: customValues,
        status,
      };
      const res = await fetch(
        isNew ? "/api/members" : `/api/members/${memberId}`,
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

      const savedId = isNew ? (json.data as { id: string }).id : memberId!;
      await fetch(`/api/members/${savedId}/groups`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds }),
      });

      revalidateMembersAndFront();
      router.push(isNew ? "/members" : `/members/${memberId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!memberId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? t("common.error"));
        setDeleting(false);
        return;
      }
      revalidateMembersAndFront();
      router.push("/members");
      router.refresh();
    } catch {
      setDeleting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="px-4 pt-14 pb-6">
        <div className="h-8 w-40 rounded bg-muted animate-pulse mb-4" />
        <div className="h-72 rounded-ios-lg bg-muted animate-pulse" />
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    active: t("members.statusActive"),
    dormant: t("members.statusDormant"),
    unknown: t("members.statusUnknown"),
  };

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
            {isNew ? t("members.new") : t("common.edit")}
          </h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="text-body font-semibold text-ios-blue ios-press disabled:opacity-40"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4 px-4 pt-4">
        <GlassCard padding="lg" className="flex flex-col gap-5">
          <AvatarUpload
            currentUrl={avatarUrl}
            memberColor={color}
            memberName={name || "?"}
            onUpload={(url) => setAvatarUrl(url || null)}
          />

          <div>
            <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {t("members.color")}
            </p>
            <MemberColorPicker value={color} onChange={setColor} />
          </div>
        </GlassCard>

        <GlassCard padding="lg" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("members.name")} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pronouns">{t("members.pronouns")}</Label>
            <Input
              id="pronouns"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder={t("members.pronounsPlaceholder")}
              maxLength={60}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">{t("members.role")}</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t("members.rolePlaceholder")}
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("members.status")}</Label>
            <div className="grid grid-cols-3 rounded-ios-sm overflow-hidden border border-border/60">
              {(["active", "dormant", "unknown"] as const).map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "py-2 text-subheadline font-medium transition-colors",
                    i > 0 && "border-l border-border/60",
                    status === s
                      ? STATUS_COLORS[s]
                      : "bg-[var(--ios-bg-secondary)] text-muted-foreground"
                  )}
                >
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">{t("members.description")}</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              className="min-h-[112px] px-4 py-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body resize-y focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags">{t("members.tags")}</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={t("members.tagPlaceholder")}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addTag}
                disabled={!tagInput.trim()}
              >
                {t("members.addTag")}
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-caption-1 font-semibold ios-press"
                  >
                    {tag}
                    <span className="text-muted-foreground">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {availableGroups.length > 0 && (
          <GlassCard padding="lg" className="flex flex-col gap-3">
            <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">
              {t("members.groups")}
            </p>
            <div className="flex flex-wrap gap-2">
              {availableGroups.map((group) => {
                const selected = groupIds.includes(group.id);
                const c = group.color ?? "#8B5CF6";
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-subheadline font-medium border transition-all",
                      selected ? "opacity-100" : "opacity-50 hover:opacity-75"
                    )}
                    style={
                      selected
                        ? {
                            background: `${c}22`,
                            color: c,
                            borderColor: `${c}66`,
                          }
                        : {
                            borderColor: "transparent",
                            background: "var(--secondary)",
                          }
                    }
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>
          </GlassCard>
        )}

        {customFields.length > 0 && (
          <GlassCard padding="lg">
            <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t("members.customFields")}
            </p>
            <CustomFieldInputs
              fields={customFields}
              values={customValues}
              onChange={(id, v) =>
                setCustomValues((prev) => ({ ...prev, [id]: v }))
              }
            />
          </GlassCard>
        )}

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
            {t("members.delete")}
          </Button>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={saving || !name.trim()}
        >
          <Save size={16} />
          {saving
            ? t("common.saving")
            : isNew
            ? t("members.createMember")
            : t("members.saveChanges")}
        </Button>
      </form>

      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("members.confirmDeleteTitle")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-foreground">
            {t("members.confirmDeleteDesc", { name })}
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
