'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  type Language,
  type TranslationKey,
  interpolate,
  isLanguage,
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

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Local storage is optional.
  }

  const browserLanguage = window.navigator.language;
  if (browserLanguage.startsWith('pt')) return 'pt-BR';
  if (browserLanguage.startsWith('es')) return 'es';
  return DEFAULT_LANGUAGE;
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
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguageState(readInitialLanguage());
  }, []);

  useEffect(() => {
    const htmlLang = LANGUAGES.find((item) => item.code === language)?.htmlLang ?? 'en';
    document.documentElement.lang = htmlLang;

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Local storage is optional.
    }
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
      setLanguage: setLanguageState,
      t,
      formatDate: (date, options) => normalizeDate(date).toLocaleDateString(language, options),
      formatTime: (date, options) => normalizeDate(date).toLocaleTimeString(language, options),
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}

