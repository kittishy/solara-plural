"use client";

import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import {
  BookOpen,
  Clock,
  FileText,
  Hand,
  Layers,
  Sun,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import useSWR, { mutate } from "swr";
import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useHaptics } from "@/lib/haptics";
import { parseStoredTags } from "@/lib/members/fields";
import { createFrontSnapshotSignature, TIER_CONFIG, type FrontTier } from "@/lib/front";
import { apiFetcher, swrKeys } from "@/lib/swr";

type FrontingMember = {
  id: string;
  name: string;
  pronouns: string | null;
  color: string | null;
  avatarUrl: string | null;
};

type RecentMember = FrontingMember & {
  tags: string | null;
};

type CurrentFrontSnapshot = {
  id: string;
  memberIds: string[];
  memberTiers: Record<string, FrontTier>;
  startedAt: string;
  note: string | null;
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

function MemberAvatar({
  member,
  size = 40,
  emphasized = false,
}: {
  member: Pick<FrontingMember, "name" | "color" | "avatarUrl">;
  size?: number;
  emphasized?: boolean;
}) {
  const color = member.color ?? "#8E8E93";

  return (
    <div
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: `${color}22`,
        border: emphasized ? `2px solid ${color}` : `1px solid ${color}55`,
        boxShadow: emphasized ? `0 0 0 5px ${color}16` : undefined,
      }}
    >
      {member.avatarUrl ? (
        <DynamicAvatarImage
          src={member.avatarUrl}
          alt={member.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="font-extrabold"
          style={{ color, fontSize: size * 0.36 }}
          aria-hidden
        >
          {member.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[72px] items-center gap-3 px-4 py-3 ios-press focus-visible:z-10"
    >
      <Icon size={19} className="flex-shrink-0 text-ios-blue" aria-hidden />
      <span className="min-w-0">
        <span className="block text-title-3 font-extrabold leading-6 text-foreground">
          {value}
        </span>
        <span className="block truncate text-caption-1 font-medium text-muted-foreground">
          {label}
        </span>
      </span>
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
  const { selection, warning } = useHaptics();
  const [updating, setUpdating] = useState(false);
  const [now, setNow] = useState(() => new Date(renderedAt).getTime());

  const { data: currentFront, mutate: mutateFront } =
    useSWR<CurrentFrontSnapshot>(swrKeys.front, apiFetcher, {
      fallbackData: currentFrontSnapshot,
      keepPreviousData: true,
    });

  // Home only removes current members. A stable SSR lookup therefore covers
  // every optimistic state without a second member request.
  const memberLookup = useMemo(
    () => new Map(initialFrontingMembers.map((member) => [member.id, member])),
    [initialFrontingMembers]
  );

  const frontingMembers = useMemo(() => {
    if (currentFront === undefined) return initialFrontingMembers;
    if (!currentFront?.memberIds.length) return [];
    return currentFront.memberIds
      .map((id) => memberLookup.get(id))
      .filter((member): member is FrontingMember => Boolean(member));
  }, [currentFront, initialFrontingMembers, memberLookup]);

  const frontingIds = currentFront?.memberIds ?? [];
  const currentFrontSignature = useMemo(
    () => currentFront ? createFrontSnapshotSignature(currentFront) : null,
    [currentFront]
  );
  const frontNames = useMemo(
    () =>
      new Intl.ListFormat(language, {
        style: "long",
        type: "conjunction",
      }).format(frontingMembers.map((member) => member.name)),
    [frontingMembers, language]
  );
  const frontDisplayNames = useMemo(() => {
    if (frontingMembers.length <= 3) return frontNames;
    const visibleNames = new Intl.ListFormat(language, {
      style: "long",
      type: "conjunction",
    }).format(frontingMembers.slice(0, 2).map((member) => member.name));
    return t("home.frontNamesOverflow", {
      names: visibleNames,
      count: frontingMembers.length - 2,
    });
  }, [frontNames, frontingMembers, language, t]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  function formatFrontDuration(startedAt: string): string {
    const started = new Date(startedAt).getTime();
    if (!Number.isFinite(started)) return "";
    const totalMinutes = Math.max(0, Math.floor((now - started) / 60_000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return "< 1m";
  }

  function formatStartTime(startedAt: string): string {
    return new Date(startedAt).toLocaleTimeString(language, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(timestamp: number): string {
    const value = new Intl.DateTimeFormat(language, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(timestamp);
    return value.charAt(0).toLocaleUpperCase(language) + value.slice(1);
  }

  function labelForTier(tier: FrontTier): string {
    switch (tier) {
      case "primary":
        return t("front.tierPrimary");
      case "cofront":
        return t("front.tierCofront");
      case "coconscious":
        return t("front.tierCoconscious");
      case "background":
        return t("front.tierBackground");
      case "guest":
        return t("front.tierGuest");
    }
  }

  async function toggleMember(memberId: string) {
    if (updating || !currentFront) return;
    selection();
    setUpdating(true);

    const newIds = frontingIds.filter((id) => id !== memberId);
    const memberTiers = Object.fromEntries(
      Object.entries(currentFront.memberTiers ?? {}).filter(([id]) =>
        newIds.includes(id)
      )
    ) as Record<string, FrontTier>;
    const optimistic =
      newIds.length === 0
        ? null
        : { ...currentFront, memberIds: newIds, memberTiers };

    try {
      await mutateFront(
        async () => {
          if (newIds.length === 0) {
            const response = await fetch("/api/front", {
              method: "DELETE",
              credentials: "same-origin",
              headers: currentFrontSignature
                ? { "x-front-expected-signature": currentFrontSignature }
                : undefined,
            });
            if (!response.ok) throw new Error("front_delete_failed");
            return null;
          }

          const response = await fetch("/api/front", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberIds: newIds,
              memberTiers,
              note: currentFront.note ?? undefined,
              expectedFrontId: currentFront.id,
              expectedFrontSignature: currentFrontSignature,
            }),
          });
          if (!response.ok) throw new Error("front_save_failed");
          const json = await response.json().catch(() => null);
          return json?.data ?? optimistic;
        },
        {
          optimisticData: optimistic,
          rollbackOnError: true,
          revalidate: true,
        }
      );
      void mutate(swrKeys.frontHistory);
    } catch {
      showToast(t("front.saveError"));
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
          const response = await fetch("/api/front", {
            method: "DELETE",
            credentials: "same-origin",
            headers: currentFrontSignature
              ? { "x-front-expected-signature": currentFrontSignature }
              : undefined,
          });
          if (!response.ok) throw new Error("front_end_failed");
          return null;
        },
        {
          optimisticData: null,
          rollbackOnError: true,
          revalidate: true,
        }
      );
      void mutate(swrKeys.frontHistory);
    } catch {
      showToast(t("front.endError"));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <header className="px-4 pb-4 pt-14">
        <time
          dateTime={new Date(now).toISOString()}
          className="text-footnote font-bold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {formatDate(now)}
        </time>
        <p className="mt-1 text-subheadline text-muted-foreground">
          {t("home.greeting", {
            name: systemName ?? t("home.defaultName"),
          })}
        </p>
      </header>

      <main className="space-y-6 px-4">
        <section
          className="solara-beacon overflow-hidden rounded-ios-lg"
          aria-labelledby="home-beacon-title"
        >
          <div className="px-4 pb-5 pt-4 text-center">
            <h1
              id="home-beacon-title"
              className="text-caption-1 font-bold uppercase tracking-[0.08em] text-muted-foreground"
            >
              {t("home.beaconLabel")}
            </h1>

            <div className="flex min-h-[154px] items-center justify-center py-5">
              {frontingMembers.length === 0 ? (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-[var(--ios-bg-tertiary)] text-muted-foreground">
                  <Sun size={34} strokeWidth={1.5} aria-hidden />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center"
                  aria-label={frontNames}
                >
                  {frontingMembers.slice(0, 3).map((member, index) => (
                    <div
                      key={member.id}
                      className={index > 0 ? "-ml-5" : undefined}
                      style={{ zIndex: frontingMembers.length - index }}
                    >
                      <MemberAvatar
                        member={member}
                        size={index === 0 ? 92 : 74}
                        emphasized
                      />
                    </div>
                  ))}
                  {frontingMembers.length > 3 && (
                    <span className="-ml-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-[var(--ios-bg-tertiary)] text-footnote font-bold text-foreground">
                      +{frontingMembers.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            {frontingMembers.length > 0 && currentFront ? (
              <>
                <h2 className="text-title-1 font-extrabold tracking-[-0.02em] text-foreground">
                  {frontDisplayNames}
                </h2>
                <p className="mt-1 text-subheadline text-muted-foreground">
                  {t("home.frontSince", {
                    time: formatStartTime(currentFront.startedAt),
                  })}
                  {" · "}
                  {t("home.frontDuration", {
                    duration: formatFrontDuration(currentFront.startedAt),
                  })}
                </p>
              </>
            ) : (
              <p className="text-headline font-bold text-foreground">
                {t("home.noOneFronting")}
              </p>
            )}
          </div>

          {frontingMembers.length > 0 && currentFront && (
            <div className="border-t border-border/70">
              {frontingMembers.map((member) => {
                const tier = currentFront.memberTiers?.[member.id];
                const tierConfig = tier ? TIER_CONFIG[tier] : null;
                return (
                  <div
                    key={member.id}
                    className="flex min-h-[58px] items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0"
                  >
                    <Link
                      href={`/members/${member.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-ios-xs"
                    >
                      <MemberAvatar member={member} size={38} />
                      <span className="min-w-0">
                        <span className="block truncate text-subheadline font-bold text-foreground">
                          {member.name}
                        </span>
                        {member.pronouns && (
                          <span className="block truncate text-caption-1 text-muted-foreground">
                            {member.pronouns}
                          </span>
                        )}
                      </span>
                    </Link>
                    {tier && tierConfig && (
                      <span
                        className="max-w-[112px] truncate rounded-full border px-2.5 py-1 text-caption-2 font-bold text-foreground"
                        style={{
                          background: `${tierConfig.color}20`,
                          borderColor: `${tierConfig.color}55`,
                        }}
                      >
                        {labelForTier(tier)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      disabled={updating}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-ios-red/10 hover:text-ios-red disabled:opacity-50"
                      title={t("front.removeMemberFront")}
                      aria-label={t("front.removeMemberFront")}
                    >
                      <X size={17} strokeWidth={2.25} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {currentFront?.note?.trim() && (
            <div className="border-t border-border/70 bg-[var(--ios-bg-tertiary)] px-4 py-4">
              <p className="text-caption-1 font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {t("home.frontNote")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-subheadline leading-6 text-foreground">
                {currentFront.note}
              </p>
            </div>
          )}

          <div className="grid gap-2 border-t border-border/70 p-3">
            <Link
              href="/front"
              onPointerDown={() => selection()}
              className="solara-pressable flex min-h-[56px] items-center justify-center gap-2 rounded-ios bg-ios-blue px-4 text-headline font-extrabold text-white shadow-ios-md"
            >
              <Hand size={20} aria-hidden />
              {t("home.passLight")}
            </Link>
            {frontingMembers.length > 0 && (
              <button
                type="button"
                onClick={endFront}
                disabled={updating}
                className="min-h-[44px] rounded-ios-xs px-4 text-subheadline font-bold text-ios-red disabled:opacity-50"
              >
                {t("front.endAll")}
              </button>
            )}
          </div>
        </section>

        <nav
          className="grid grid-cols-2 gap-3"
          aria-label={t("dashboard.quickNavigation")}
        >
          <Link
            href="/journal"
            className="solara-surface ios-press flex min-h-[54px] items-center justify-center gap-2 rounded-ios px-4 text-subheadline font-bold text-foreground"
          >
            <BookOpen size={19} className="text-ios-blue" aria-hidden />
            {t("journal.title")}
          </Link>
          <Link
            href="/front/history"
            className="solara-surface ios-press flex min-h-[54px] items-center justify-center gap-2 rounded-ios px-4 text-subheadline font-bold text-foreground"
          >
            <Clock size={19} className="text-ios-blue" aria-hidden />
            {t("nav.day")}
          </Link>
        </nav>

        <section aria-labelledby="home-summary-title">
          <div className="mb-2 flex items-center gap-3 px-1">
            <h2
              id="home-summary-title"
              className="text-footnote font-bold uppercase tracking-[0.08em] text-muted-foreground"
            >
              {t("home.summary")}
            </h2>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>
          <GlassCard padding="none" className="grid grid-cols-2 divide-x divide-y divide-border/60 overflow-hidden">
            <SummaryItem
              icon={Users}
              label={t("home.statMembers")}
              value={memberCount}
              href="/members"
            />
            <SummaryItem
              icon={Layers}
              label={t("home.statFronting")}
              value={frontingMembers.length}
              href="/front"
            />
            <SummaryItem
              icon={BookOpen}
              label={t("home.statEntries")}
              value={journalCount}
              href="/journal"
            />
            <SummaryItem
              icon={FileText}
              label={t("home.statNotes")}
              value={noteCount}
              href="/notes"
            />
            <div className="col-span-2 border-t border-border/60">
              <SummaryItem
                icon={UserPlus}
                label={t("home.statFriends")}
                value={friendCount}
                href="/friends"
              />
            </div>
          </GlassCard>
        </section>

        <section className="pb-4" aria-labelledby="home-recent-title">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <h2
                id="home-recent-title"
                className="truncate text-footnote font-bold uppercase tracking-[0.08em] text-muted-foreground"
              >
                {hasFrontHistory
                  ? t("home.recentlyFronted")
                  : t("home.recentMembers")}
              </h2>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>
            <Link
              href="/members"
              className="ml-3 min-h-[44px] flex-shrink-0 content-center px-1 text-subheadline font-bold text-ios-blue ios-press"
            >
              {t("common.seeAll")}
            </Link>
          </div>

          <GlassCard padding="none" className="overflow-hidden">
            {recentMembers.length === 0 ? (
              <Link
                href="/members/new"
                className="block min-h-[64px] p-5 text-center text-subheadline text-muted-foreground ios-press"
              >
                {t("home.noMembers")}
              </Link>
            ) : (
              recentMembers.map((member) => {
                const tags = parseStoredTags(member.tags);
                return (
                  <Link
                    key={member.id}
                    href={`/members/${member.id}`}
                    className="flex min-h-[64px] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0 ios-press"
                  >
                    <MemberAvatar member={member} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-bold text-foreground">
                        {member.name}
                      </span>
                      {(member.pronouns || tags.length > 0) && (
                        <span className="block truncate text-caption-1 text-muted-foreground">
                          {member.pronouns ?? tags.slice(0, 2).join(" · ")}
                        </span>
                      )}
                    </span>
                    {member.color && (
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ background: member.color }}
                        aria-hidden
                      />
                    )}
                  </Link>
                );
              })
            )}
          </GlassCard>
        </section>
      </main>
    </div>
  );
}
