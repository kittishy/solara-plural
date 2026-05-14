'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { localizePathname, stripLanguageFromPathname } from '@/lib/i18n';
import { SCANLINE_BG } from '@/lib/styles';

type IconProps = { size?: number };

function IconHome({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconMembers({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconPartners({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconCalendar({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function IconNotes({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconFriends({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="7" r="3" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h3" />
      <line x1="19" y1="10" x2="19" y2="16" />
      <line x1="16" y1="13" x2="22" y2="13" />
    </svg>
  );
}

function IconJournal({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" x2="15" y1="8" y2="8" />
      <line x1="9" x2="15" y1="12" y2="12" />
    </svg>
  );
}

function IconBell({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    </svg>
  );
}

function IconSettings({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconLogout({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

const navItems = [
  { href: '/', labelKey: 'nav.home', Icon: IconHome, systemOnly: false },
  { href: '/members', labelKey: 'nav.members', Icon: IconMembers, systemOnly: true },
  { href: '/partners', labelKey: 'nav.partners', Icon: IconPartners, systemOnly: false },
  { href: '/front/history', labelKey: 'nav.frontHistory', Icon: IconCalendar, systemOnly: true },
  { href: '/notes', labelKey: 'nav.notes', Icon: IconNotes, systemOnly: false },
  { href: '/journal', labelKey: 'nav.journal', Icon: IconJournal, systemOnly: false },
  { href: '/friends', labelKey: 'nav.friends', Icon: IconFriends, systemOnly: false },
  { href: '/notifications', labelKey: 'nav.notifications', Icon: IconBell, systemOnly: false },
  { href: '/settings', labelKey: 'nav.settings', Icon: IconSettings, systemOnly: false },
] as const;

const SIDEBAR_SYMBOLS = ['☀️', '🌙', '⭐', '🌸', '💜', '✨', '🪷', '🌿', '🫧', '🧭'] as const;
const SIDEBAR_SYMBOL_STORAGE = 'solara.sidebar.symbol';

interface SidebarProps {
  systemName?: string;
  accountType?: 'system' | 'singlet';
}

export function Sidebar({ systemName, accountType = 'system' }: SidebarProps) {
  const pathname = usePathname();
  const activePathname = stripLanguageFromPathname(pathname);
  const { language, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarSymbol, setSidebarSymbol] = useState<string>('☀️');
  const brandMenuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_SYMBOL_STORAGE);
      if (stored && SIDEBAR_SYMBOLS.includes(stored as (typeof SIDEBAR_SYMBOLS)[number])) {
        setSidebarSymbol(stored);
      }
    } catch {
      // Local storage is optional.
    }

  }, []);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (!brandMenuRef.current) return;
      if (!brandMenuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    }

    if (menuOpen) {
      document.addEventListener('mousedown', onOutsideClick);
      document.addEventListener('keydown', onKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', onOutsideClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function setSymbol(symbol: string) {
    setSidebarSymbol(symbol);
    try {
      localStorage.setItem(SIDEBAR_SYMBOL_STORAGE, symbol);
    } catch {
      // Local storage is optional.
    }
  }

  // Settings is pulled out of the center nav into the right action area.
  const centerNavItems = navItems.filter(
    (item) => item.href !== '/settings' && (accountType === 'system' || !item.systemOnly),
  );
  const settingsItem = navItems.find(
    (item) => item.href === '/settings' && (accountType === 'system' || !item.systemOnly),
  );
  const isSettingsActive = activePathname.startsWith('/settings');

  return (
    <header
      className="hidden md:flex fixed top-0 left-0 right-0 z-20 h-14 items-center border-b-2 border-border-strong"
      style={{
        background: 'var(--theme-surface)',
        backgroundImage: SCANLINE_BG,
        boxShadow:
          '0 2px 0 rgb(var(--theme-primary-rgb) / 0.25), inset 0 -1px 0 rgb(var(--theme-border-strong-rgb))',
      }}
    >
      {/* LEFT: brand button + dropdown */}
      <div ref={brandMenuRef} className="relative flex-shrink-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex h-14 items-center gap-2.5 px-4 transition-colors duration-150 hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
        >
          <span className="text-lg drop-shadow-[0_0_10px_rgba(244,114,182,0.5)]">{sidebarSymbol}</span>
          <div className="min-w-0">
            <p className="text-lg font-black tracking-tight leading-none text-text">
              <span className="text-primary text-xs font-black mr-1">{'// '}</span>
              SOLARA<span className="text-primary">.</span>
            </p>
            {systemName && (
              <p className="max-w-[120px] truncate text-[9px] font-black uppercase tracking-[0.2em] text-muted mt-0.5">
                {systemName}
              </p>
            )}
          </div>
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label={t('nav.systemMenu')}
            className="absolute left-0 top-full mt-1 z-30 w-64 space-y-4 border-2 border-border-strong bg-surface p-3 shadow-card-float animate-slide-up"
            style={{
              backgroundImage: SCANLINE_BG,
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
            }}
          >
            {/* Corner ornament */}
            <span className="pointer-events-none absolute top-0 right-0 block w-3 h-3 border-t-2 border-r-2 border-primary" aria-hidden="true" />

            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted">{t('nav.sidebarSymbol')}</p>
              <div className="flex flex-wrap gap-2">
                {SIDEBAR_SYMBOLS.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => setSymbol(symbol)}
                    className={`h-9 w-9 border text-lg transition-all duration-150 rounded-none ${
                      sidebarSymbol === symbol
                        ? 'scale-110 border-primary bg-primary/20'
                        : 'border-border bg-surface-alt hover:bg-surface-alt hover:border-border-strong'
                    }`}
                    aria-label={`Use ${symbol} as sidebar symbol`}
                    aria-pressed={sidebarSymbol === symbol}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-muted">{t('nav.themePreset')}</p>
              <Link
                href={`${localizePathname('/settings', language)}#appearance`}
                className="block px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:bg-surface-alt hover:text-text"
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.appearanceSettings')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 h-6 w-px flex-shrink-0 bg-border-strong" aria-hidden="true" />

      {/* CENTER: nav items */}
      <nav className="flex flex-1 items-center gap-1 overflow-x-auto" aria-label={t('nav.primary')}>
        {centerNavItems.map((item) => {
          const isActive =
            item.href === '/'
              ? activePathname === '/'
              : activePathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={localizePathname(item.href, language)}
              prefetch={true}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                isActive
                  ? 'bg-primary text-bg shadow-glow'
                  : 'text-muted hover:text-text hover:bg-surface-alt'
              }`}
              style={isActive ? {
                clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
              } : undefined}
            >
              <span className="flex-shrink-0">
                <item.Icon size={15} />
              </span>
              {t(item.labelKey)}
              {isActive && (
                <span
                  className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-glow"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* RIGHT: Settings (only when visible for this accountType) + Logout */}
      <div className="flex flex-shrink-0 items-center gap-1 px-3">
        {settingsItem && (
          <Link
            href={localizePathname('/settings', language)}
            prefetch={true}
            aria-current={isSettingsActive ? 'page' : undefined}
            aria-label={t(settingsItem.labelKey)}
            className={`flex h-9 w-9 items-center justify-center transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
              isSettingsActive
                ? 'bg-primary text-bg shadow-glow'
                : 'text-muted hover:text-text hover:bg-surface-alt'
            }`}
            style={isSettingsActive ? {
              clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
            } : undefined}
          >
            <IconSettings size={17} />
          </Link>
        )}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: localizePathname('/login', language) })}
          aria-label={t('nav.signOut')}
          className="flex h-9 w-9 items-center justify-center text-error/60 transition-all duration-150 hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/60"
        >
          <IconLogout size={17} />
        </button>
      </div>
    </header>
  );
}
