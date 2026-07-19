"use client";

import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Plus, Search, Minus, Sun, X, Users } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useViewTransitionRouter, HERO_AVATAR } from "@/lib/view-transition";
import { useHaptics } from "@/lib/haptics";
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

type FrontEntry = { memberIds: string[] };

export default function MembersPage() {
  const { t } = useLanguage();
  const { push } = useViewTransitionRouter();
  const { selection } = useHaptics();

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
    "/api/members?limit=500",
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const { data: currentFront } = useSWR<FrontEntry | null>(swrKeys.front, apiFetcher);

  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [updating, setUpdating] = useState(false);

  const allMembers = useMemo(() => data?.data ?? [], [data]);

  const frontingSet = useMemo(
    () => new Set(currentFront?.memberIds ?? []),
    [currentFront]
  );
  const frontingIds = useMemo(
    () => currentFront?.memberIds ?? [],
    [currentFront]
  );
  const selectedIsFronting = selectedMember ? frontingSet.has(selectedMember.id) : false;

  const revalidateAfterFrontChange = useCallback(() => {
    void mutate(swrKeys.front);
    void mutate(swrKeys.frontHistory);
  }, []);

  const openSheet = useCallback((e: React.MouseEvent, member: Member) => {
    e.stopPropagation();
    selection();
    setSelectedMember(member);
  }, [selection]);

  const closeSheet = useCallback(() => {
    setSelectedMember(null);
  }, []);

  async function addToFront() {
    if (!selectedMember || updating) return;
    setUpdating(true);
    try {
      await fetch("/api/front", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: [...frontingIds, selectedMember.id] }),
      });
      revalidateAfterFrontChange();
      closeSheet();
    } finally {
      setUpdating(false);
    }
  }

  async function removeFromFront() {
    if (!selectedMember || updating) return;
    setUpdating(true);
    try {
      const newIds = frontingIds.filter((id) => id !== selectedMember.id);
      if (newIds.length === 0) {
        await fetch("/api/front", { method: "DELETE", credentials: "same-origin" });
      } else {
        await fetch("/api/front", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIds: newIds }),
        });
      }
      revalidateAfterFrontChange();
      closeSheet();
    } finally {
      setUpdating(false);
    }
  }

  async function setAsOnly() {
    if (!selectedMember || updating) return;
    setUpdating(true);
    try {
      await fetch("/api/front", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: [selectedMember.id] }),
      });
      revalidateAfterFrontChange();
      closeSheet();
    } finally {
      setUpdating(false);
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
          <Link href="/members/new">
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
                  className="flex items-center border-b border-border/50 last:border-0"
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
                    onClick={(e) => openSheet(e, member)}
                    aria-label={t("front.addToFront")}
                    className={cn(
                      "flex-shrink-0 mr-3 w-8 h-8 rounded-full flex items-center justify-center ios-transition",
                      isFronting
                        ? "bg-ios-green/20 text-ios-green"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {isFronting
                      ? <Minus size={15} strokeWidth={2.5} />
                      : <Plus size={15} strokeWidth={2.5} />}
                  </button>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>

      {/* Per-member front action sheet */}
      <BottomSheet
        open={selectedMember !== null}
        onClose={closeSheet}
        title={selectedMember?.name ?? ""}
      >
        <div className="flex flex-col divide-y divide-border/50 rounded-ios-lg overflow-hidden border border-border/50">
          {/* Add / Remove from front */}
          {selectedIsFronting ? (
            <button
              onClick={removeFromFront}
              disabled={updating}
              className="flex items-center gap-4 px-4 py-4 text-left active:bg-muted/40 ios-transition disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-full bg-ios-red/15 flex items-center justify-center flex-shrink-0">
                <Minus size={18} className="text-ios-red" />
              </div>
              <span className="text-body font-medium text-ios-red">
                {t("front.removeFromFront")}
              </span>
            </button>
          ) : (
            <button
              onClick={addToFront}
              disabled={updating}
              className="flex items-center gap-4 px-4 py-4 text-left active:bg-muted/40 ios-transition disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-full bg-ios-blue/15 flex items-center justify-center flex-shrink-0">
                <Plus size={18} className="text-ios-blue" />
              </div>
              <span className="text-body font-medium text-ios-blue">
                {t("front.addToFront")}
              </span>
            </button>
          )}

          {/* Set as only front */}
          <button
            onClick={setAsOnly}
            disabled={updating}
            className="flex items-center gap-4 px-4 py-4 text-left active:bg-muted/40 ios-transition disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <Sun size={18} className="text-foreground" />
            </div>
            <span className="text-body font-medium text-foreground">
              {t("front.setAsOnly")}
            </span>
          </button>

          {/* No action */}
          <button
            onClick={closeSheet}
            className="flex items-center gap-4 px-4 py-4 text-left active:bg-muted/40 ios-transition"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <X size={18} className="text-muted-foreground" />
            </div>
            <span className="text-body font-medium text-muted-foreground">
              {t("front.noAction")}
            </span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
