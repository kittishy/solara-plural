"use client";

import { useState } from "react";
import { Globe, Check } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-ios-sm glass text-subheadline text-foreground ios-transition ios-press hover:brightness-105 select-none"
        aria-label="Selecionar idioma"
        aria-expanded={open}
      >
        <Globe size={15} className="text-ios-blue" />
        <span className="font-medium">{current.shortLabel}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Dropdown */}
          <div
            className="absolute top-full mt-2 left-0 z-50 min-w-[180px] rounded-ios-lg glass shadow-ios-md overflow-hidden animate-scale-in"
            role="listbox"
            aria-label="Idiomas disponíveis"
          >
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setLanguage(lang.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-4 py-3 text-left ios-transition",
                    "border-b border-border/50 last:border-0",
                    isActive
                      ? "text-ios-blue bg-ios-blue/5"
                      : "text-foreground hover:bg-muted/50 active:bg-muted"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-body font-medium">{lang.label}</span>
                    <span className="text-caption-1 text-muted-foreground">
                      {lang.shortLabel}
                    </span>
                  </div>
                  {isActive && (
                    <Check size={16} className="text-ios-blue flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
