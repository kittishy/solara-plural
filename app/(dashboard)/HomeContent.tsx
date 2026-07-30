"use client";

import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import { Users, Layers, BookOpen, FileText, UserPlus, X } from "lucide-react";
import useSWR, { mutate } from "swr";
import { useState, useEffect, useMemo } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { LargeTitle } from "@/components/layout/NavBar";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useHaptics } from "@/lib/haptics";
import { parseStoredTags } from "@/lib/members/fields";
import {
  createFrontSnapshotSignature,
  TIER_CONFIG,
  type FrontTier,
} from "@/lib/front";
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
  memberTiers?: Record<string, FrontTier>;
  note?: string | null;
  startedAt: string;
} | null;

type Props = {
  systemName: string | undefined;
  memberCount: number;
  journalCount: number;
  noteCount: number;
  friendCount: number;
  frontingMembers: FrontingMember[];
  recentMembers: RecentMember[];
  hasFrontHistory: boolean;
  currentFrontSnapshot: CurrentFrontSnapshot;
  renderedAt: string;
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
      <GlassCard padding="md" className="flex items-center gap-3 ios-press ios-transition h-full">
        <div className="w-10 h-10 rounded-ios flex items-center justify-center flex-shrink-0" style={{ background: `${color}1f` }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-title-2 leading-6 text-foreground">{value}</p>
          <p className="text-caption-1 font-medium text-muted-foreground truncate">{label}</p>
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
  frontingMembers: initialFrontingMembers,
  recentMembers,
  hasFrontHistory,
  currentFrontSnapshot,
  renderedAt,
}: Props) {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const {
    selection,
    warning,
    success,
    error: errorHaptic,
  } = useHaptics();
  const [updating, setUpdating] = useState(false);
  const [now, setNow] = useState(() => new Date(renderedAt).getTime());

  // Fetch current front entry client-side for interactive actions and live display.
  // `fallbackData` seeds SWR with the SSR snapshot so the first paint matches the
  // server render — no spinner flash, no layout shift on hydration.
  const { data: currentFront, mutate: mutateFront } = useSWR<CurrentFrontSnapshot>(
    swrKeys.front,
    apiFetcher,
    {
    fallbackData: currentFrontSnapshot,
    keepPreviousData: true,
    }
  );
  const { data: membersData } = useSWR<{ data: FrontingMember[] }>(
    swrKeys.members,
    apiFetcher,
    { keepPreviousData: true }
  );

  // Build a stable lookup map from the SSR snapshot so we can resolve member
  // details even after the SWR front entry updates with different IDs.
  const memberLookup = useMemo(
    () =>
      new Map(
        [
          ...recentMembers,
          ...initialFrontingMembers,
          ...(membersData?.data ?? []),
        ].map((member) => [member.id, member])
      ),
    [initialFrontingMembers, membersData?.data, recentMembers]
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
  const currentFrontSignature = useMemo(
    () => (currentFront ? createFrontSnapshotSignature(currentFront) : null),
    [currentFront]
  );

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
    selection();
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
            const res = await fetch("/api/front", {
              method: "DELETE",
              credentials: "same-origin",
              headers: currentFrontSignature
                ? { "x-front-expected-signature": currentFrontSignature }
                : undefined,
            });
            if (res.status === 409) throw new Error("front_conflict");
            if (!res.ok) throw new Error("front_delete_failed");
            return null;
          }
          const memberTiers = Object.fromEntries(
            Object.entries(currentFront?.memberTiers ?? {}).filter(([id]) =>
              newIds.includes(id)
            )
          );
          const res = await fetch("/api/front", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberIds: newIds,
              memberTiers,
              note: currentFront?.note ?? undefined,
              expectedFrontId: currentFront?.id ?? null,
              expectedFrontSignature: currentFrontSignature,
            }),
          });
          // A failed write must throw so SWR rolls back the optimistic state
          // instead of leaving the wrong front list painted on screen.
          if (res.status === 409) throw new Error("front_conflict");
          if (!res.ok) throw new Error("front_save_failed");
          const json = await res.json().catch(() => null);
          return json?.data ?? optimistic;
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false }
      );
      void mutate(swrKeys.frontHistory);
      success();
      showToast(t("front.updated"), "success");
    } catch (error) {
      errorHaptic();
      if (error instanceof Error && error.message === "front_conflict") {
        await mutateFront();
        void mutate(swrKeys.frontHistory);
        showToast(t("front.editConflict"));
      } else {
        showToast(t("front.saveError"));
      }
    } finally {
      setUpdating(false);
    }
  }

  async function endFront() {
    if (updating) return;
    warning();
    setUpdating(true);
    try {
      await mutateFront(
        async () => {
          const res = await fetch("/api/front", {
            method: "DELETE",
            credentials: "same-origin",
            headers: currentFrontSignature
              ? { "x-front-expected-signature": currentFrontSignature }
              : undefined,
          });
          if (res.status === 409) throw new Error("front_conflict");
          if (!res.ok) throw new Error("front_end_failed");
          return null;
        },
        { optimisticData: null, rollbackOnError: true, revalidate: false }
      );
      void mutate(swrKeys.frontHistory);
      success();
      showToast(t("front.ended"), "success");
    } catch (error) {
      errorHaptic();
      if (error instanceof Error && error.message === "front_conflict") {
        await mutateFront();
        void mutate(swrKeys.frontHistory);
        showToast(t("front.editConflict"));
      } else {
        showToast(t("front.endError"));
      }
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

      {/* Currently fronting — hero card */}
      <div className="px-4 mb-5">
        <GlassCard padding="none" className="overflow-hidden relative border border-ios-blue/20">
          {/* Soft violet→pink wash so the hero reads "alive", not a settings row */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background:
                "linear-gradient(135deg, rgb(var(--ios-blue-rgb, 124 58 237) / 0.10), transparent 45%, rgba(236, 72, 153, 0.07))",
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden>
                  {frontingMembers.length > 0 && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ios-blue opacity-60" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      frontingMembers.length > 0 ? "bg-ios-blue" : "bg-muted-foreground/40"
                    }`}
                  />
                </span>
                <p className="text-footnote font-bold text-muted-foreground uppercase tracking-wide truncate">
                  {t("home.nowFronting")}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {currentFront?.startedAt && frontingMembers.length > 0 && (
                  <p className="text-caption-1 text-muted-foreground">
                    {formatStartTime(currentFront.startedAt)}
                    {" · "}
                    {formatFrontDuration(currentFront.startedAt)}
                  </p>
                )}
                {frontingMembers.length > 0 && (
                  <button
                    onClick={endFront}
                    disabled={updating}
                    className="min-h-11 px-2 text-footnote text-ios-red font-bold ios-press disabled:opacity-50"
                  >
                    {t("front.endAll")}
                  </button>
                )}
              </div>
            </div>
            {frontingMembers.length === 0 ? (
              <Link
                href="/front"
                className="block px-4 pb-5 pt-1 text-center text-muted-foreground text-subheadline active:bg-muted/30 ios-transition"
              >
                {t("home.noOneFronting")}
              </Link>
            ) : (
              frontingMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3 border-t border-border/40"
                >
                  <Link
                    href={`/members/${m.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <MemberAvatar member={m} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-bold text-foreground truncate">{m.name}</p>
                      {m.pronouns && (
                        <p className="text-caption-1 text-muted-foreground truncate">{m.pronouns}</p>
                      )}
                    </div>
                  </Link>
                  {currentFront?.memberTiers?.[m.id] ? (
                    <Badge
                      variant="outline"
                      style={{
                        color:
                          TIER_CONFIG[currentFront.memberTiers[m.id]].color,
                        borderColor: `${TIER_CONFIG[currentFront.memberTiers[m.id]].color}66`,
                      }}
                    >
                      {t(
                        TIER_CONFIG[currentFront.memberTiers[m.id]]
                          .labelKey as Parameters<typeof t>[0]
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="success">{t("front.title")}</Badge>
                  )}
                  <button
                    onClick={() => toggleMember(m.id)}
                    disabled={updating}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-ios-red hover:bg-ios-red/10 ios-transition disabled:opacity-50"
                    title={t("front.removeMemberFront")}
                    aria-label={t("front.removeMemberFront")}
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>
                </div>
              ))
            )}
            {frontingMembers.length > 0 && (
              <div className="flex items-center gap-3 border-t border-border/40 px-4 py-2">
                {currentFront?.note ? (
                  <p className="line-clamp-2 min-w-0 flex-1 text-caption-1 text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {t("front.note")}:
                    </span>{" "}
                    {currentFront.note}
                  </p>
                ) : (
                  <span className="flex-1" />
                )}
                <Link
                  href="/front"
                  className="flex min-h-11 flex-shrink-0 items-center px-2 text-subheadline font-bold text-ios-blue ios-press"
                >
                  {t("front.editFront")}
                </Link>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-5">
        <StatCard icon={Users} label={t("home.statMembers")} value={memberCount} color="#8B5CF6" href="/members" />
        <StatCard icon={Layers} label={t("home.statFronting")} value={frontingMembers.length} color="#34C759" href="/front" />
        <StatCard icon={BookOpen} label={t("home.statEntries")} value={journalCount} color="#5856D6" href="/journal" />
        <StatCard icon={FileText} label={t("home.statNotes")} value={noteCount} color="#FF9500" href="/notes" />
        <StatCard icon={UserPlus} label={t("home.statFriends")} value={friendCount} color="#32ADE6" href="/friends" />
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
