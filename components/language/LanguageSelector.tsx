"use client";

import { useState } from "react";
import { Globe, Check } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div className={cn(className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-ios-sm glass text-subheadline text-foreground ios-transition ios-press select-none"
        aria-label={t("common.selectLanguage")}
      >
        <Globe size={15} className="text-ios-blue" />
        <span className="font-medium">{current.shortLabel}</span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t("settings.language")}>
        <div className="flex flex-col gap-1">
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-4 rounded-ios-lg ios-transition ios-press",
                  isActive ? "bg-ios-blue/10" : "bg-secondary active:bg-muted"
                )}
              >
                <div className="flex flex-col text-left">
                  <span className={cn("text-body font-semibold", isActive ? "text-ios-blue" : "text-foreground")}>
                    {lang.label}
                  </span>
                  <span className="text-caption-1 text-muted-foreground">
                    {lang.shortLabel}
                  </span>
                </div>
                {isActive && (
                  <Check size={18} className="text-ios-blue flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
