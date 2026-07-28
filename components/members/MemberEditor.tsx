"use client";

import { useEffect, useState } from "react";
import { useLocalizedRouter } from "@/components/navigation/useLocalizedRouter";
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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { revalidateMembersAndFront } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";

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
};

const DEFAULT_COLOR = "#8B5CF6";

export function MemberEditor({ memberId }: MemberEditorProps) {
  const router = useLocalizedRouter();
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

  const [customFields, setCustomFields] = useState<MemberCustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (memberId) {
          const memberRes = await fetch(`/api/members/${memberId}`, {
            credentials: "same-origin",
          });
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
          }
        }

        const fieldsRes = await fetch("/api/custom-fields", {
          credentials: "same-origin",
        });
        const fieldsJson = await fieldsRes.json();
        if (fieldsJson.success && !cancelled) {
          setCustomFields(fieldsJson.data?.fields ?? []);
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
          {saving ? t("common.saving") : isNew ? t("members.createMember") : t("members.saveChanges")}
        </Button>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t("members.confirmDeleteTitle")}
        description={t("members.confirmDeleteDesc", { name })}
        loading={deleting}
      />
    </div>
  );
}
