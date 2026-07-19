"use client";

import useSWR from "swr";
import Link from "next/link";
import { Plus, FileText, Lock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiFetcher, swrKeys } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useHaptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  title: string | null;
  content: string;
  category: string | null;
  isPrivate?: number;
  updatedAt: string | number | Date;
};

function formatDate(value: string | number | Date, lang: string) {
  const d = new Date(value);
  return d.toLocaleDateString(lang, {
    day: "numeric",
    month: "short",
  });
}

export default function NotesPage() {
  const { t, language } = useLanguage();
  const { selection } = useHaptics();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data, isLoading, error, mutate, isValidating } = useSWR<Note[]>(swrKeys.notes, apiFetcher);
  const notes = useMemo(() => data ?? [], [data]);

  const categories = Array.from(new Set(notes.map((n) => n.category).filter(Boolean) as string[]));
  const filtered = useMemo(() => {
    const byCategory = categoryFilter
      ? notes.filter((n) => n.category === categoryFilter)
      : notes;
    const query = search.trim().toLowerCase();
    if (!query) return byCategory;
    return byCategory.filter((n) =>
      (n.title ?? "").toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query)
    );
  }, [notes, categoryFilter, search]);

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">{t("notes.title")}</LargeTitle>
        <Button asChild size="icon" className="mb-1">
          <Link href="/notes/new">
            <Plus size={20} />
          </Link>
        </Button>
      </div>

      {/* Search */}
      {(notes.length > 0 || search) && (
        <div className="px-4 mb-3 relative">
          <Search
            size={16}
            className="absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("notes.searchPlaceholder")}
            className="pl-9"
          />
        </div>
      )}

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="px-4 mb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { selection(); setCategoryFilter(null); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-caption-1 font-semibold whitespace-nowrap ios-press",
              categoryFilter === null
                ? "bg-ios-blue text-white"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {t("common.all")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { selection(); setCategoryFilter(cat); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-caption-1 font-semibold whitespace-nowrap ios-press",
                categoryFilter === cat
                  ? "bg-ios-blue text-white"
                  : "bg-ios-blue/10 text-ios-blue"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="px-4">
        <GlassCard padding="none" className="overflow-hidden">
          {error && !data ? (
            <ErrorState onRetry={() => mutate()} retrying={isValidating} />
          ) : isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={search.trim()
                ? t("notes.noSearchResults", { query: search.trim() })
                : categoryFilter
                  ? t("notes.noNotesInCategory", { category: categoryFilter })
                  : t("notes.noNotes")}
              description={search.trim() ? undefined : t("notes.createFirst")}
              tint="var(--ios-teal)"
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/notes/new">
                    <Plus size={16} />
                    {t("notes.new")}
                  </Link>
                </Button>
              }
            />
          ) : (
            filtered.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="flex flex-col gap-1.5 px-4 py-3.5 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition solara-pressable"
                style={{ ["--press-scale" as string]: "0.99" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-body font-semibold text-foreground truncate flex items-center gap-1.5">
                    {note.isPrivate ? <Lock size={12} /> : null}
                    {note.title || t("notes.untitled")}
                  </p>
                  <span className="text-caption-1 text-muted-foreground flex-shrink-0">
                    {formatDate(note.updatedAt, language)}
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
