"use client";

import useSWR from "swr";
import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import { Plus, BookOpen } from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiFetcher, swrKeys } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";

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

function formatDate(value: string | number | Date, lang: string) {
  const d = new Date(value);
  return d.toLocaleDateString(lang, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function JournalPage() {
  const { t, language } = useLanguage();
  const { data, isLoading, error, mutate, isValidating } = useSWR<JournalEntry[]>(
    swrKeys.journal,
    apiFetcher
  );
  const entries = data ?? [];

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">{t("journal.title")}</LargeTitle>
        <Button asChild size="icon" className="mb-1">
          <Link href="/journal/new" aria-label={t("journal.new")}>
            <Plus size={20} />
          </Link>
        </Button>
      </div>

      <div className="px-4">
        <GlassCard padding="none" className="overflow-hidden">
          {error && !data ? (
            <ErrorState onRetry={() => mutate()} retrying={isValidating} />
          ) : isLoading ? (
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
            <EmptyState
              icon={BookOpen}
              title={t("journal.noEntries")}
              description={t("journal.recordThoughts")}
              tint="var(--ios-purple)"
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/journal/new">
                    <Plus size={16} />
                    {t("journal.new")}
                  </Link>
                </Button>
              }
            />
          ) : (
            entries.map((entry) => (
              <Link
                key={entry.id}
                href={`/journal/${entry.id}`}
                className="flex flex-col gap-1.5 px-4 py-4 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition solara-pressable"
                style={{ ["--press-scale" as string]: "0.99" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption-1 text-muted-foreground">
                    {formatDate(entry.createdAt, language)}
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
