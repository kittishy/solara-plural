"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { cn } from "@/lib/utils";
import { ensureAccentReadable } from "@/lib/theme";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useHaptics } from "@/lib/haptics";

type Member = {
  id: string;
  name: string;
  color?: string | null;
};

type FrontEntry = {
  id: string;
  memberIds: string[];
  members?: Array<{ memberId: string; tier: string }>;
  startedAt: string | number | Date;
  endedAt?: string | number | Date | null;
};

type Period = "7d" | "30d" | "all";

const PERIOD_MS: Record<Exclude<Period, "all">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function formatTotal(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function FrontStats({ entries, members }: { entries: FrontEntry[]; members: Member[] }) {
  const { t } = useLanguage();
  const { selection } = useHaptics();
  const [period, setPeriod] = useState<Period>("30d");

  const stats = useMemo(() => {
    const now = Date.now();
    const windowStart = period === "all" ? 0 : now - PERIOD_MS[period];

    const totals = new Map<string, number>();
    for (const entry of entries) {
      const start = new Date(entry.startedAt).getTime();
      // Ongoing fronts count up to "now".
      const end = entry.endedAt ? new Date(entry.endedAt).getTime() : now;
      if (Number.isNaN(start) || Number.isNaN(end)) continue;

      // Clamp the session to the selected window.
      const clampedStart = Math.max(start, windowStart);
      const clampedEnd = Math.min(end, now);
      const duration = clampedEnd - clampedStart;
      if (duration <= 0) continue;

      const ids = entry.members ? entry.members.map((m) => m.memberId) : entry.memberIds;
      for (const memberId of ids) {
        totals.set(memberId, (totals.get(memberId) ?? 0) + duration);
      }
    }

    const memberById = new Map(members.map((m) => [m.id, m]));
    return Array.from(totals.entries())
      .map(([memberId, ms]) => ({
        member: memberById.get(memberId),
        memberId,
        ms,
      }))
      .filter((row) => row.member)
      .sort((a, b) => b.ms - a.ms);
  }, [entries, members, period]);

  const maxMs = stats[0]?.ms ?? 0;

  const PERIODS: { value: Period; label: string }[] = [
    { value: "7d", label: t("front.statsPeriod7d") },
    { value: "30d", label: t("front.statsPeriod30d") },
    { value: "all", label: t("front.statsPeriodAll") },
  ];

  return (
    <GlassCard padding="md" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <BarChart3 size={14} />
          {t("front.statsTitle")}
        </p>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => { selection(); setPeriod(p.value); }}
              className={cn(
                "px-2.5 py-1 rounded-full text-caption-2 font-semibold ios-press whitespace-nowrap",
                period === p.value
                  ? "bg-ios-blue text-white"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {stats.length === 0 ? (
        <p className="text-subheadline text-muted-foreground text-center py-2">
          {t("front.statsEmpty")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {stats.map(({ member, memberId, ms }) => {
            const accent = ensureAccentReadable(member?.color || "#8B5CF6");
            const widthPct = maxMs > 0 ? Math.max(4, (ms / maxMs) * 100) : 0;
            return (
              <div key={memberId} className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: accent }}
                />
                <span className="text-subheadline text-foreground w-24 truncate flex-shrink-0">
                  {member?.name}
                </span>
                <span className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${widthPct}%`, background: accent }}
                  />
                </span>
                <span className="text-caption-1 text-muted-foreground font-mono flex-shrink-0">
                  {formatTotal(ms)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
