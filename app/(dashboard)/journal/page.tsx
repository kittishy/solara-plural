"use client";

import useSWR from "swr";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetcher, swrKeys } from "@/lib/swr";

type JournalEntry = {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  createdAt: string | number | Date;
};

const moodEmoji: Record<string, string> = {
  great: "😄",
  good: "🙂",
  okay: "😐",
  bad: "😕",
  terrible: "😞",
};

function formatDate(value: string | number | Date) {
  const d = new Date(value);
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function JournalPage() {
  const { data, isLoading } = useSWR<JournalEntry[]>(
    swrKeys.journal,
    apiFetcher
  );
  const entries = data ?? [];

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">Diário</LargeTitle>
        <Link href="/journal/new">
          <Button size="icon" className="mb-1">
            <Plus size={20} />
          </Button>
        </Link>
      </div>

      <div className="px-4">
        <GlassCard padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-0">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 py-4 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <BookOpen size={36} className="text-muted-foreground/40" />
              <div>
                <p className="text-body font-semibold text-foreground">
                  Diário vazio
                </p>
                <p className="text-subheadline text-muted-foreground mt-1">
                  Registre seus pensamentos
                </p>
              </div>
              <Link href="/journal/new">
                <Button variant="outline" size="sm">
                  <Plus size={16} />
                  Nova entrada
                </Button>
              </Link>
            </div>
          ) : (
            entries.map((entry) => (
              <Link
                key={entry.id}
                href={`/journal/${entry.id}`}
                className="flex flex-col gap-1.5 px-4 py-4 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption-1 text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </p>
                  {entry.mood && (
                    <span className="text-base">
                      {moodEmoji[entry.mood] ?? ""}
                    </span>
                  )}
                </div>
                {entry.title && (
                  <p className="text-body font-semibold text-foreground">
                    {entry.title}
                  </p>
                )}
                {entry.content && (
                  <p className="text-subheadline text-muted-foreground line-clamp-2">
                    {entry.content}
                  </p>
                )}
              </Link>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  );
}
