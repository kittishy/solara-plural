"use client";

import useSWR, { mutate } from "swr";
import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import { LoaderCircle, Plus, Search, Minus, Users } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useViewTransitionRouter, HERO_AVATAR } from "@/lib/view-transition";
import { useHaptics } from "@/lib/haptics";
import {
  createFrontSnapshotSignature,
  type FrontTier,
} from "@/lib/front";
import { commitFrontMutationToCache } from "@/lib/front-mutation-cache";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  pronouns?: string | null;
  role?: string | null;
  tags: string[];
  color?: string | null;
  avatarUrl?: string | null;
};

type FrontEntry = {
  id: string;
  memberIds: string[];
  memberTiers?: Record<string, FrontTier>;
  note?: string | null;
  startedAt: string | number | Date;
};

export default function MembersPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { push } = useViewTransitionRouter();
  const {
    selection,
    success,
    error: errorHaptic,
  } = useHaptics();

  // Navigate to a member with a shared-avatar morph: the tapped avatar grows
  // into the profile header. Falls back to instant nav on unsupported browsers.
  const openMember = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const hero = e.currentTarget.querySelector<HTMLElement>("[data-hero-avatar]");
      push(`/members/${id}`, { hero });
    },
    [push]
  );

  const { data, isLoading, error, mutate: mutateMembers, isValidating } = useSWR<{ data: Member[]; total: number }>(
    swrKeys.members,
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const { data: currentFront, mutate: mutateFront } = useSWR<FrontEntry | null>(
    swrKeys.front,
    apiFetcher
  );

  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const allMembers = useMemo(() => data?.data ?? [], [data]);

  const frontingSet = useMemo(
    () => new Set(currentFront?.memberIds ?? []),
    [currentFront]
  );
  const frontingIds = useMemo(
    () => currentFront?.memberIds ?? [],
    [currentFront]
  );
  const currentFrontSignature = useMemo(
    () => (currentFront ? createFrontSnapshotSignature(currentFront) : null),
    [currentFront]
  );
  const frontContextFor = useCallback(
    (memberIds: string[]) => ({
      memberIds,
      memberTiers: Object.fromEntries(
        Object.entries(currentFront?.memberTiers ?? {}).filter(([id]) =>
          memberIds.includes(id)
        )
      ),
      note: currentFront?.note ?? undefined,
      expectedFrontId: currentFront?.id ?? null,
      expectedFrontSignature: currentFrontSignature,
    }),
    [currentFront, currentFrontSignature]
  );

  const revalidateAfterFrontChange = useCallback(() => {
    void mutate(swrKeys.frontHistory);
  }, []);

  async function handleFrontConflict(response: Response) {
    if (response.status !== 409) return false;
    await mutateFront();
    void mutate(swrKeys.frontHistory);
    errorHaptic();
    showToast(t("front.editConflict"));
    return true;
  }

  async function toggleFrontMember(
    event: React.MouseEvent<HTMLButtonElement>,
    member: Member
  ) {
    event.stopPropagation();
    if (updating) return;
    selection();

    const wasFronting = frontingSet.has(member.id);
    const previousFront = currentFront ?? null;
    const nextMemberIds = wasFronting
      ? frontingIds.filter((id) => id !== member.id)
      : [...frontingIds, member.id];
    const nextTiers = Object.fromEntries(
      Object.entries(currentFront?.memberTiers ?? {}).filter(([id]) =>
        nextMemberIds.includes(id)
      )
    );
    const optimisticFront: FrontEntry | null =
      nextMemberIds.length === 0
        ? null
        : currentFront
          ? {
              ...currentFront,
              memberIds: nextMemberIds,
              memberTiers: nextTiers,
            }
          : {
              id: `optimistic-${member.id}`,
              memberIds: nextMemberIds,
              memberTiers: nextTiers,
              note: null,
              startedAt: new Date().toISOString(),
            };

    setUpdating(true);
    setUpdatingMemberId(member.id);
    await mutateFront(optimisticFront, { revalidate: false });

    try {
      if (nextMemberIds.length === 0) {
        const response = await fetch("/api/front", {
          method: "DELETE",
          credentials: "same-origin",
          headers: currentFrontSignature
            ? { "x-front-expected-signature": currentFrontSignature }
            : undefined,
        });
        if (await handleFrontConflict(response)) return;
        if (!response.ok) throw new Error("front_delete_failed");
        await mutateFront(null, { revalidate: false });
      } else {
        const response = await fetch("/api/front", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(frontContextFor(nextMemberIds)),
        });
        if (await handleFrontConflict(response)) return;
        await commitFrontMutationToCache<FrontEntry>(
          response,
          (snapshot) => mutateFront(snapshot, { revalidate: false })
        );
      }
      revalidateAfterFrontChange();
      success();
      showToast(
        t(
          wasFronting ? "front.removedMember" : "front.addedMember",
          { name: member.name }
        ),
        "success"
      );
    } catch {
      await mutateFront(previousFront, { revalidate: false });
      errorHaptic();
      showToast(t("front.saveError"));
    } finally {
      setUpdating(false);
      setUpdatingMemberId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allMembers;
    return allMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.pronouns?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [allMembers, search]);

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">{t("members.title")}</LargeTitle>
        <Button asChild size="icon" className="mb-1">
          <Link href="/members/new" aria-label={t("members.addMember")}>
            <Plus size={20} />
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 mb-4 relative">
        <Search
          size={16}
          className="absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          placeholder={t("members.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      <div className="px-4">
        <GlassCard padding="none" className="overflow-hidden">
          {error && !data ? (
            <ErrorState onRetry={() => mutateMembers()} retrying={isValidating} />
          ) : isLoading ? (
            <div className="p-4 flex flex-col gap-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
                >
                  <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? t("members.noMembersFound") : t("members.noMembers")}
              description={search ? undefined : t("members.emptyDescription")}
              action={
                !search ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/members/new">
                      <Plus size={16} />
                      {t("members.addMember")}
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            filtered.map((member) => {
              const isFronting = frontingSet.has(member.id);
              return (
                <div
                  key={member.id}
                  className="flex items-center border-b border-border/50 last:border-0 [content-visibility:auto] [contain-intrinsic-size:68px]"
                >
                  <Link
                    href={`/members/${member.id}`}
                    onClick={(e) => openMember(e, member.id)}
                    className="flex-1 flex items-center gap-3 px-4 py-3 active:bg-muted/50 ios-transition min-w-0 solara-pressable"
                    style={{ ["--press-scale" as string]: "0.99" }}
                  >
                    <div
                      data-hero-avatar
                      className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: member.color ? `${member.color}22` : "#8E8E9322" }}
                    >
                      {member.avatarUrl ? (
                        <DynamicAvatarImage
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-body font-semibold"
                          style={{ color: member.color ?? "#8E8E93" }}
                        >
                          {(member.name ?? "?")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground truncate">
                        {member.name}
                      </p>
                      {member.pronouns && (
                        <p className="text-caption-1 text-muted-foreground truncate">
                          {member.pronouns}
                        </p>
                      )}
                    </div>
                    {member.color && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: member.color }}
                      />
                    )}
                  </Link>

                  {/* Front action button */}
                  <button
                    onClick={(event) => toggleFrontMember(event, member)}
                    disabled={updating}
                    aria-label={t(
                      isFronting ? "front.removeFromFront" : "front.addToFront"
                    )}
                    className={cn(
                      "flex-shrink-0 mr-3 w-11 h-11 rounded-full flex items-center justify-center ios-transition",
                      isFronting
                        ? "bg-ios-green/20 text-ios-green"
                        : "bg-secondary text-muted-foreground",
                      updating && "disabled:opacity-50"
                    )}
                  >
                    {updatingMemberId === member.id ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : isFronting ? (
                      <Minus size={15} strokeWidth={2.5} />
                    ) : (
                      <Plus size={15} strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>

    </div>
  );
}
