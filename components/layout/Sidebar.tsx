'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  applySolaraTheme,
  DEFAULT_SOLARA_THEME,
  persistSolaraTheme,
  readStoredSolaraTheme,
  SOLARA_THEMES,
  type SolaraThemeId,
} from '@/lib/theme';

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

function IconFront({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v1m0 16v1M4.22 4.22l.71.71m14.14 14.14.71.71M3 12H4m16 0h1M4.22 19.78l.71-.71M18.36 5.64l.71-.71" />
      <circle cx="12" cy="12" r="4" />
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
      <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4Z" />
      <path d="M8 11c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4Z" />
      <path d="M8 13c-3 0-5 1.8-5 4v2h7" />
      <path d="M16 13c3 0 5 1.8 5 4v2h-7" />
      <path d="M12 15v6" />
      <path d="M9 18h6" />
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
  { href: '/', label: 'Home', Icon: IconHome },
  { href: '/members', label: 'Members', Icon: IconMembers },
  { href: '/front', label: 'Front', Icon: IconFront },
  { href: '/front/history', label: 'Front history', Icon: IconCalendar },
  { href: '/notes', label: 'Notes', Icon: IconNotes },
  { href: '/friends', label: 'Friends', Icon: IconFriends },
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

const SIDEBAR_SYMBOLS = ['☀️', '🌙', '⭐', '🌸', '💜', '✨', '🪷', '🌿', '🫧', '🧭'] as const;
const SIDEBAR_SYMBOL_STORAGE = 'solara.sidebar.symbol';

interface SidebarProps {
  systemName?: string;
}

export function Sidebar({ systemName }: SidebarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarSymbol, setSidebarSymbol] = useState<string>('☀️');
  const [selectedTheme, setSelectedTheme] = useState<SolaraThemeId>(DEFAULT_SOLARA_THEME);
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

    const theme = readStoredSolaraTheme();
    setSelectedTheme(theme);
    applySolaraTheme(theme);
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

  function setTheme(themeId: SolaraThemeId) {
    setSelectedTheme(themeId);
    applySolaraTheme(themeId);
    persistSolaraTheme(themeId);
  }

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 z-10 min-h-dvh w-60 flex-col border-r border-border/40"
      style={{ background: 'linear-gradient(180deg, var(--theme-surface) 0%, var(--theme-bg) 100%)' }}
    >
      <div ref={brandMenuRef} className="relative border-b border-border/40 px-4 py-4">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-150 hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="text-2xl drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]">{sidebarSymbol}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary">Solara Plural</p>
            {systemName && <p className="max-w-[140px] truncate text-xs text-muted/80">{systemName}</p>}
          </div>
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="System menu"
            className="absolute left-4 right-4 top-[calc(100%-6px)] z-20 space-y-4 rounded-xl border border-border bg-surface-alt/95 p-3 shadow-card backdrop-blur-sm animate-slide-up"
          >
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Sidebar symbol</p>
              <div className="flex flex-wrap gap-2">
                {SIDEBAR_SYMBOLS.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => setSymbol(symbol)}
                    className={`h-9 w-9 rounded-lg border text-lg transition-all duration-150 ${
                      sidebarSymbol === symbol
                        ? 'scale-110 border-primary/60 bg-primary/10'
                        : 'border-border bg-surface hover:bg-surface-alt'
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
              <p className="mb-2 px-2 text-xs font-medium text-muted">Theme preset</p>
              <div className="space-y-1">
                {SOLARA_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setTheme(theme.id)}
                    className={`w-full rounded-lg border px-2 py-1.5 text-left transition-colors ${
                      selectedTheme === theme.id
                        ? 'border-primary/50 bg-primary/10 text-text'
                        : 'border-border bg-surface text-muted hover:bg-surface-alt hover:text-text'
                    }`}
                    aria-pressed={selectedTheme === theme.id}
                  >
                    <span className="block text-sm font-medium">{theme.label}</span>
                    <span className="block text-xs opacity-80">{theme.description}</span>
                  </button>
                ))}
              </div>
              <Link
                href="/settings#appearance"
                className="mt-2 block rounded-lg px-2 py-1.5 text-xs text-muted transition-colors hover:bg-surface hover:text-text"
                onClick={() => setMenuOpen(false)}
              >
                Open appearance settings
              </Link>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Primary navigation">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href ||
                (item.href !== '/front' && pathname.startsWith(item.href)) ||
                (item.href === '/front' && pathname === '/front');

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive ? 'bg-primary/15 text-primary-glow' : 'text-muted hover:bg-surface-alt hover:text-text'
              }`}
            >
              {isActive && <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-primary" aria-hidden="true" />}
              <span className={`flex-shrink-0 transition-all duration-200 ${isActive ? 'text-primary' : ''}`}>
                <item.Icon />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/40 px-3 py-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-error/60 transition-all duration-150 hover:bg-error/10 hover:text-error"
        >
          <span className="flex-shrink-0"><IconLogout /></span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
