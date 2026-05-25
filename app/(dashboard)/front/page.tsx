"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { Clock, Plus, Check } from "lucide-react";
import Link from "next/link";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys, revalidateMembersAndFront } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

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
  startedAt: string | number | Date;
  endedAt?: string | number | Date | null;
  note?: string | null;
};

function formatTime(value: string | number | Date) {
  const d = new Date(value);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value: string | number | Date) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
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
  const { t } = useLanguage();
  const { data: currentFront, isLoading: loadingFront } = useSWR<FrontEntry | null>(
    swrKeys.front,
    apiFetcher
  );
  const { data: members, isLoading: loadingMembers } = useSWR<Member[]>(
    swrKeys.members,
    apiFetcher
  );
  const { data: historyData } = useSWR<FrontEntry[]>(
    swrKeys.frontHistory,
    apiFetcher
  );

  const [updating, setUpdating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const memberList = members ?? [];
  const memberById = new Map(memberList.map((m) => [m.id, m]));
  const frontingIds = currentFront ? currentFront.memberIds : [];
  const frontingSet = new Set(frontingIds);
  const history = historyData ?? [];

  async function toggleMember(memberId: string) {
    if (updating) return;
    setUpdating(true);
    try {
      const isFronting = frontingSet.has(memberId);
      const newIds = isFronting
        ? frontingIds.filter((id) => id !== memberId)
        : [...frontingIds, memberId];

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
      revalidateMembersAndFront();
      void mutate(swrKeys.frontHistory);
    } finally {
      setUpdating(false);
    }
  }

  async function endFront() {
    if (updating) return;
    setUpdating(true);
    try {
      await fetch("/api/front", { method: "DELETE", credentials: "same-origin" });
      revalidateMembersAndFront();
      void mutate(swrKeys.frontHistory);
      setSheetOpen(false);
    } finally {
      setUpdating(false);
    }
  }

  const isFronting = frontingIds.length > 0;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">{t("front.title")}</LargeTitle>
        <Button size="icon" className="mb-1" onClick={() => setSheetOpen(true)}>
          <Plus size={20} />
        </Button>
      </div>

      {/* Currently fronting */}
      <div className="px-4 mb-4">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("front.now")}
        </p>
        <GlassCard padding="none" className="overflow-hidden">
          {loadingFront ? (
            <div className="p-4 flex gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ) : !isFronting ? (
            <button
              onClick={() => setSheetOpen(true)}
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
                      {t("members.sinceTime", { time: formatTime(currentFront!.startedAt) })}
                    </p>
                  </div>
                  <Badge variant="success">{t("members.fronting")}</Badge>
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
              const memberNames = entry.memberIds
                .map((id) => memberById.get(id)?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
                >
                  <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-subheadline font-semibold text-foreground truncate">
                      {memberNames || "—"}
                    </p>
                    <p className="text-caption-1 text-muted-foreground">
                      {formatDate(entry.startedAt)} · {formatTime(entry.startedAt)}
                      {entry.endedAt && ` → ${formatTime(entry.endedAt)}`}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>

      {/* Member picker bottom sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("front.whoIsFronting")}
      >
        <div className="flex flex-col gap-3">
          {/* Selected count */}
          {frontingIds.length > 0 && (
            <p className="text-caption-1 text-ios-blue font-semibold text-center -mt-1">
              {frontingIds.length === 1
                ? t("front.selected", { n: frontingIds.length })
                : t("front.selectedPlural", { n: frontingIds.length })}
            </p>
          )}

          {/* Member list */}
          <div className="rounded-ios-lg overflow-hidden border border-border/50">
            {loadingMembers ? (
              <div className="p-4 flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : memberList.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <p className="text-body text-muted-foreground">{t("members.noMembers")}</p>
                <Link
                  href="/members/new"
                  onClick={() => setSheetOpen(false)}
                  className="text-subheadline text-ios-blue font-semibold ios-press"
                >
                  {t("front.createMemberFirst")}
                </Link>
              </div>
            ) : (
              memberList.map((m, idx) => {
                const isActive = frontingSet.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    disabled={updating}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 text-left ios-transition disabled:opacity-60",
                      idx < memberList.length - 1 && "border-b border-border/50",
                      isActive ? "bg-ios-blue/8" : "active:bg-muted/50"
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: m.color ? `${m.color}22` : "#8E8E9322" }}
                    >
                      {m.avatarUrl ? (
                        <DynamicAvatarImage
                          src={m.avatarUrl}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-subheadline font-semibold"
                          style={{ color: m.color ?? "#8E8E93" }}
                        >
                          {m.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-body font-semibold truncate", isActive ? "text-ios-blue" : "text-foreground")}>
                        {m.name}
                      </p>
                      {m.pronouns && (
                        <p className="text-caption-1 text-muted-foreground truncate">{m.pronouns}</p>
                      )}
                    </div>

                    {/* Check indicator */}
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ios-transition",
                        isActive
                          ? "bg-ios-blue"
                          : "border-2 border-border"
                      )}
                    >
                      {isActive && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* End front button */}
          {isFronting && (
            <Button
              variant="outline"
              className="w-full text-ios-red border-ios-red/30 hover:bg-ios-red/5 mt-1"
              onClick={endFront}
              disabled={updating}
            >
              {updating ? t("front.ending2") : t("front.endFront2")}
            </Button>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
