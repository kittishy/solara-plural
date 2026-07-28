import { localizePathname, type Language } from "@/lib/i18n";

export function localizeNavigationHref(
  href: string,
  language: Language
): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const suffixIndex = [href.indexOf("?"), href.indexOf("#")]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const pathname =
    suffixIndex === undefined ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === undefined ? "" : href.slice(suffixIndex);

  return `${localizePathname(pathname || "/", language)}${suffix}`;
}
