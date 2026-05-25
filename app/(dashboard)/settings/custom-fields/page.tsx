"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys } from "@/lib/swr";
import { cn } from "@/lib/utils";

type CustomField = {
  id: string;
  name: string;
  description: string | null;
  type: "text" | "long_text" | "number" | "date" | "checkbox" | "select";
  options: { label: string; value: string }[];
};

const FIELD_TYPES = [
  { value: "text", label: "Texto curto" },
  { value: "long_text", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "checkbox", label: "Sim/Não" },
  { value: "select", label: "Seleção" },
] as const;

export default function CustomFieldsSettingsPage() {
  const { data, isLoading } = useSWR<{ fields: CustomField[] }>(
    swrKeys.customFields,
    apiFetcher
  );
  const fields = data?.fields ?? [];

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CustomField["type"]>("text");
  const [optionsText, setOptionsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setType("text");
    setOptionsText("");
    setError("");
  }

  async function createField(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    setSaving(true);
    try {
      const options =
        type === "select"
          ? optionsText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((label) => ({ label, value: label.toLowerCase().replace(/\s+/g, "_") }))
          : undefined;
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          type,
          options,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Erro ao criar");
        return;
      }
      reset();
      setShowNew(false);
      void mutate(swrKeys.customFields);
    } finally {
      setSaving(false);
    }
  }

  async function deleteField(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/custom-fields/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      void mutate(swrKeys.customFields);
    } finally {
      setDeletingId(null);
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
            <span className="text-body">Config</span>
          </Link>
          <h1 className="text-headline font-semibold absolute left-1/2 -translate-x-1/2">
            Campos
          </h1>
          <button
            onClick={() => setShowNew(true)}
            className="text-ios-blue ios-press"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        <p className="text-subheadline text-muted-foreground mb-3 px-1">
          Crie campos customizados para adicionar a cada membro do sistema (cor de cabelo, hobby, etc.)
        </p>

        <GlassCard padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : fields.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-subheadline">
              Nenhum campo ainda — adicione um
            </div>
          ) : (
            fields.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
              >
                <GripVertical size={16} className="text-muted-foreground/40 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-foreground truncate">
                    {f.name}
                  </p>
                  <p className="text-caption-1 text-muted-foreground">
                    {FIELD_TYPES.find((t) => t.value === f.type)?.label ?? f.type}
                    {f.type === "select" && f.options.length > 0 && (
                      <> · {f.options.length} opções</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => deleteField(f.id)}
                  disabled={deletingId === f.id}
                  className="w-9 h-9 rounded-full bg-ios-red/10 text-ios-red flex items-center justify-center ios-press disabled:opacity-50"
                  aria-label="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </GlassCard>
      </div>

      {/* New field sheet */}
      <BottomSheet
        open={showNew}
        onClose={() => {
          setShowNew(false);
          reset();
        }}
        title="Novo campo"
      >
        <form onSubmit={createField} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-name">Nome *</Label>
            <Input
              id="field-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cor de cabelo, hobby..."
              required
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-description">Descrição</Label>
            <Input
              id="field-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
              maxLength={180}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "px-3 py-2 rounded-ios-sm text-subheadline font-semibold ios-press text-left",
                    type === t.value
                      ? "bg-ios-blue text-white"
                      : "bg-secondary text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {type === "select" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-options">Opções (uma por linha)</Label>
              <textarea
                id="field-options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                className="min-h-[100px] px-4 py-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body resize-y focus:outline-none focus:ring-2 focus:ring-ios-blue"
              />
            </div>
          )}

          {error && (
            <p className="text-subheadline text-ios-red text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full"
          >
            {saving ? "Criando..." : "Criar campo"}
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
}
