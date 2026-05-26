"use client";

import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Plus, Search, Minus, Sun, X } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { useLanguage } from "@/components/providers/LanguageProvider";
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

const PAGE_SIZE = 60;

export default function MembersPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(0);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const { data, isLoading } = useSWR<{ data: Member[]; total: number }>(
    `/api/members?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const { data: currentFront } = useSWR<FrontEntry | null>(swrKeys.front, apiFetcher);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [updating, setUpdating] = useState(false);

  // Accumulate members as pages load. Page 0 replaces state; subsequent pages append.
  useEffect(() => {
    if (!data?.data) return;
    if (page === 0) {
      setAllMembers(data.data);
      return;
    }
    setAllMembers((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const newItems = data.data.filter((m) => !existingIds.has(m.id));
      return newItems.length > 0 ? [...prev, ...newItems] : prev;
    });
  }, [data, page]);

  const total = data?.total ?? 0;

  // Use SWR data directly for page 0 to avoid one-render flash on cache hit
  const displayMembers = page === 0 ? (data?.data ?? allMembers) : allMembers;
  // Only show skeleton on true first load (no data at all yet)
  const showSkeleton = isLoading && displayMembers.length === 0;

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
    setSelectedMember(member);
  }, []);

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
    if (!q) return displayMembers;
    return displayMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.pronouns?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [displayMembers, search]);

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
          {showSkeleton ? (
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
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <p className="text-muted-foreground text-subheadline">
                {search ? t("members.noMembersFound") : t("members.noMembers")}
              </p>
              {!search && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/members/new">
                    <Plus size={16} />
                    {t("members.addMember")}
                  </Link>
                </Button>
              )}
            </div>
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
                    className="flex-1 flex items-center gap-3 px-4 py-3 active:bg-muted/50 ios-transition min-w-0"
                  >
                    <div
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
          {!isLoading && displayMembers.length < total && (
            <div className="px-4 py-3 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setPage((p) => p + 1)}
              >
                {t("members.loadMore", { remaining: total - allMembers.length })}
              </Button>
            </div>
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
