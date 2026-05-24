"use client";

import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Plus, Search, Check } from "lucide-react";
import { useState } from "react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { apiFetcher, swrKeys, revalidateMembersAndFront } from "@/lib/swr";
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

export default function MembersPage() {
  const { t } = useLanguage();
  const { data: members, isLoading } = useSWR<Member[]>(swrKeys.members, apiFetcher);
  const { data: currentFront } = useSWR<FrontEntry | null>(swrKeys.front, apiFetcher);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const frontingIds = currentFront?.memberIds ?? [];
  const frontingSet = new Set(frontingIds);

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

  const list = members ?? [];
  const filtered = list.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2 flex items-end justify-between">
        <LargeTitle className="px-0">{t("members.title")}</LargeTitle>
        <Link href="/members/new">
          <Button size="icon" className="mb-1">
            <Plus size={20} />
          </Button>
        </Link>
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
          {isLoading ? (
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
                <Link href="/members/new">
                  <Button variant="outline" size="sm">
                    <Plus size={16} />
                    {t("members.addMember")}
                  </Button>
                </Link>
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
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSheetOpen(true); }}
                    aria-label={t("front.whoIsFronting")}
                    className={cn(
                      "flex-shrink-0 mr-3 w-8 h-8 rounded-full flex items-center justify-center ios-transition",
                      isFronting
                        ? "bg-ios-green text-white"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {isFronting ? <Check size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
                  </button>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>

      {/* Front picker sheet — same as front/page.tsx */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("front.whoIsFronting")}
      >
        <div className="flex flex-col gap-3">
          {frontingIds.length > 0 && (
            <p className="text-caption-1 text-ios-blue font-semibold text-center -mt-1">
              {frontingIds.length === 1
                ? t("front.selected", { n: frontingIds.length })
                : t("front.selectedPlural", { n: frontingIds.length })}
            </p>
          )}

          <div className="rounded-ios-lg overflow-hidden border border-border/50">
            {isLoading ? (
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
            ) : list.length === 0 ? (
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
              list.map((m, idx) => {
                const isActive = frontingSet.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    disabled={updating}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 text-left ios-transition disabled:opacity-60",
                      idx < list.length - 1 && "border-b border-border/50",
                      isActive ? "bg-ios-blue/8" : "active:bg-muted/50"
                    )}
                  >
                    <div
                      className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: m.color ? `${m.color}22` : "#8E8E9322" }}
                    >
                      {m.avatarUrl ? (
                        <DynamicAvatarImage src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-subheadline font-semibold" style={{ color: m.color ?? "#8E8E93" }}>
                          {m.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-body font-semibold truncate", isActive ? "text-ios-blue" : "text-foreground")}>
                        {m.name}
                      </p>
                      {m.pronouns && (
                        <p className="text-caption-1 text-muted-foreground truncate">{m.pronouns}</p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ios-transition",
                        isActive ? "bg-ios-blue" : "border-2 border-border"
                      )}
                    >
                      {isActive && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {frontingIds.length > 0 && (
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
