"use client";

import useSWR, { mutate } from "swr";
import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import { Plus, Search, Minus, Sun, X, Users } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { LargeTitle } from "@/components/layout/NavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useViewTransitionRouter, HERO_AVATAR } from "@/lib/view-transition";
import { useHaptics } from "@/lib/haptics";
import { createFrontSnapshotSignature, type FrontTier } from "@/lib/front";
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
    swrKeys.members,
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const { data: currentFront } = useSWR<FrontEntry | null>(swrKeys.front, apiFetcher);

  const [search, setSearch] = useState("");
  const [frontFilter, setFrontFilter] = useState<"all" | "front">("all");
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
  const currentFrontSignature = useMemo(
    () => currentFront ? createFrontSnapshotSignature(currentFront) : null,
    [currentFront]
  );
  const selectedIsFronting = selectedMember ? frontingSet.has(selectedMember.id) : false;

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
    void mutate(swrKeys.front);
    void mutate(swrKeys.frontHistory);
  }, []);

  function handleFrontConflict(response: Response) {
    if (response.status !== 409) return false;
    revalidateAfterFrontChange();
    closeSheet();
    showToast(t("front.editConflict"));
    return true;
  }

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
      const response = await fetch("/api/front", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          frontContextFor([...frontingIds, selectedMember.id])
        ),
      });
      if (handleFrontConflict(response)) return;
      if (!response.ok) throw new Error("front_save_failed");
      revalidateAfterFrontChange();
      closeSheet();
    } catch {
      showToast(t("front.saveError"));
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
        const response = await fetch("/api/front", {
          method: "DELETE",
          credentials: "same-origin",
          headers: currentFrontSignature
            ? { "x-front-expected-signature": currentFrontSignature }
            : undefined,
        });
        if (handleFrontConflict(response)) return;
        if (!response.ok) throw new Error("front_delete_failed");
      } else {
        const response = await fetch("/api/front", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(frontContextFor(newIds)),
        });
        if (handleFrontConflict(response)) return;
        if (!response.ok) throw new Error("front_save_failed");
      }
      revalidateAfterFrontChange();
      closeSheet();
    } catch {
      showToast(t("front.saveError"));
    } finally {
      setUpdating(false);
    }
  }

  async function setAsOnly() {
    if (!selectedMember || updating) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/front", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(frontContextFor([selectedMember.id])),
      });
      if (handleFrontConflict(response)) return;
      if (!response.ok) throw new Error("front_save_failed");
      revalidateAfterFrontChange();
      closeSheet();
    } catch {
      showToast(t("front.saveError"));
    } finally {
      setUpdating(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allMembers.filter(
      (m) =>
        (frontFilter === "all" || frontingSet.has(m.id)) &&
        (!q ||
        m.name?.toLowerCase().includes(q) ||
        m.pronouns?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.tags.some((tag) => tag.toLowerCase().includes(q)))
    );
  }, [allMembers, frontFilter, frontingSet, search]);

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-3 flex items-end justify-between">
        <div>
          <LargeTitle className="px-0 pb-1">{t("members.title")}</LargeTitle>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? allMembers.length} {t("home.statMembers")}
            {" · "}
            {frontingIds.length} {t("home.statFronting")}
          </p>
        </div>
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

      <div
        className="mx-4 mb-4 grid grid-cols-2 gap-1 rounded-full border border-border bg-secondary/50 p-1"
        aria-label={t("members.title")}
        role="group"
      >
        <button
          type="button"
          onClick={() => setFrontFilter("all")}
          aria-pressed={frontFilter === "all"}
          className={cn(
            "min-h-11 rounded-full px-4 text-sm font-bold transition-colors",
            frontFilter === "all"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("common.all")}
        </button>
        <button
          type="button"
          onClick={() => setFrontFilter("front")}
          aria-pressed={frontFilter === "front"}
          className={cn(
            "min-h-11 rounded-full px-4 text-sm font-bold transition-colors",
            frontFilter === "front"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("front.currentlyFronting")}
        </button>
      </div>

      {/* List */}
      <div className="px-4">
        <div className="flex flex-col gap-2.5">
          {error && !data ? (
            <div className="rounded-ios-lg border border-border bg-card">
              <ErrorState onRetry={() => mutateMembers()} retrying={isValidating} />
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-ios-lg border border-border bg-card px-4 py-3"
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
            <div className="rounded-ios-lg border border-border bg-card">
              <EmptyState
                icon={Users}
                title={
                  search
                    ? t("members.noMembersFound")
                    : frontFilter === "front"
                      ? t("members.noFronting")
                      : t("members.noMembers")
                }
                description={
                  search || frontFilter === "front"
                    ? undefined
                    : t("members.emptyDescription")
                }
                action={
                  !search && frontFilter === "front" ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/front">
                        <Sun size={16} />
                        {t("home.passLight")}
                      </Link>
                    </Button>
                  ) : !search ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/members/new">
                        <Plus size={16} />
                        {t("members.addMember")}
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            filtered.map((member) => {
              const isFronting = frontingSet.has(member.id);
              return (
                <div
                  key={member.id}
                  className="flex min-h-[68px] items-center overflow-hidden rounded-ios-lg border border-border bg-card shadow-ios dark:shadow-ios-dark [content-visibility:auto] [contain-intrinsic-size:68px]"
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
                      {(member.pronouns || member.role) && (
                        <p className="text-caption-1 text-muted-foreground truncate">
                          {[member.pronouns, member.role].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {member.tags.length > 0 && (
                        <div className="mt-1.5 flex gap-1.5 overflow-hidden">
                          {member.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="max-w-28 truncate rounded-full border px-2 py-0.5 text-xs font-semibold text-foreground"
                              style={{
                                borderColor: member.color ? `${member.color}4d` : "hsl(var(--border))",
                                background: member.color ? `${member.color}1f` : "hsl(var(--secondary))",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isFronting && (
                      <div
                        className="rounded-full border px-2 py-1 text-xs font-bold text-foreground"
                        style={{
                          borderColor: member.color ? `${member.color}4d` : "hsl(var(--border))",
                          background: member.color ? `${member.color}1f` : "hsl(var(--secondary))",
                        }}
                      >
                        {t("front.title")}
                      </div>
                    )}
                  </Link>

                  {/* Front action button */}
                  <button
                    onClick={(e) => openSheet(e, member)}
                    aria-label={t("front.addToFront")}
                    className={cn(
                      "flex-shrink-0 mr-2 w-11 h-11 rounded-full flex items-center justify-center ios-transition",
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
        </div>
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
