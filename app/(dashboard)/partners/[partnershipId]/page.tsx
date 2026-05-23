"use client";

import useSWR from "swr";
import { ArrowLeft, Heart, Calendar, MessageSquare, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard, GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { apiFetcher } from "@/lib/swr";

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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PartnershipDetailPage({
  params,
}: {
  params: { partnershipId: string };
}) {
  const router = useRouter();
  const { data, isLoading } = useSWR<Partnership>(
    `/api/partners/${params.partnershipId}`,
    apiFetcher
  );

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
        <p className="text-body text-muted-foreground">Parceria não encontrada</p>
        <Link
          href="/partners"
          className="inline-block mt-4 text-ios-blue ios-press"
        >
          Voltar
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
            <span className="text-body">Parcerias</span>
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
          Detalhes
        </p>
        <GroupedSection>
          <GroupedRow
            label="Início da parceria"
            value={formatDate(data.partneredSince)}
            icon={<Calendar size={18} />}
          />
          {data.anniversaryDate && (
            <GroupedRow
              label="Aniversário"
              value={formatDate(data.anniversaryDate)}
              icon={<Heart size={18} />}
            />
          )}
          {data.howWeMet && (
            <div className="px-4 py-3">
              <p className="text-caption-1 text-muted-foreground mb-1">
                Como nos conhecemos
              </p>
              <p className="text-body text-foreground">{data.howWeMet}</p>
            </div>
          )}
        </GroupedSection>
      </div>

      {/* Actions */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Compartilhado
        </p>
        <GroupedSection>
          <GroupedRow
            label="Diário compartilhado"
            icon={<MessageSquare size={18} />}
            chevron
            className="cursor-pointer"
          />
          <GroupedRow
            label="Marcos importantes"
            icon={<Heart size={18} />}
            chevron
            className="cursor-pointer"
          />
          <GroupedRow
            label="Lista de desejos"
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
          Ver perfil do sistema
        </Link>
      </div>
    </div>
  );
}
