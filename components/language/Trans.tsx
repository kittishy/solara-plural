"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

interface TransProps {
  k: TranslationKey;
  values?: Record<string, string | number>;
}

export function Trans({ k, values }: TransProps) {
  const { t } = useLanguage();
  return <>{t(k, values)}</>;
}
