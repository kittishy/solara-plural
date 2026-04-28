'use client';

import type { TranslationKey } from '@/lib/i18n';
import { useLanguage } from '@/components/providers/LanguageProvider';

export function Trans({
  k,
  values,
}: {
  k: TranslationKey;
  values?: Record<string, string | number>;
}) {
  const { t } = useLanguage();
  return <>{t(k, values)}</>;
}

