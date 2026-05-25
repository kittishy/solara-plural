"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Save, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { revalidateNotes } from "@/lib/swr";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  noteId?: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const router = useRouter();
  const isNew = !noteId;
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          credentials: "same-origin",
        });
        const json = await res.json();
        if (json.success && !cancelled) {
          setTitle(json.data.title ?? "");
          setContent(json.data.content ?? "");
          setCategory(json.data.category ?? "");
          setMemberId(typeof json.data.memberId === "string" ? json.data.memberId : null);
          setIsPrivate(json.data.isPrivate === 1 || json.data.isPrivate === true);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError("O conteúdo não pode estar vazio");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const body = {
        title: title.trim() || null,
        content: content.trim(),
        category: category.trim() || null,
        memberId,
        isPrivate,
      };
      const res = await fetch(
        isNew ? "/api/notes" : `/api/notes/${noteId}`,
        {
          method: isNew ? "POST" : "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Erro ao salvar");
        return;
      }
      revalidateNotes();
      router.push("/notes");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!noteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        revalidateNotes();
        router.push("/notes");
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
            <span className="text-body">Voltar</span>
          </button>
          <h1 className="text-headline font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
            {isNew ? "Nova nota" : "Editar"}
          </h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="text-body font-semibold text-ios-blue ios-press disabled:opacity-40"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4 px-4 pt-4">
        <GlassCard padding="lg" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sem título"
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Geral, importante..."
              maxLength={80}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-ios-sm ios-press ios-transition",
              isPrivate ? "bg-ios-blue/10" : "bg-secondary"
            )}
          >
            {isPrivate ? (
              <Lock size={18} className="text-ios-blue" />
            ) : (
              <Unlock size={18} className="text-muted-foreground" />
            )}
            <div className="flex-1 text-left">
              <p className="text-body font-semibold text-foreground">
                {isPrivate ? "Privada" : "Visível ao sistema"}
              </p>
              <p className="text-caption-1 text-muted-foreground">
                {isPrivate
                  ? "Só você pode ver esta nota"
                  : "Outros membros podem ver"}
              </p>
            </div>
          </button>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="content">Conteúdo *</Label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              required
              maxLength={20000}
              className="min-h-[240px] px-4 py-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body resize-y focus:outline-none focus:ring-2 focus:ring-ios-blue font-mono text-[15px]"
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
            Excluir nota
          </Button>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={saving || !content.trim()}
        >
          <Save size={16} />
          {saving ? "Salvando..." : isNew ? "Criar nota" : "Salvar alterações"}
        </Button>
      </form>

      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir nota?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-foreground">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full"
            >
              {deleting ? "Excluindo..." : "Sim, excluir"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
