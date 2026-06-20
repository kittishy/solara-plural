"use client";

import { useEffect, useState } from "react";
import { RotateCw, RefreshCw } from "lucide-react";
import {
  type Language,
  type TranslationKey,
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_KEY,
  translations,
  isLanguage,
  getLanguageFromPathname,
} from "@/lib/i18n";
import { isChunkLoadError, attemptChunkReload } from "@/lib/chunk-recovery";

// A self-contained error UI for the App Router error boundaries. It deliberately
// does NOT use React context (useLanguage/useTheme) — if a provider is what
// crashed, depending on it here would just throw again and re-blank the screen.
// Instead it resolves the language straight from the cookie / URL.

function detectLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const { language: pathLang } = getLanguageFromPathname(window.location.pathname);
  if (pathLang) return pathLang;
  for (const cookie of document.cookie.split(";")) {
    const [name, value] = cookie.trim().split("=");
    if (name === LANGUAGE_COOKIE_KEY && isLanguage(value)) return value;
  }
  return DEFAULT_LANGUAGE;
}

function translate(language: Language, key: TranslationKey): string {
  const parts = key.split(".");
  const read = (dict: Record<string, unknown> | undefined) => {
    let current: unknown = dict;
    for (const part of parts) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === "string" ? current : undefined;
  };
  const all = translations as Record<string, Record<string, unknown>>;
  return read(all[language]) ?? read(all[DEFAULT_LANGUAGE]) ?? key;
}

export function ErrorScreen({
  error,
  reset,
  withShell = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Reserve space for the dashboard tab bar so the buttons aren't hidden. */
  withShell?: boolean;
}) {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguage(detectLanguage());
    // A stale-deploy chunk failure is recoverable: reload once to fetch the
    // fresh build instead of stranding the user on this screen.
    if (isChunkLoadError(error)) {
      attemptChunkReload();
    }
    // Surface the real cause in logs/telemetry without exposing it in the UI.
    console.error("[error-boundary]", error);
  }, [error]);

  const t = (key: TranslationKey) => translate(language, key);

  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6 animate-fade-in"
      style={{
        minHeight: withShell
          ? "calc(100dvh - 128px)"
          : "100dvh",
      }}
    >
      <div className="w-16 h-16 rounded-full bg-ios-red/10 flex items-center justify-center mb-5">
        <RotateCw size={28} className="text-ios-red" strokeWidth={2.25} />
      </div>
      <h1 className="text-title-3 font-semibold text-foreground mb-2">
        {t("common.errorTitle")}
      </h1>
      <p className="text-subheadline text-muted-foreground max-w-xs mb-8">
        {t("common.errorBody")}
      </p>
      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <button
          type="button"
          onClick={reset}
          className="w-full h-12 rounded-ios-md bg-ios-blue text-white font-semibold text-body ios-press flex items-center justify-center gap-2"
        >
          <RotateCw size={17} strokeWidth={2.5} />
          {t("common.retry")}
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
          className="w-full h-12 rounded-ios-md bg-secondary text-foreground font-semibold text-body ios-press flex items-center justify-center gap-2"
        >
          <RefreshCw size={17} strokeWidth={2.5} />
          {t("common.reload")}
        </button>
      </div>
    </div>
  );
}
