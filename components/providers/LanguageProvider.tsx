"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  type Language,
  type TranslationKey,
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_KEY,
  translations,
  getLanguageFromPathname,
  localizePathname,
  resolveInitialLanguage,
  interpolate,
} from "@/lib/i18n";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getNestedValue(obj: Record<string, unknown> | undefined, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: Language;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedLanguage, setLanguageState] =
    useState<Language>(initialLanguage);
  const language = resolveInitialLanguage(selectedLanguage, pathname);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      document.cookie = `${LANGUAGE_COOKIE_KEY}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      const bare = getLanguageFromPathname(pathname).pathnameWithoutLanguage;
      router.push(localizePathname(bare, lang));
    },
    [pathname, router]
  );

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>): string => {
      const langTranslations = (translations as Record<string, Record<string, unknown>>)[language];
      const fallback = (translations as Record<string, Record<string, unknown>>)[DEFAULT_LANGUAGE];
      const raw =
        getNestedValue(langTranslations, key) ??
        getNestedValue(fallback, key) ??
        key;
      return interpolate(raw, values);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
