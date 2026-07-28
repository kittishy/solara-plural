"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { localizeNavigationHref } from "./localized-href";

export { localizeNavigationHref } from "./localized-href";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const { language } = useLanguage();
  return <Link href={localizeNavigationHref(href, language)} {...props} />;
}
