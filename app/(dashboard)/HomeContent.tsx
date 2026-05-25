"use client";

import Link from "next/link";
import { Users, Layers, BookOpen, FileText, Heart, UserPlus } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { LargeTitle } from "@/components/layout/NavBar";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { parseStoredTags } from "@/lib/members/fields";

type FrontingMember = {
  id: string;
  name: string;
  pronouns: string | null;
  color: string | null;
  avatarUrl: string | null;
};

type RecentMember = {
  id: string;
  name: string;
  pronouns: string | null;
  color: string | null;
  avatarUrl: string | null;
  tags: string | null;
};

type Props = {
  systemName: string | undefined;
  memberCount: number;
  frontingCount: number;
  journalCount: number;
  noteCount: number;
  friendCount: number;
  partnerCount: number;
  frontingMembers: FrontingMember[];
  recentMembers: RecentMember[];
};

function MemberAvatar({ member, size = 40 }: { member: { name: string; color: string | null; avatarUrl: string | null }; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: member.color ? `${member.color}22` : "#8E8E9322" }}
    >
      {member.avatarUrl ? (
        <DynamicAvatarImage src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-semibold" style={{ color: member.color ?? "#8E8E93", fontSize: size * 0.4 }}>
          {member.name[0].toUpperCase()}
        </span>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, href }: { icon: React.ElementType; label: string; value: number; color: string; href: string }) {
  return (
    <Link href={href} className="block">
      <GlassCard padding="md" className="flex flex-col gap-2 ios-press ios-transition h-full">
        <div className="w-9 h-9 rounded-ios-sm flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className="text-title-2" style={{ color }}>{value}</p>
          <p className="text-caption-1 text-muted-foreground">{label}</p>
        </div>
      </GlassCard>
    </Link>
  );
}

export function HomeContent({
  systemName,
  memberCount,
  frontingCount,
  journalCount,
  noteCount,
  friendCount,
  partnerCount,
  frontingMembers,
  recentMembers,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {t("home.greeting", { name: systemName ?? t("home.defaultName") })}
        </p>
        <LargeTitle className="px-0">{t("nav.home")}</LargeTitle>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-5">
        <StatCard icon={Users} label={t("home.statMembers")} value={memberCount} color="#007AFF" href="/members" />
        <StatCard icon={Layers} label={t("home.statFronting")} value={frontingCount} color="#34C759" href="/front" />
        <StatCard icon={BookOpen} label={t("home.statEntries")} value={journalCount} color="#AF52DE" href="/journal" />
        <StatCard icon={FileText} label={t("home.statNotes")} value={noteCount} color="#FF9500" href="/notes" />
        <StatCard icon={UserPlus} label={t("home.statFriends")} value={friendCount} color="#5AC8FA" href="/friends" />
        <StatCard icon={Heart} label={t("home.statPartnerships")} value={partnerCount} color="#FF2D55" href="/partners" />
      </div>

      {/* Currently fronting */}
      <div className="px-4 mb-5">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("home.nowFronting")}
        </p>
        <GlassCard padding="none" className="overflow-hidden">
          {frontingMembers.length === 0 ? (
            <Link
              href="/front"
              className="block p-5 text-center text-muted-foreground text-subheadline active:bg-muted/30 ios-transition"
            >
              {t("home.noOneFronting")}
            </Link>
          ) : (
            frontingMembers.map((m) => (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition"
              >
                <MemberAvatar member={m} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-foreground truncate">{m.name}</p>
                  {m.pronouns && (
                    <p className="text-caption-1 text-muted-foreground truncate">{m.pronouns}</p>
                  )}
                </div>
                <Badge variant="success">{t("front.title")}</Badge>
              </Link>
            ))
          )}
        </GlassCard>
      </div>

      {/* Recent members */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">
            {t("home.recentMembers")}
          </p>
          <Link href="/members" className="text-subheadline text-ios-blue ios-press">
            {t("common.seeAll")}
          </Link>
        </div>
        <GlassCard padding="none" className="overflow-hidden">
          {recentMembers.length === 0 ? (
            <Link
              href="/members/new"
              className="block p-5 text-center text-muted-foreground text-subheadline active:bg-muted/30 ios-transition"
            >
              {t("home.noMembers")}
            </Link>
          ) : (
            recentMembers.map((m) => {
              const tags = parseStoredTags(m.tags);
              return (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 active:bg-muted/50 ios-transition"
                >
                  <MemberAvatar member={m} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">{m.name}</p>
                    {m.pronouns ? (
                      <p className="text-caption-1 text-muted-foreground truncate">{m.pronouns}</p>
                    ) : tags.length > 0 ? (
                      <p className="text-caption-1 text-muted-foreground truncate">
                        {tags.slice(0, 2).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  {m.color && (
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  )}
                </Link>
              );
            })
          )}
        </GlassCard>
      </div>
    </div>
  );
}
