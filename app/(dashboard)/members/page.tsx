"use client";

import useSWR from "swr";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetcher, swrKeys } from "@/lib/swr";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Member = {
  id: string;
  name: string;
  pronouns?: string | null;
  role?: string | null;
  tags: string[];
  color?: string | null;
  avatarUrl?: string | null;
};

export default function MembersPage() {
  const { t } = useLanguage();
  const { data: members, isLoading } = useSWR<Member[]>(
    swrKeys.members,
    apiFetcher
  );
  const [search, setSearch] = useState("");

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
            filtered.map((member) => (
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition"
              >
                <div
                  className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{
                    background: member.color
                      ? `${member.color}22`
                      : "#8E8E9322",
                  }}
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
                <svg
                  width="8"
                  height="13"
                  viewBox="0 0 8 13"
                  fill="none"
                  className="text-muted-foreground/50 flex-shrink-0"
                >
                  <path
                    d="M1 1L7 6.5L1 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  );
}
