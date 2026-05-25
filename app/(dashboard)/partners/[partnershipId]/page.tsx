"use client";

import useSWR from "swr";
import { ArrowLeft, Heart, Calendar, MessageSquare, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { apiFetcher } from "@/lib/swr";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Partnership = {
  partnershipId: string;
  relationshipLabel?: string | null;
  partneredSince?: string | null;
  anniversaryDate?: string | null;
  howWeMet?: string | null;
  other: {
    id: string;
    name: string;
    description?: string | null;
    avatarMode?: string;
    avatarEmoji?: string;
    avatarUrl?: string | null;
  };
};

export default function PartnershipDetailPage({
  params,
}: {
  params: { partnershipId: string };
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { data, isLoading } = useSWR<Partnership>(
    `/api/partners/${params.partnershipId}`,
    apiFetcher
  );

  function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(language === "pt-BR" ? "pt-BR" : language === "es" ? "es" : "en", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (isLoading) {
    return (
      <div className="px-4 pt-14">
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-32 rounded-ios-lg mb-4" />
        <Skeleton className="h-48 rounded-ios-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 pt-14 text-center">
        <p className="text-body text-muted-foreground">{t("partners.noPartners")}</p>
        <Link href="/partners" className="inline-block mt-4 text-ios-blue ios-press">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const { other } = data;

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center px-4 h-11">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("partners.title")}</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="pt-8 pb-5 px-4 flex flex-col items-center gap-3 bg-gradient-to-b from-ios-pink/10 to-transparent">
        {other.avatarMode === "url" && other.avatarUrl ? (
          <div className="w-28 h-28 rounded-full overflow-hidden shadow-ios-md border-2 border-ios-pink/30">
            <DynamicAvatarImage
              src={other.avatarUrl}
              alt={other.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-28 h-28 rounded-full bg-secondary flex items-center justify-center text-5xl shadow-ios-md">
            {other.avatarEmoji || "☀️"}
          </div>
        )}
        <div className="text-center">
          <h1 className="text-title-1 text-foreground">{other.name}</h1>
          {data.relationshipLabel && (
            <p className="text-subheadline text-ios-pink mt-1 font-semibold">
              <Heart size={14} className="inline mr-1" />
              {data.relationshipLabel}
            </p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="px-4 mb-5">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("partners.details")}
        </p>
        <GroupedSection>
          <GroupedRow
            label={t("partners.since")}
            value={formatDate(data.partneredSince)}
            icon={<Calendar size={18} />}
          />
          {data.anniversaryDate && (
            <GroupedRow
              label={t("partners.anniversary")}
              value={formatDate(data.anniversaryDate)}
              icon={<Heart size={18} />}
            />
          )}
          {data.howWeMet && (
            <div className="px-4 py-3">
              <p className="text-caption-1 text-muted-foreground mb-1">
                {t("partners.howWeMet")}
              </p>
              <p className="text-body text-foreground">{data.howWeMet}</p>
            </div>
          )}
        </GroupedSection>
      </div>

      {/* Shared features */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("partners.shared")}
        </p>
        <GroupedSection>
          <GroupedRow
            label={t("partners.sharedDiary")}
            icon={<MessageSquare size={18} />}
            chevron
            className="cursor-pointer"
          />
          <GroupedRow
            label={t("partners.milestones")}
            icon={<Heart size={18} />}
            chevron
            className="cursor-pointer"
          />
          <GroupedRow
            label={t("partners.bucketList")}
            icon={<ListChecks size={18} />}
            chevron
            className="cursor-pointer"
          />
        </GroupedSection>
      </div>

      <div className="px-4">
        <Link
          href={`/systems/${other.id}`}
          className="block w-full text-center py-3 rounded-ios-md bg-secondary ios-press text-body font-semibold text-foreground"
        >
          {t("partners.viewProfile")}
        </Link>
      </div>
    </div>
  );
}
