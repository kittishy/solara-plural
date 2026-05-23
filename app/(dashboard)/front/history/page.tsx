"use client";

import useSWR from "swr";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetcher, swrKeys } from "@/lib/swr";

type Member = {
  id: string;
  name: string;
  color?: string | null;
};

type FrontEntry = {
  id: string;
  memberIds: string[];
  startedAt: string | number | Date;
  endedAt?: string | number | Date | null;
  note?: string | null;
};

function formatDateTime(value: string | number | Date) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function FrontHistoryPage() {
  const { data: history, isLoading } = useSWR<FrontEntry[]>(
    swrKeys.frontHistory,
    apiFetcher
  );
  const { data: members } = useSWR<Member[]>(swrKeys.members, apiFetcher);

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));
  const entries = history ?? [];

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center px-4 h-11">
          <Link
            href="/front"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">Frente</span>
          </Link>
          <h1 className="text-headline font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
            Histórico
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4">
        <GlassCard padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-4 h-4 mt-1" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-subheadline">
              Sem histórico
            </div>
          ) : (
            entries.map((entry) => {
              const memberNames = entry.memberIds
                .map((id) => memberById.get(id))
                .filter(Boolean) as Member[];
              const duration =
                entry.endedAt &&
                formatDuration(new Date(entry.startedAt), new Date(entry.endedAt));
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 px-4 py-3.5 border-b border-border/50 last:border-0"
                >
                  <Clock size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {memberNames.map((m) => (
                        <span
                          key={m.id}
                          className="px-2 py-0.5 rounded-full text-caption-1 font-semibold"
                          style={{
                            background: m.color ? `${m.color}22` : "#8E8E9322",
                            color: m.color ?? "#8E8E93",
                          }}
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-caption-1 text-muted-foreground">
                      {formatDateTime(entry.startedAt)}
                      {entry.endedAt && ` → ${formatDateTime(entry.endedAt)}`}
                      {duration && ` · ${duration}`}
                    </p>
                    {entry.note && (
                      <p className="text-subheadline text-foreground mt-1">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>
    </div>
  );
}
