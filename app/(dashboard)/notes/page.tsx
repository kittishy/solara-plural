"use client";

import useSWR from "swr";
import Link from "next/link";
import { Plus, FileText, Lock } from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetcher, swrKeys } from "@/lib/swr";

type Note = {
  id: string;
  title: string | null;
  content: string;
  category: string | null;
  isPrivate?: number;
  updatedAt: string | number | Date;
};

function formatDate(value: string | number | Date) {
  const d = new Date(value);
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

export default function NotesPage() {
  const { data, isLoading } = useSWR<Note[]>(swrKeys.notes, apiFetcher);
  const notes = data ?? [];

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">Notas</LargeTitle>
        <Link href="/notes/new">
          <Button size="icon" className="mb-1">
            <Plus size={20} />
          </Button>
        </Link>
      </div>

      <div className="px-4">
        <GlassCard padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <FileText size={36} className="text-muted-foreground/40" />
              <div>
                <p className="text-body font-semibold text-foreground">
                  Sem notas ainda
                </p>
                <p className="text-subheadline text-muted-foreground mt-1">
                  Crie sua primeira nota
                </p>
              </div>
              <Link href="/notes/new">
                <Button variant="outline" size="sm">
                  <Plus size={16} />
                  Nova nota
                </Button>
              </Link>
            </div>
          ) : (
            notes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="flex flex-col gap-1.5 px-4 py-3.5 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-body font-semibold text-foreground truncate flex items-center gap-1.5">
                    {note.isPrivate ? <Lock size={12} /> : null}
                    {note.title || "Sem título"}
                  </p>
                  <span className="text-caption-1 text-muted-foreground flex-shrink-0">
                    {formatDate(note.updatedAt)}
                  </span>
                </div>
                {note.content && (
                  <p className="text-subheadline text-muted-foreground line-clamp-2">
                    {note.content}
                  </p>
                )}
                {note.category && (
                  <span className="self-start px-2 py-0.5 rounded-full text-caption-2 font-semibold bg-ios-blue/15 text-ios-blue">
                    {note.category}
                  </span>
                )}
              </Link>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  );
}
