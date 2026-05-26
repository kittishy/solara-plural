"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Eye, UserCheck } from "lucide-react";
import { GlassCard, GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function PrivacySettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center px-4 h-11">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("settings.title")}</span>
          </Link>
          <h1 className="text-headline font-semibold absolute left-1/2 -translate-x-1/2">
            {t("settings.privacy")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        <GlassCard padding="lg">
          <div className="flex items-start gap-3">
            <Shield size={24} className="text-ios-blue flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-headline font-semibold text-foreground mb-1">
                {t("privacy.dataPrivate")}
              </h2>
              <p className="text-subheadline text-muted-foreground">
                {t("privacy.dataPrivateDesc")}
              </p>
            </div>
          </div>
        </GlassCard>

        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("privacy.controls")}
          </p>
          <GroupedSection>
            <GroupedRow
              label={t("privacy.memberVisibility")}
              icon={<Eye size={18} />}
              value={t("privacy.perFriend")}
              chevron
              className="cursor-pointer"
            />
            <GroupedRow
              label={t("privacy.whoCanAdd")}
              icon={<UserCheck size={18} />}
              value={t("privacy.byEmail")}
              chevron
              className="cursor-pointer"
            />
          </GroupedSection>
          <p className="text-caption-1 text-muted-foreground mt-2 px-1">
            {t("privacy.sharingHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
