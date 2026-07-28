"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { localizeNavigationHref } from "./localized-href";

export function useLocalizedRouter() {
  const router = useRouter();
  const { language } = useLanguage();

  const push = useCallback(
    (href: string, options?: Parameters<typeof router.push>[1]) =>
      router.push(localizeNavigationHref(href, language), options),
    [language, router]
  );
  const replace = useCallback(
    (href: string, options?: Parameters<typeof router.replace>[1]) =>
      router.replace(localizeNavigationHref(href, language), options),
    [language, router]
  );
  const prefetch = useCallback(
    (href: string, options?: Parameters<typeof router.prefetch>[1]) =>
      router.prefetch(localizeNavigationHref(href, language), options),
    [language, router]
  );

  return useMemo(
    () => ({ ...router, push, replace, prefetch }),
    [prefetch, push, replace, router]
  );
}
