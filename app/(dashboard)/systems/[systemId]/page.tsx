"use client";

import useSWR from "swr";
import { ArrowLeft, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { apiFetcher } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";

type FriendSystemData = {
  id: string;
  name: string;
  description?: string | null;
  avatarMode?: string;
  avatarEmoji?: string;
  avatarUrl?: string | null;
  sharedMembers?: {
    id: string;
    name: string;
    pronouns?: string | null;
    color?: string | null;
    avatarUrl?: string | null;
  }[];
  currentFront?: { members: { id: string; name: string; avatarUrl?: string | null; color?: string | null }[] } | null;
};

export default function ExternalSystemPage({
  params,
}: {
  params: { systemId: string };
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { data, isLoading } = useSWR<FriendSystemData>(
    `/api/friends/${params.systemId}`,
    apiFetcher
  );

  if (isLoading) {
    return (
      <div className="px-4 pt-14">
        <Skeleton className="h-32 mb-4" />
        <Skeleton className="h-48 rounded-ios-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 pt-20 text-center">
        <p className="text-muted-foreground">{t("systems.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center px-4 h-11">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("common.back")}</span>
          </button>
        </div>
      </div>

      <div className="pt-8 pb-5 px-4 flex flex-col items-center gap-3">
        {data.avatarMode === "url" && data.avatarUrl ? (
          <div className="w-28 h-28 rounded-full overflow-hidden shadow-ios-md">
            <DynamicAvatarImage
              src={data.avatarUrl}
              alt={data.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-28 h-28 rounded-full bg-secondary flex items-center justify-center text-5xl shadow-ios-md">
            {data.avatarEmoji || "☀️"}
          </div>
        )}
        <h1 className="text-title-1 text-foreground">{data.name}</h1>
        {data.description && (
          <p className="text-body text-muted-foreground text-center max-w-xs">
            {data.description}
          </p>
        )}
      </div>

      {data.currentFront && data.currentFront.members.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("front.currentlyFronting")}
          </p>
          <GlassCard padding="none" className="overflow-hidden">
            {data.currentFront.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
              >
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
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
                <p className="flex-1 text-body font-semibold text-foreground truncate">
                  {m.name}
                </p>
                <Layers size={14} className="text-ios-green flex-shrink-0" />
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {data.sharedMembers && data.sharedMembers.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("systems.sharedMembers")}
          </p>
          <GlassCard padding="none" className="overflow-hidden">
            {data.sharedMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0"
              >
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
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
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-foreground truncate">
                    {m.name}
                  </p>
                  {m.pronouns && (
                    <p className="text-caption-1 text-muted-foreground truncate">
                      {m.pronouns}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
