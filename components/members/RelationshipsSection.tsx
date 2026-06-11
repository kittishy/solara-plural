"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Rel = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  relationshipType: string;
  notes: string | null;
};

type Member = { id: string; name: string; color: string | null };

interface RelationshipsSectionProps {
  memberId: string;
  initialRelationships: Rel[];
  allMembers: Member[];
}

const SUGGESTIONS = [
  "protects",
  "introject of",
  "little of",
  "co-fronts with",
  "parented by",
  "twin of",
];

export function RelationshipsSection({
  memberId,
  initialRelationships,
  allMembers,
}: RelationshipsSectionProps) {
  const { t } = useLanguage();
  const [rels, setRels] = useState<Rel[]>(initialRelationships);
  const [adding, setAdding] = useState(false);
  const [formType, setFormType] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const memberMap = new Map(allMembers.map((m) => [m.id, m]));
  const otherMembers = allMembers.filter((m) => m.id !== memberId);

  async function addRelationship() {
    if (!formType.trim() || !formTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${memberId}/relationships`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toMemberId: formTarget,
          relationshipType: formType.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRels((prev) => [...prev, json.data as Rel]);
        setAdding(false);
        setFormType("");
        setFormTarget("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRelationship(relId: string) {
    setDeletingId(relId);
    try {
      const res = await fetch(`/api/members/${memberId}/relationships/${relId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setRels((prev) => prev.filter((r) => r.id !== relId));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <GlassCard padding="none" className="overflow-hidden">
      {rels.length === 0 && !adding && (
        <div className="px-4 py-5 text-center text-subheadline text-muted-foreground">
          {t("members.noRelationships")}
        </div>
      )}

      {rels.map((rel) => {
        const isFrom = rel.fromMemberId === memberId;
        const otherId = isFrom ? rel.toMemberId : rel.fromMemberId;
        const other = memberMap.get(otherId);
        return (
          <div
            key={rel.id}
            className="flex items-center gap-2 px-4 py-3 border-b border-border/50 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <span className="text-body text-foreground">
                {isFrom ? (
                  <>
                    <span className="font-medium">{rel.relationshipType}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span
                      className="font-semibold"
                      style={{ color: other?.color ?? undefined }}
                    >
                      {other?.name ?? otherId}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="font-semibold"
                      style={{ color: other?.color ?? undefined }}
                    >
                      {other?.name ?? otherId}
                    </span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-medium">{rel.relationshipType}</span>
                  </>
                )}
              </span>
            </div>
            <button
              onClick={() => void deleteRelationship(rel.id)}
              disabled={deletingId === rel.id}
              aria-label={t("members.deleteRelationship")}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                "text-muted-foreground hover:text-ios-red hover:bg-ios-red/10",
                deletingId === rel.id && "opacity-40"
              )}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}

      {adding ? (
        <div className="p-4 border-t border-border/50 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Input
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              placeholder={t("members.relationshipTypePlaceholder")}
            />
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormType(s)}
                  className="px-2.5 py-1 rounded-full bg-secondary text-caption-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <select
            value={formTarget}
            onChange={(e) => setFormTarget(e.target.value)}
            className="px-3 py-2 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body focus:outline-none focus:ring-2 focus:ring-ios-blue"
          >
            <option value="">{t("members.relationshipTarget")}…</option>
            {otherMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setFormType("");
                setFormTarget("");
              }}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => void addRelationship()}
              disabled={saving || !formType.trim() || !formTarget}
              className="flex-1"
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center gap-2 px-4 py-3 text-ios-blue text-body font-medium border-t border-border/50 hover:bg-muted/30 transition-colors"
        >
          <Plus size={16} />
          {t("members.addRelationship")}
        </button>
      )}
    </GlassCard>
  );
}
