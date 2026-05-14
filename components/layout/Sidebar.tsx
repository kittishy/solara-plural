'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  applySolaraTheme,
  DEFAULT_SOLARA_THEME,
  persistSolaraTheme,
  readStoredSolaraTheme,
  SOLARA_THEMES,
  type SolaraThemeId,
} from '@/lib/theme';
import { localizePathname, stripLanguageFromPathname } from '@/lib/i18n';

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
      <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4Z" />
      <path d="M8 11c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4Z" />
      <path d="M8 13c-3 0-5 1.8-5 4v2h7" />
      <path d="M16 13c3 0 5 1.8 5 4v2h-7" />
      <path d="M12 15v6" />
      <path d="M9 18h6" />
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
  { href: '/friends', labelKey: 'nav.friends', Icon: IconFriends, systemOnly: false },
  { href: '/notifications', labelKey: 'nav.notifications', Icon: IconBell, systemOnly: false },
  { href: '/settings', labelKey: 'nav.settings', Icon: IconSettings, systemOnly: false },
] as const;

interface SidebarProps {
  systemName?: string;
  accountType?: 'system' | 'singlet';
}

export function Sidebar({ systemName, accountType = 'system' }: SidebarProps) {
  const pathname = usePathname();
  const activePathname = stripLanguageFromPathname(pathname);
  const { language, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<SolaraThemeId>(DEFAULT_SOLARA_THEME);
  const brandMenuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
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

  function setTheme(themeId: SolaraThemeId) {
    setSelectedTheme(themeId);
    applySolaraTheme(themeId);
    persistSolaraTheme(themeId);
  }

  const centerNavItems = navItems.filter(
    (item) => item.href !== '/settings' && (accountType === 'system' || !item.systemOnly),
  );
  const settingsItem = navItems.find(
    (item) => item.href === '/settings' && (accountType === 'system' || !item.systemOnly),
  );
  const isSettingsActive = activePathname.startsWith('/settings');

  return (
    <header
      className="hidden md:flex fixed top-0 left-0 right-0 z-20 h-14 items-center"
      style={{
        background: '#131416',
        borderBottom: '1px solid #2E3036',
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
          className="flex h-14 items-center gap-3 px-5 transition-colors duration-150 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          {/* ZZZ-style icon mark */}
          <span
            className="flex h-7 w-7 items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--theme-primary)',
              borderRadius: '6px',
            }}
            aria-hidden="true"
          >
            <span
              style={{
                color: '#131416',
                fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                fontWeight: 900,
                fontSize: '0.8rem',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              S
            </span>
          </span>
          <div className="min-w-0">
            <p
              style={{
                color: '#F5F5F5',
                fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                fontWeight: 700,
                fontSize: '0.875rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              SOLARA
            </p>
            {systemName && (
              <p
                className="max-w-[120px] truncate mt-0.5"
                style={{
                  color: '#8A8D96',
                  fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                {systemName}
              </p>
            )}
          </div>
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label={t('nav.systemMenu')}
            className="absolute left-0 top-full mt-1 z-30 w-56 animate-slide-up"
            style={{
              background: '#1C1E22',
              border: '1px solid #2E3036',
              borderRadius: '14px',
              padding: '0.75rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Theme label */}
            <p
              className="mb-2 px-1"
              style={{
                color: '#5C606A',
                fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              {t('nav.themePreset')}
            </p>
            <div className="flex gap-2">
              {SOLARA_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setTheme(theme.id)}
                  aria-pressed={selectedTheme === theme.id}
                  style={{
                    background: selectedTheme === theme.id ? 'var(--theme-primary)' : '#22252A',
                    color: selectedTheme === theme.id ? '#131416' : '#8A8D96',
                    borderRadius: '10px',
                    border: `2px solid ${selectedTheme === theme.id ? 'var(--theme-primary)' : '#2E3036'}`,
                    padding: '8px 16px',
                    fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    flex: 1,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {theme.label}
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #2E3036', margin: '0.75rem -0.75rem 0', padding: '0.5rem 0.75rem 0' }}>
              <Link
                href={`${localizePathname('/settings', language)}#appearance`}
                style={{
                  display: 'block',
                  color: '#5C606A',
                  fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '0.35rem 0.25rem',
                  transition: 'color 150ms ease',
                }}
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.appearanceSettings')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 h-5 w-px flex-shrink-0" style={{ background: '#2E3036' }} aria-hidden="true" />

      {/* CENTER: nav items */}
      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto" aria-label={t('nav.primary')}>
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
              className="relative flex flex-shrink-0 items-center gap-1.5 px-3 h-9 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2"
              style={{
                background: isActive ? 'var(--theme-primary)' : 'transparent',
                color: isActive ? '#131416' : '#8A8D96',
                borderRadius: '8px',
                fontSize: '0.625rem',
                fontFamily: 'var(--font-display), var(--font-nunito), sans-serif',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = '#F5F5F5';
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = '#8A8D96';
              }}
            >
              <span className="flex-shrink-0">
                <item.Icon size={15} />
              </span>
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* RIGHT: Settings + Logout */}
      <div className="flex flex-shrink-0 items-center gap-1 px-3">
        {settingsItem && (
          <Link
            href={localizePathname('/settings', language)}
            prefetch={true}
            aria-current={isSettingsActive ? 'page' : undefined}
            aria-label={t(settingsItem.labelKey)}
            className="flex h-9 w-9 items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: isSettingsActive ? 'var(--theme-primary)' : 'transparent',
              color: isSettingsActive ? '#131416' : '#8A8D96',
              borderRadius: '8px',
            }}
            onMouseEnter={(e) => {
              if (!isSettingsActive) (e.currentTarget as HTMLElement).style.color = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              if (!isSettingsActive) (e.currentTarget as HTMLElement).style.color = '#8A8D96';
            }}
          >
            <IconSettings size={17} />
          </Link>
        )}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: localizePathname('/login', language) })}
          aria-label={t('nav.signOut')}
          className="flex h-9 w-9 items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a6a]/60"
          style={{ color: 'rgba(255,90,106,0.6)', borderRadius: '8px' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ff5a6a'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,90,106,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,90,106,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <IconLogout size={17} />
        </button>
      </div>
    </header>
  );
}
