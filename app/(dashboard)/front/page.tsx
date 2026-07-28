"use client";

import useSWR, { mutate } from "swr";
import { useMemo, useState } from "react";
import { Clock, Plus, Check, Search, X } from "lucide-react";
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
  const { success, selection, warning } = useHaptics();
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
  const [memberQuery, setMemberQuery] = useState("");
  // Which member's role picker is open (null = closed).
  const [rolePickerFor, setRolePickerFor] = useState<string | null>(null);

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
    selection();
    setDraftMemberIds(frontingIds);
    setDraftTiers(resolveTiers(frontingIds, currentTiers));
    setDraftNote(currentFront?.note ?? "");
    setMemberQuery("");
    setSheetOpen(true);
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
    if (updating) return;
    if (draftMemberIds.length === 0) {
      showToast(t("front.noMemberSelected"));
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch("/api/front", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: draftMemberIds,
          memberTiers: resolveTiers(draftMemberIds, draftTiers),
          note: draftNote,
          expectedFrontId: currentFront?.id ?? null,
          expectedFrontSignature: currentFrontSignature,
        }),
      });
      if (response.status === 409) {
        await Promise.all([
          mutate(swrKeys.front),
          mutate(swrKeys.frontHistory),
        ]);
        setSheetOpen(false);
        showToast(t("front.editConflict"));
        return;
      }
      if (!response.ok) throw new Error("front_save_failed");

      const json = await response.json().catch(() => null);
      if (!json?.success || !json.data) throw new Error("front_save_failed");

      void mutate(swrKeys.front, json.data, { revalidate: false });
      void mutate(swrKeys.frontHistory);
      success();
      setSheetOpen(false);
    } catch {
      // A 409 means another device changed the front while this draft was
      // open. Always refresh server truth instead of repainting the stale
      // snapshot that the editor started with.
      void mutate(swrKeys.front);
      void mutate(swrKeys.frontHistory);
      showToast(t("front.saveError"));
    } finally {
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
          void mutate(swrKeys.front);
          void mutate(swrKeys.frontHistory);
          showToast(t("front.editConflict"));
          return;
        }
        if (!res.ok) showToast(t("front.endError"));
        else void mutate(swrKeys.front, null, { revalidate: false });
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
          void mutate(swrKeys.front);
          void mutate(swrKeys.frontHistory);
          showToast(t("front.editConflict"));
          return;
        }
        if (!res.ok) {
          showToast(t("front.saveError"));
        } else {
          // Write server truth into the cache (see applyTiers) so the short
          // browser cache on GET /api/front can't resurrect stale state.
          const json = await res.json().catch(() => null);
          if (json?.success && json.data) {
            void mutate(swrKeys.front, json.data, { revalidate: false });
          }
        }
      }
      void mutate(swrKeys.frontHistory);
    } catch {
      showToast(t("front.saveError"));
    } finally {
      setUpdating(false);
    }
  }

  /** Set (or clear, when tier is null) a member's role from the picker modal. */
  function setRole(memberId: string, tier: FrontTier | null) {
    if (!frontingSet.has(memberId)) return;
    const newTiers = { ...currentTiers };
    if (tier === null) {
      delete newTiers[memberId];
    } else {
      newTiers[memberId] = tier;
    }
    applyTiers(newTiers);
  }

  async function applyTiers(newTiers: Record<string, FrontTier>) {
    if (!currentFront) return;
    setUpdating(true);
    const previous = currentFront;
    // Reflect the new roles immediately in the SWR cache. The GET /api/front
    // response is browser-cached for a few seconds, so a plain revalidation can
    // return the *old* roles — writing the truth into the cache directly keeps
    // successive edits building on fresh state instead of clobbering each other.
    void mutate(swrKeys.front, { ...currentFront, memberTiers: newTiers }, { revalidate: false });
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
        void mutate(swrKeys.front);
        void mutate(swrKeys.frontHistory);
        showToast(t("front.editConflict"));
        return;
      }
      if (!res.ok) {
        showToast(t("front.saveError"));
        void mutate(swrKeys.front, previous, { revalidate: false });
        return;
      }
      const json = await res.json().catch(() => null);
      if (json?.success && json.data) {
        void mutate(swrKeys.front, json.data, { revalidate: false });
      }
    } catch {
      showToast(t("front.saveError"));
      void mutate(swrKeys.front, previous, { revalidate: false });
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
        void mutate(swrKeys.front);
        void mutate(swrKeys.frontHistory);
        showToast(t("front.editConflict"));
        return;
      }
      if (!res.ok) throw new Error("front_end_failed");
      void mutate(swrKeys.front, null, { revalidate: false });
      void mutate(swrKeys.frontHistory);
      setSheetOpen(false);
    } catch {
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
        <Button size="icon" className="mb-1" onClick={openFrontEditor} aria-label={t("front.startFront")}>
          <Plus size={20} />
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
              className="text-subheadline text-ios-red font-semibold ios-press disabled:opacity-50"
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
                          className="text-caption-1 font-semibold mt-1 inline-flex items-center gap-1 ios-press disabled:opacity-50"
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
                          className="text-caption-1 font-semibold mt-1 inline-flex items-center gap-1 text-muted-foreground ios-press disabled:opacity-50"
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
        onClose={() => setSheetOpen(false)}
        title={t("front.whoIsFronting")}
      >
        <div className="flex flex-col gap-4">
          {draftMemberIds.length > 0 && (
            <section aria-labelledby="selected-front-members">
              <div className="mb-2 flex items-center justify-between">
                <h3
                  id="selected-front-members"
                  className="text-footnote font-bold uppercase tracking-wide text-muted-foreground"
                >
                  {t("front.selectedMembers")}
                </h3>
                <span className="text-caption-1 font-bold text-ios-blue">
                  {draftMemberIds.length === 1
                    ? t("front.selected", { n: draftMemberIds.length })
                    : t("front.selectedPlural", { n: draftMemberIds.length })}
                </span>
              </div>

              <div className="overflow-hidden rounded-ios border border-border/70">
                {draftMemberIds.map((memberId) => {
                  const member = memberById.get(memberId);
                  if (!member) return null;
                  const selectId = `front-role-${memberId}`;
                  return (
                    <div
                      key={memberId}
                      className="flex min-h-[64px] items-center gap-3 border-b border-border/60 px-3 py-2 last:border-0"
                    >
                      <MemberAvatar member={member} size={10} />
                      <label
                        htmlFor={selectId}
                        className="min-w-0 flex-1 truncate text-subheadline font-bold text-foreground"
                      >
                        {member.name}
                      </label>
                      <select
                        id={selectId}
                        value={draftTiers[memberId] ?? ""}
                        onChange={(event) =>
                          setDraftRole(memberId, event.target.value)
                        }
                        className="h-11 max-w-[150px] rounded-ios-sm border border-border bg-[var(--ios-bg-secondary)] px-2 text-sm font-semibold text-foreground focus:ring-2 focus:ring-ios-blue/60"
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
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section aria-labelledby="front-member-selection">
            <h3 id="front-member-selection" className="sr-only">
              {t("front.memberSelection")}
            </h3>
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
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleDraftMember(member.id)}
                      className={cn(
                        "flex min-h-[64px] w-full items-center gap-3 px-3 py-2 text-left ios-transition [content-visibility:auto] [contain-intrinsic-size:64px]",
                        index < filteredMemberList.length - 1 &&
                          "border-b border-border/60",
                        selected
                          ? "bg-ios-blue/10"
                          : "active:bg-muted/50"
                      )}
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
                      <span
                        className={cn(
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                          selected
                            ? "bg-ios-blue text-white"
                            : "border-2 border-border"
                        )}
                        aria-hidden
                      >
                        {selected && <Check size={15} strokeWidth={3} />}
                      </span>
                    </button>
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
              ? currentFront
                ? t("front.switching")
                : t("front.starting")
              : t("home.passLight")}
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
