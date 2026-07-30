"use client";

import useSWR, { mutate } from "swr";
import { useMemo, useRef, useState } from "react";
import { Clock, Plus, LoaderCircle, Pencil, Search, X } from "lucide-react";
import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { RolePicker } from "@/components/front/RolePicker";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/lib/haptics";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { createFrontSnapshotSignature, TIER_CONFIG, TIER_ORDER, type FrontTier } from "@/lib/front";
import {
  captureFrontDraftBase,
  createFrontDraftMutationPayload,
  type FrontDraftBase,
} from "@/lib/front-draft-base";
import { commitFrontMutationToCache } from "@/lib/front-mutation-cache";

type Member = {
  id: string;
  name: string;
  pronouns?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
};

type FrontEntry = {
  id: string;
  memberIds: string[];
  memberTiers: Record<string, FrontTier>;
  startedAt: string | number | Date;
  endedAt?: string | number | Date | null;
  note?: string | null;
};

function formatTime(value: string | number | Date, lang: string) {
  const d = new Date(value);
  return d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value: string | number | Date, lang: string) {
  const d = new Date(value);
  return d.toLocaleDateString(lang, { day: "numeric", month: "short" });
}

function MemberAvatar({ member, size = 12 }: { member: Member; size?: number }) {
  const sizeClass = size <= 10 ? "w-10 h-10" : "w-12 h-12";

  return (
    <div
      className={cn(sizeClass, "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0")}
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
          className="font-semibold"
          style={{
            color: member.color ?? "#8E8E93",
            fontSize: size <= 10 ? 14 : 16,
          }}
        >
          {member.name[0].toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function FrontPage() {
  const { t, language } = useLanguage();
  const {
    success,
    selection,
    warning,
    error: errorHaptic,
  } = useHaptics();
  const { showToast } = useToast();
  const { data: currentFront, isLoading: loadingFront, error: frontError, mutate: mutateFront, isValidating: frontValidating } = useSWR<FrontEntry | null>(
    swrKeys.front,
    apiFetcher
  );
  const { data: membersData, isLoading: loadingMembers } = useSWR<{ data: Member[] }>(
    swrKeys.members,
    apiFetcher
  );
  const { data: historyData } = useSWR<FrontEntry[]>(
    swrKeys.frontHistory,
    apiFetcher
  );

  const [updating, setUpdating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftMemberIds, setDraftMemberIds] = useState<string[]>([]);
  const [draftTiers, setDraftTiers] = useState<Record<string, FrontTier>>({});
  const [draftNote, setDraftNote] = useState("");
  const [draftBase, setDraftBase] = useState<FrontDraftBase | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  // Which member's role picker is open (null = closed).
  const [rolePickerFor, setRolePickerFor] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const memberList = useMemo(() => membersData?.data ?? [], [membersData]);
  const memberById = useMemo(
    () => new Map(memberList.map((member) => [member.id, member])),
    [memberList]
  );
  const frontingIds = useMemo(
    () => currentFront?.memberIds ?? [],
    [currentFront]
  );
  const frontingSet = useMemo(() => new Set(frontingIds), [frontingIds]);
  const currentTiers: Record<string, FrontTier> = currentFront?.memberTiers ?? {};
  const currentFrontSignature = useMemo(
    () => currentFront ? createFrontSnapshotSignature(currentFront) : null,
    [currentFront]
  );
  const history = historyData ?? [];
  const draftMemberSet = useMemo(
    () => new Set(draftMemberIds),
    [draftMemberIds]
  );
  const filteredMemberList = useMemo(() => {
    const query = memberQuery.trim().toLocaleLowerCase(language);
    if (!query) return memberList;
    return memberList.filter((member) =>
      [member.name, member.pronouns]
        .filter(Boolean)
        .some((value) =>
          value!.toLocaleLowerCase(language).includes(query)
        )
    );
  }, [language, memberList, memberQuery]);

  /**
   * Keep only the roles for members still in the front. Roles are opt-in, so
   * members without an explicit role stay role-less (no default is assigned).
   */
  function resolveTiers(ids: string[], existingTiers: Record<string, FrontTier>): Record<string, FrontTier> {
    const tiers: Record<string, FrontTier> = {};
    ids.forEach((id) => {
      if (existingTiers[id]) tiers[id] = existingTiers[id];
    });
    return tiers;
  }

  function openFrontEditor() {
    if (currentFront === undefined) return;
    selection();
    setDraftBase(captureFrontDraftBase(currentFront));
    setDraftMemberIds(frontingIds);
    setDraftTiers(resolveTiers(frontingIds, currentTiers));
    setDraftNote(currentFront?.note ?? "");
    setMemberQuery("");
    setSheetOpen(true);
  }

  function closeFrontEditor() {
    if (updating) return;
    setSheetOpen(false);
    setDraftBase(null);
  }

  function toggleDraftMember(memberId: string) {
    selection();
    setDraftMemberIds((ids) => {
      if (ids.includes(memberId)) {
        setDraftTiers((tiers) => {
          const next = { ...tiers };
          delete next[memberId];
          return next;
        });
        return ids.filter((id) => id !== memberId);
      }
      return [...ids, memberId];
    });
  }

  function setDraftRole(memberId: string, value: string) {
    setDraftTiers((tiers) => {
      const next = { ...tiers };
      if (value === "") delete next[memberId];
      else next[memberId] = value as FrontTier;
      return next;
    });
  }

  async function saveFrontDraft() {
    if (updating || submittingRef.current || !draftBase) return;
    if (draftMemberIds.length === 0) {
      showToast(t("front.noMemberSelected"));
      return;
    }

    submittingRef.current = true;
    setUpdating(true);
    try {
      const response = await fetch("/api/front", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          createFrontDraftMutationPayload(draftBase, {
            memberIds: draftMemberIds,
            memberTiers: resolveTiers(draftMemberIds, draftTiers),
            note: draftNote,
          })
        ),
      });
      if (response.status === 409) {
        await Promise.all([
          mutate(swrKeys.front),
          mutate(swrKeys.frontHistory),
        ]);
        setSheetOpen(false);
        setDraftBase(null);
        showToast(t("front.editConflict"));
        return;
      }
      await commitFrontMutationToCache<FrontEntry>(
        response,
        (snapshot) => mutateFront(snapshot, { revalidate: false })
      );
      void mutate(swrKeys.frontHistory);
      success();
      setSheetOpen(false);
      setDraftBase(null);
      showToast(
        t(currentFront ? "front.updated" : "front.started"),
        "success"
      );
    } catch {
      // A 409 means another device changed the front while this draft was
      // open. Always refresh server truth instead of repainting the stale
      // snapshot that the editor started with.
      await Promise.all([
        mutateFront(),
        mutate(swrKeys.frontHistory),
      ]);
      errorHaptic();
      showToast(t("front.saveError"));
    } finally {
      submittingRef.current = false;
      setUpdating(false);
    }
  }

  async function toggleMember(memberId: string) {
    if (updating) return;
    setUpdating(true);
    try {
      const isFronting = frontingSet.has(memberId);
      // Stepping forward to front = a confirming "success"; stepping back =
      // a lighter "selection" tick.
      if (isFronting) selection();
      else success();
      const newIds = isFronting
        ? frontingIds.filter((id) => id !== memberId)
        : [...frontingIds, memberId];

      if (newIds.length === 0) {
        const res = await fetch("/api/front", {
          method: "DELETE",
          credentials: "same-origin",
          headers: currentFrontSignature
            ? { "x-front-expected-signature": currentFrontSignature }
            : undefined,
        });
        if (res.status === 409) {
          await Promise.all([
            mutateFront(),
            mutate(swrKeys.frontHistory),
          ]);
          errorHaptic();
          showToast(t("front.editConflict"));
          return;
        }
        if (!res.ok) throw new Error("front_end_failed");
        await mutateFront(null, { revalidate: false });
      } else {
        const newTiers = resolveTiers(newIds, currentTiers);
        const res = await fetch("/api/front", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberIds: newIds,
            memberTiers: newTiers,
            note: currentFront?.note ?? "",
            expectedFrontId: currentFront?.id ?? null,
            expectedFrontSignature: currentFrontSignature,
          }),
        });
        if (res.status === 409) {
          await Promise.all([
            mutateFront(),
            mutate(swrKeys.frontHistory),
          ]);
          errorHaptic();
          showToast(t("front.editConflict"));
          return;
        }
        await commitFrontMutationToCache<FrontEntry>(
          res,
          (snapshot) => mutateFront(snapshot, { revalidate: false })
        );
      }
      void mutate(swrKeys.frontHistory);
      success();
      showToast(t("front.updated"), "success");
    } catch {
      errorHaptic();
      showToast(t("front.saveError"));
    } finally {
      setUpdating(false);
    }
  }

  /** Set (or clear, when tier is null) a member's role from the picker modal. */
  function setRole(memberId: string, tier: FrontTier | null) {
    if (updating || !frontingSet.has(memberId)) return;
    const newTiers = { ...currentTiers };
    if (tier === null) {
      delete newTiers[memberId];
    } else {
      newTiers[memberId] = tier;
    }
    void applyTiers(newTiers);
  }

  async function applyTiers(newTiers: Record<string, FrontTier>) {
    if (updating || !currentFront) return;
    setUpdating(true);
    const previous = currentFront;
    // Reflect the new roles immediately in the SWR cache. The GET /api/front
    // response is browser-cached for a few seconds, so a plain revalidation can
    // return the *old* roles — writing the truth into the cache directly keeps
    // successive edits building on fresh state instead of clobbering each other.
    await mutateFront(
      { ...currentFront, memberTiers: newTiers },
      { revalidate: false }
    );
    try {
      const res = await fetch("/api/front", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: frontingIds,
          memberTiers: newTiers,
          note: currentFront.note ?? "",
          expectedFrontId: currentFront.id,
          expectedFrontSignature: currentFrontSignature,
        }),
      });
      if (res.status === 409) {
        await Promise.all([
          mutateFront(),
          mutate(swrKeys.frontHistory),
        ]);
        errorHaptic();
        showToast(t("front.editConflict"));
        return;
      }
      await commitFrontMutationToCache<FrontEntry>(
        res,
        (snapshot) => mutateFront(snapshot, { revalidate: false })
      );
      void mutate(swrKeys.frontHistory);
      success();
      showToast(t("front.updated"), "success");
    } catch {
      await mutateFront(previous, { revalidate: false });
      errorHaptic();
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
      const res = await fetch("/api/front", {
        method: "DELETE",
        credentials: "same-origin",
        headers: currentFrontSignature
          ? { "x-front-expected-signature": currentFrontSignature }
          : undefined,
      });
      if (res.status === 409) {
        await Promise.all([
          mutate(swrKeys.front),
          mutate(swrKeys.frontHistory),
        ]);
        errorHaptic();
        showToast(t("front.editConflict"));
        return;
      }
      if (!res.ok) throw new Error("front_end_failed");
      await mutateFront(null, { revalidate: false });
      void mutate(swrKeys.frontHistory);
      success();
      setSheetOpen(false);
      setDraftBase(null);
      showToast(t("front.ended"), "success");
    } catch {
      errorHaptic();
      showToast(t("front.endError"));
    } finally {
      setUpdating(false);
    }
  }

  const isFronting = frontingIds.length > 0;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">{t("front.title")}</LargeTitle>
        <Button
          className="mb-1 min-h-11 px-4"
          onClick={openFrontEditor}
          disabled={currentFront === undefined}
          aria-label={t(currentFront ? "front.editFront" : "front.startFront")}
        >
          {currentFront === undefined ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : currentFront ? (
            <Pencil size={17} />
          ) : (
            <Plus size={18} />
          )}
          {t(currentFront ? "front.editFront" : "front.startFront")}
        </Button>
      </div>

      {/* Currently fronting */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">
            {t("front.now")}
          </p>
          {isFronting && (
            <button
              onClick={endFront}
              disabled={updating}
              className="min-h-11 px-2 text-subheadline text-ios-red font-semibold ios-press disabled:opacity-50"
            >
              {t("front.endAll")}
            </button>
          )}
        </div>
        <GlassCard padding="none" className="overflow-hidden">
          {frontError && !currentFront ? (
            <ErrorState onRetry={() => mutateFront()} retrying={frontValidating} />
          ) : loadingFront ? (
            <div className="p-4 flex gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ) : !isFronting ? (
            <button
              onClick={openFrontEditor}
              className="w-full py-10 flex flex-col items-center gap-2 active:bg-muted/40 ios-transition"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Plus size={20} className="text-muted-foreground" />
              </div>
              <p className="text-subheadline text-muted-foreground">
                {t("front.noOneFronting")}
              </p>
              <p className="text-caption-1 text-ios-blue font-semibold">
                {t("front.startFrontCta")}
              </p>
            </button>
          ) : (
            frontingIds.map((id) => {
              const m = memberById.get(id);
              if (!m) return null;
              return (
                  <div
                    key={id}
                    className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 last:border-0"
                  >
                    <MemberAvatar member={m} size={12} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground">{m.name}</p>
                      {m.pronouns && (
                        <p className="text-caption-1 text-muted-foreground">{m.pronouns}</p>
                      )}
                      <p className="text-caption-1 text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        {t("members.sinceTime", { time: formatTime(currentFront!.startedAt, language) })}
                      </p>
                      {/* Role badge — tap to open the role picker modal. Roles
                          are optional, so members without one show "Set role". */}
                      {currentTiers[id] ? (
                        <button
                          onClick={() => setRolePickerFor(id)}
                          disabled={updating}
                          className="min-h-11 -my-2 pr-2 text-caption-1 font-semibold mt-1 inline-flex items-center gap-1 ios-press disabled:opacity-50"
                          style={{ color: TIER_CONFIG[currentTiers[id]].color }}
                          title={t("front.chooseRole")}
                        >
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ background: TIER_CONFIG[currentTiers[id]].color }}
                          />
                          {t(TIER_CONFIG[currentTiers[id]].labelKey as Parameters<typeof t>[0])}
                        </button>
                      ) : (
                        <button
                          onClick={() => setRolePickerFor(id)}
                          disabled={updating}
                          className="min-h-11 -my-2 pr-2 text-caption-1 font-semibold mt-1 inline-flex items-center gap-1 text-muted-foreground ios-press disabled:opacity-50"
                          title={t("front.chooseRole")}
                        >
                          <Plus size={11} strokeWidth={2.5} />
                          {t("front.setRole")}
                        </button>
                      )}
                    </div>
                    <Badge variant="success">{t("members.fronting")}</Badge>
                    <button
                      onClick={() => toggleMember(id)}
                      disabled={updating}
                      className="w-11 h-11 -my-2 rounded-full flex items-center justify-center text-muted-foreground hover:text-ios-red hover:bg-ios-red/10 ios-transition disabled:opacity-50"
                      title={t("front.removeMemberFront")}
                      aria-label={t("front.removeMemberFront")}
                    >
                      <X size={15} strokeWidth={2.5} />
                    </button>
                  </div>
              );
            })
          )}
        </GlassCard>
      </div>

      {/* History */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">
            {t("front.history")}
          </p>
          <Link href="/front/history" className="text-subheadline text-ios-blue ios-press">
            {t("front.seeAll")}
          </Link>
        </div>
        <GlassCard padding="none" className="overflow-hidden">
          {history.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-subheadline">
              {t("front.noHistory")}
            </div>
          ) : (
            history.slice(0, 8).map((entry) => {
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                >
                  <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 mb-0.5">
                      {entry.memberIds.map((id) => {
                        const m = memberById.get(id);
                        const tier = ((entry as Record<string, unknown>).memberTiers as Record<string, FrontTier> | undefined)?.[id];
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 text-caption-1 font-semibold"
                            style={{ color: m?.color ?? "#8E8E93" }}
                          >
                            {tier && (
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full"
                                style={{ background: TIER_CONFIG[tier].color }}
                              />
                            )}
                            {m?.name ?? "—"}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-caption-1 text-muted-foreground">
                      {formatDate(entry.startedAt, language)} · {formatTime(entry.startedAt, language)}
                      {entry.endedAt && ` → ${formatTime(entry.endedAt, language)}`}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>

      {/* Front editor: choose everyone, edit every role and save once. */}
      <BottomSheet
        open={sheetOpen}
        onClose={closeFrontEditor}
        title={t(currentFront ? "front.editFront" : "front.startFront")}
      >
        <div className="flex flex-col gap-4">
          <section aria-labelledby="front-member-selection">
            <div className="mb-2 flex items-center justify-between">
              <h3
                id="front-member-selection"
                className="text-footnote font-bold uppercase tracking-wide text-muted-foreground"
              >
                {t("front.members")}
              </h3>
              <span className="text-caption-1 font-bold text-ios-blue">
                {draftMemberIds.length === 1
                  ? t("front.selected", { n: draftMemberIds.length })
                  : t("front.selectedPlural", { n: draftMemberIds.length })}
              </span>
            </div>
            <div className="relative mb-2">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder={t("front.searchPlaceholder")}
                  aria-label={t("front.searchMembers")}
                  className="pl-11"
                />
            </div>

            <div className="max-h-[42dvh] overflow-y-auto rounded-ios border border-border/70 overscroll-contain">
              {loadingMembers ? (
                <div className="flex flex-col gap-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-11 w-11 rounded-full" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : memberList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <p className="text-body text-muted-foreground">
                    {t("members.noMembers")}
                  </p>
                  <Link
                    href="/members/new"
                    onClick={() => setSheetOpen(false)}
                    className="text-subheadline font-semibold text-ios-blue ios-press"
                  >
                    {t("front.createMemberFirst")}
                  </Link>
                </div>
              ) : filteredMemberList.length === 0 ? (
                <p className="px-4 py-8 text-center text-subheadline text-muted-foreground">
                  {t("members.noMembersFound")}
                </p>
              ) : (
                filteredMemberList.map((member, index) => {
                  const selected = draftMemberSet.has(member.id);
                  const selectId = `front-role-${member.id}`;
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex min-h-[64px] w-full items-center ios-transition [content-visibility:auto] [contain-intrinsic-size:64px]",
                        index < filteredMemberList.length - 1 &&
                          "border-b border-border/60",
                        selected
                          ? "bg-ios-blue/10"
                          : "bg-transparent"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleDraftMember(member.id)}
                        className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left active:bg-muted/50"
                        aria-pressed={selected}
                        aria-label={t("front.toggleMember", {
                          name: member.name,
                        })}
                      >
                        <MemberAvatar member={member} size={10} />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-subheadline font-bold",
                              selected ? "text-ios-blue" : "text-foreground"
                            )}
                          >
                            {member.name}
                          </span>
                          {member.pronouns && (
                            <span className="block truncate text-caption-1 text-muted-foreground">
                              {member.pronouns}
                            </span>
                          )}
                        </span>
                        {!selected && (
                          <span
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-border"
                            aria-hidden
                          />
                        )}
                      </button>
                      {selected && (
                        <select
                          id={selectId}
                          value={draftTiers[member.id] ?? ""}
                          onChange={(event) =>
                            setDraftRole(member.id, event.target.value)
                          }
                          className={cn(
                            "mr-3 h-11 w-[126px] flex-shrink-0 rounded-ios-sm border border-border",
                            "bg-[var(--ios-bg-secondary)] px-2 text-sm font-semibold text-foreground",
                            "focus:ring-2 focus:ring-ios-blue/60"
                          )}
                          aria-label={t("front.roleFor", {
                            name: member.name,
                          })}
                        >
                          <option value="">{t("front.noRole")}</option>
                          {TIER_ORDER.map((tier) => (
                            <option key={tier} value={tier}>
                              {t(
                                TIER_CONFIG[tier]
                                  .labelKey as Parameters<typeof t>[0]
                              )}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <div>
            <label
              htmlFor="front-note"
              className="mb-2 block text-footnote font-bold uppercase tracking-wide text-muted-foreground"
            >
              {t("front.note")}
            </label>
            <textarea
              id="front-note"
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t("front.notePlaceholder")}
              className="w-full resize-none rounded-ios border border-border bg-[var(--ios-bg-secondary)] px-4 py-3 text-body text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ios-blue/60"
            />
          </div>

          <Button
            className="min-h-12 w-full"
            onClick={saveFrontDraft}
            disabled={updating || draftMemberIds.length === 0}
          >
            {updating
              ? t("common.saving")
              : t(currentFront ? "front.saveChanges" : "front.startFront")}
          </Button>

          {isFronting && (
            <Button
              variant="outline"
              className="min-h-12 w-full border-ios-red/30 text-ios-red hover:bg-ios-red/5"
              onClick={endFront}
              disabled={updating}
            >
              {updating ? t("front.ending2") : t("front.endFront2")}
            </Button>
          )}
        </div>
      </BottomSheet>

      {/* Role picker modal — choose between primary, co-front and more, or no role */}
      <RolePicker
        open={rolePickerFor !== null}
        onClose={() => setRolePickerFor(null)}
        memberName={rolePickerFor ? memberById.get(rolePickerFor)?.name : undefined}
        value={rolePickerFor ? currentTiers[rolePickerFor] ?? null : null}
        onSelect={(tier) => {
          if (rolePickerFor) setRole(rolePickerFor, tier);
        }}
      />
    </div>
  );
}
