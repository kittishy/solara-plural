import { describe, it, expect } from 'vitest';
import { translations, SUPPORTED_LANGUAGES } from '@/lib/i18n';

/**
 * Guards against locale drift: every language must define exactly the same set
 * of translation keys as the default (English). A missing key silently falls
 * back to English at runtime, so this test is the safety net that keeps pt/es
 * complete as new strings are added.
 */
function keyPaths(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v) ? keyPaths(v, path) : [path];
  });
}

describe('i18n key parity', () => {
  const enKeys = new Set(keyPaths((translations as Record<string, unknown>).en));

  it('exposes a translation table for every supported language', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(translations, `missing translations for "${lang}"`).toHaveProperty(lang);
    }
  });

  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang === 'en') continue;
    it(`"${lang}" has the same keys as en (no missing, no extra)`, () => {
      const langKeys = new Set(keyPaths((translations as Record<string, unknown>)[lang]));
      const missing = [...enKeys].filter((k) => !langKeys.has(k));
      const extra = [...langKeys].filter((k) => !enKeys.has(k));
      expect(missing, `"${lang}" is missing keys`).toEqual([]);
      expect(extra, `"${lang}" has keys not in en`).toEqual([]);
    });
  }
});
