"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Eye, UserCheck } from "lucide-react";
import { GlassCard, GroupedSection, GroupedRow } from "@/components/glass/GlassCard";

export default function PrivacySettingsPage() {
  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center px-4 h-11">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">Config</span>
          </Link>
          <h1 className="text-headline font-semibold absolute left-1/2 -translate-x-1/2">
            Privacidade
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        <GlassCard padding="lg">
          <div className="flex items-start gap-3">
            <Shield size={24} className="text-ios-blue flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-headline font-semibold text-foreground mb-1">
                Seus dados são privados
              </h2>
              <p className="text-subheadline text-muted-foreground">
                Por padrão, seus membros, fronting e notas só são visíveis para você.
                Você pode compartilhar individualmente com amigos e parceiros.
              </p>
            </div>
          </div>
        </GlassCard>

        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Controles
          </p>
          <GroupedSection>
            <GroupedRow
              label="Visibilidade de membros"
              icon={<Eye size={18} />}
              value="Por amigo"
              chevron
              className="cursor-pointer"
            />
            <GroupedRow
              label="Quem pode me adicionar"
              icon={<UserCheck size={18} />}
              value="Por e-mail"
              chevron
              className="cursor-pointer"
            />
          </GroupedSection>
          <p className="text-caption-1 text-muted-foreground mt-2 px-1">
            Configure o compartilhamento de cada membro na página de amigos.
          </p>
        </div>
      </div>
    </div>
  );
}
