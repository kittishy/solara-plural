"use client";

import Link from "next/link";
import { Users, Layers, BookOpen, FileText, Heart, UserPlus, X } from "lucide-react";
import useSWR, { mutate } from "swr";
import { useState, useEffect, useMemo } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { LargeTitle } from "@/components/layout/NavBar";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { parseStoredTags } from "@/lib/members/fields";
import { apiFetcher, swrKeys } from "@/lib/swr";

type FrontingMember = {
  id: string;
  name: string;
  pronouns: string | null;
  color: string | null;
  avatarUrl: string | null;
};

type RecentMember = {
  id: string;
  name: string;
  pronouns: string | null;
  color: string | null;
  avatarUrl: string | null;
  tags: string | null;
};

type CurrentFrontSnapshot = {
  id: string;
  memberIds: string[];
  startedAt: string;
} | null;

type Props = {
  systemName: string | undefined;
  memberCount: number;
  journalCount: number;
  noteCount: number;
  friendCount: number;
  partnerCount: number;
  frontingMembers: FrontingMember[];
  recentMembers: RecentMember[];
  hasFrontHistory: boolean;
  currentFrontSnapshot: CurrentFrontSnapshot;
};

function MemberAvatar({ member, size = 40 }: { member: { name: string; color: string | null; avatarUrl: string | null }; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: member.color ? `${member.color}22` : "#8E8E9322" }}
    >
      {member.avatarUrl ? (
        <DynamicAvatarImage src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-semibold" style={{ color: member.color ?? "#8E8E93", fontSize: size * 0.4 }}>
          {member.name[0].toUpperCase()}
        </span>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, href }: { icon: React.ElementType; label: string; value: number; color: string; href: string }) {
  return (
    <Link href={href} className="block">
      <GlassCard padding="md" className="flex flex-col gap-2 ios-press ios-transition h-full">
        <div className="w-9 h-9 rounded-ios-sm flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className="text-title-2" style={{ color }}>{value}</p>
          <p className="text-caption-1 text-muted-foreground">{label}</p>
        </div>
      </GlassCard>
    </Link>
  );
}

export function HomeContent({
  systemName,
  memberCount,
  journalCount,
  noteCount,
  friendCount,
  partnerCount,
  frontingMembers: initialFrontingMembers,
  recentMembers,
  hasFrontHistory,
  currentFrontSnapshot,
}: Props) {
  const { t, language } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Fetch current front entry client-side for interactive actions and live display.
  // `fallbackData` seeds SWR with the SSR snapshot so the first paint matches the
  // server render — no spinner flash, no layout shift on hydration.
  const { data: currentFront, mutate: mutateFront } = useSWR<
    { id: string; memberIds: string[]; startedAt: string } | null
  >(swrKeys.front, apiFetcher, {
    fallbackData: currentFrontSnapshot,
    keepPreviousData: true,
  });

  // Build a stable lookup map from the SSR snapshot so we can resolve member
  // details even after the SWR front entry updates with different IDs.
  const memberLookup = useMemo(
    () => new Map(initialFrontingMembers.map((m) => [m.id, m])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // intentionally stable — lookup is seeded once from SSR props
  );

  // Derive the displayed fronting list reactively from SWR.
  // Falls back to the SSR snapshot while SWR hydrates (currentFront === undefined).
  const frontingMembers = useMemo((): FrontingMember[] => {
    if (currentFront === undefined) return initialFrontingMembers;
    if (!currentFront?.memberIds?.length) return [];
    return currentFront.memberIds
      .map((id) => memberLookup.get(id))
      .filter(Boolean) as FrontingMember[];
  }, [currentFront, memberLookup, initialFrontingMembers]);

  const frontingIds = currentFront?.memberIds ?? [];

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  function formatFrontDuration(startedAt: string): string {
    const ms = now - new Date(startedAt).getTime();
    const totalMin = Math.floor(ms / 60_000);
    const hr = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (hr > 0) return `${hr}h ${min}m`;
    if (min > 0) return `${min}m`;
    return "< 1m";
  }

  function formatStartTime(startedAt: string): string {
    return new Date(startedAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });
  }

  async function toggleMember(memberId: string) {
    if (updating) return;
    setUpdating(true);
    const newIds = frontingIds.filter((id) => id !== memberId);
    // Optimistic: paint the new state immediately. SWR will reconcile with the
    // server response. If the request fails, the rollback flag below restores.
    const optimistic = newIds.length === 0
      ? null
      : currentFront
        ? { ...currentFront, memberIds: newIds }
        : null;
    try {
      await mutateFront(
        async () => {
          if (newIds.length === 0) {
            await fetch("/api/front", { method: "DELETE", credentials: "same-origin" });
            return null;
          }
          const res = await fetch("/api/front", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberIds: newIds }),
          });
          const json = await res.json().catch(() => null);
          return json?.data
            ? { id: json.data.id, memberIds: json.data.memberIds, startedAt: json.data.startedAt }
            : optimistic;
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false }
      );
      void mutate(swrKeys.frontHistory);
    } finally {
      setUpdating(false);
    }
  }

  async function endFront() {
    if (updating) return;
    setUpdating(true);
    try {
      await mutateFront(
        async () => {
          await fetch("/api/front", { method: "DELETE", credentials: "same-origin" });
          return null;
        },
        { optimisticData: null, rollbackOnError: true, revalidate: false }
      );
      void mutate(swrKeys.frontHistory);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {t("home.greeting", { name: systemName ?? t("home.defaultName") })}
        </p>
        <LargeTitle className="px-0">{t("nav.home")}</LargeTitle>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-5">
        <StatCard icon={Users} label={t("home.statMembers")} value={memberCount} color="#007AFF" href="/members" />
        <StatCard icon={Layers} label={t("home.statFronting")} value={frontingMembers.length} color="#34C759" href="/front" />
        <StatCard icon={BookOpen} label={t("home.statEntries")} value={journalCount} color="#AF52DE" href="/journal" />
        <StatCard icon={FileText} label={t("home.statNotes")} value={noteCount} color="#FF9500" href="/notes" />
        <StatCard icon={UserPlus} label={t("home.statFriends")} value={friendCount} color="#5AC8FA" href="/friends" />
        <StatCard icon={Heart} label={t("home.statPartnerships")} value={partnerCount} color="#FF2D55" href="/partners" />
      </div>

      {/* Currently fronting */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex flex-col gap-0">
            <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">
              {t("home.nowFronting")}
            </p>
            {currentFront?.startedAt && frontingMembers.length > 0 && (
              <p className="text-caption-2 text-muted-foreground/70">
                {t("home.frontSince", { time: formatStartTime(currentFront.startedAt) })}
                {" · "}
                {formatFrontDuration(currentFront.startedAt)}
              </p>
            )}
          </div>
          {frontingMembers.length > 0 && (
            <button
              onClick={endFront}
              disabled={updating}
              className="text-subheadline text-ios-red font-semibold ios-press disabled:opacity-50"
            >
              {t("front.endAll")}
            </button>
          )}
        </div>
        <GlassCard padding="none" className="overflow-hidden">
          {frontingMembers.length === 0 ? (
            <Link
              href="/front"
              className="block p-5 text-center text-muted-foreground text-subheadline active:bg-muted/30 ios-transition"
            >
              {t("home.noOneFronting")}
            </Link>
          ) : (
            frontingMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
              >
                <Link
                  href={`/members/${m.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <MemberAvatar member={m} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">{m.name}</p>
                    {m.pronouns && (
                      <p className="text-caption-1 text-muted-foreground truncate">{m.pronouns}</p>
                    )}
                  </div>
                </Link>
                <Badge variant="success">{t("front.title")}</Badge>
                <button
                  onClick={() => toggleMember(m.id)}
                  disabled={updating}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-ios-red hover:bg-ios-red/10 ios-transition disabled:opacity-50"
                  title={t("front.removeMemberFront")}
                  aria-label={t("front.removeMemberFront")}
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>
            ))
          )}
        </GlassCard>
      </div>

      {/* Recent members */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">
            {hasFrontHistory ? t("home.recentlyFronted") : t("home.recentMembers")}
          </p>
          <Link href="/members" className="text-subheadline text-ios-blue ios-press">
            {t("common.seeAll")}
          </Link>
        </div>
        <GlassCard padding="none" className="overflow-hidden">
          {recentMembers.length === 0 ? (
            <Link
              href="/members/new"
              className="block p-5 text-center text-muted-foreground text-subheadline active:bg-muted/30 ios-transition"
            >
              {t("home.noMembers")}
            </Link>
          ) : (
            recentMembers.map((m) => {
              const tags = parseStoredTags(m.tags);
              return (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition"
                >
                  <MemberAvatar member={m} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">{m.name}</p>
                    {m.pronouns ? (
                      <p className="text-caption-1 text-muted-foreground truncate">{m.pronouns}</p>
                    ) : tags.length > 0 ? (
                      <p className="text-caption-1 text-muted-foreground truncate">
                        {tags.slice(0, 2).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  {m.color && (
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  )}
                </Link>
              );
            })
          )}
        </GlassCard>
      </div>
    </div>
  );
}
