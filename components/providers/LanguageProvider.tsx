'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_KEY,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  type Language,
  type TranslationKey,
  getLanguageFromPathname,
  interpolate,
  isLanguage,
  localizePathname,
  normalizePreferredLanguage,
  translations,
} from '@/lib/i18n';

type TranslationValues = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLanguage(pathname?: string | null): Language {
  const pathLanguage = pathname ? getLanguageFromPathname(pathname).language : null;
  if (pathLanguage) return pathLanguage;

  if (typeof document !== 'undefined') {
    const cookieEntry = document.cookie
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${LANGUAGE_COOKIE_KEY}=`));
    const cookieValue = cookieEntry?.split('=')[1];
    const fromCookie = normalizePreferredLanguage(cookieValue);
    if (fromCookie) return fromCookie;
  }

  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Local storage is optional.
  }

  return normalizePreferredLanguage(window.navigator.language) ?? DEFAULT_LANGUAGE;
}

function getTranslation(language: Language, key: TranslationKey) {
  const segments = key.split('.');
  let value: unknown = translations[language];

  for (const segment of segments) {
    if (!value || typeof value !== 'object' || !(segment in value)) {
      value = translations[DEFAULT_LANGUAGE];
      for (const fallbackSegment of segments) {
        if (!value || typeof value !== 'object' || !(fallbackSegment in value)) return key;
        value = (value as Record<string, unknown>)[fallbackSegment];
      }
      break;
    }

    value = (value as Record<string, unknown>)[segment];
  }

  return typeof value === 'string' ? value : key;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [language, setLanguageState] = useState<Language>(() => readInitialLanguage(pathname));

  useEffect(() => {
    const pathLanguage = pathname ? getLanguageFromPathname(pathname).language : null;
    if (!pathLanguage || pathLanguage === language) return;
    setLanguageState(pathLanguage);
  }, [pathname, language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);

    const localizedPath = localizePathname(pathname ?? '/', nextLanguage);
    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    const nextUrl = currentSearch ? `${localizedPath}${currentSearch}` : localizedPath;
    router.replace(nextUrl);
  }, [pathname, router]);

  useEffect(() => {
    const htmlLang = LANGUAGES.find((item) => item.code === language)?.htmlLang ?? 'en';
    document.documentElement.lang = htmlLang;

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Local storage is optional.
    }

    document.cookie = `${LANGUAGE_COOKIE_KEY}=${encodeURIComponent(language)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    function t(key: TranslationKey, values?: TranslationValues) {
      return interpolate(getTranslation(language, key), values);
    }

    function normalizeDate(date: Date | string | number) {
      return date instanceof Date ? date : new Date(date);
    }

    return {
      language,
      setLanguage,
      t,
      formatDate: (date, options) => normalizeDate(date).toLocaleDateString(language, options),
      formatTime: (date, options) => normalizeDate(date).toLocaleTimeString(language, options),
    };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}

