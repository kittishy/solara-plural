'use client';

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { stripLanguageFromPathname } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

// Minimal map: route prefix → translation key for the section name.
// Keeps the bar contextual without re-implementing breadcrumbs.
const SECTION_BY_PREFIX: Array<{ match: (p: string) => boolean; key: TranslationKey }> = [
  { match: (p) => p === '/', key: 'nav.home' },
  { match: (p) => p.startsWith('/members'), key: 'nav.members' },
  { match: (p) => p.startsWith('/notes'), key: 'nav.notes' },
  { match: (p) => p.startsWith('/front'), key: 'nav.frontHistory' },
  { match: (p) => p.startsWith('/chat'), key: 'nav.chat' },
  { match: (p) => p.startsWith('/journal'), key: 'nav.journal' },
  { match: (p) => p.startsWith('/friends'), key: 'nav.friends' },
  { match: (p) => p.startsWith('/partners'), key: 'nav.partners' },
  { match: (p) => p.startsWith('/notifications'), key: 'nav.notifications' },
  { match: (p) => p.startsWith('/settings'), key: 'nav.settings' },
  { match: (p) => p.startsWith('/systems'), key: 'nav.partners' },
];

/**
 * Thin sticky app shell for mobile (PWA).
 * - Honors env(safe-area-inset-top) so the status bar never overlaps content.
 * - Pure CSS, no JS work on scroll. Repaints only when the route label changes.
 * - Hidden on desktop (md+) where the sidebar already provides identity.
 */
export function MobileTopBar({ systemName }: { systemName?: string }) {
  const pathname = usePathname();
  const stripped = stripLanguageFromPathname(pathname);
  const { t } = useLanguage();

  const sectionKey = SECTION_BY_PREFIX.find((s) => s.match(stripped))?.key ?? 'nav.home';
  const sectionLabel = t(sectionKey);

  return (
    <header
      className="app-topbar md:hidden relative"
      role="banner"
      aria-label="App"
    >
      <span className="app-topbar__brand" aria-label="Solara Plural">
        <span className="app-topbar__brand-mark" aria-hidden="true" />
        <span>Solara</span>
      </span>

      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-subtle" aria-hidden="true">·</span>

      <span
        className="text-[10px] font-black uppercase tracking-[0.18em] text-muted truncate"
        aria-live="polite"
      >
        {sectionLabel}
      </span>

      {systemName ? (
        <span className="ml-auto text-[10px] font-black uppercase tracking-[0.18em] text-primary/80 truncate max-w-[40%]">
          {systemName}
        </span>
      ) : null}
    </header>
  );
}
