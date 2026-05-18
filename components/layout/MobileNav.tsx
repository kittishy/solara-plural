'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { localizePathname, stripLanguageFromPathname } from '@/lib/i18n';
import { SCANLINE_BG } from '@/lib/styles';

type IconProps = { size?: number };

function IconHome({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconMembers({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconPartners({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconNotes({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  );
}

function IconFriends({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="7" r="3" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h3" />
      <line x1="19" y1="10" x2="19" y2="16" />
      <line x1="16" y1="13" x2="22" y2="13" />
    </svg>
  );
}

function IconJournal({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" x2="15" y1="8" y2="8" />
      <line x1="9" x2="15" y1="12" y2="12" />
    </svg>
  );
}

function IconChat({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSettings({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconBell({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    </svg>
  );
}

function IconCalendar({ size = 22 }: IconProps) {
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

function IconMenu({ size = 22 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

const navItemsBase = [
  { href: '/', labelKey: 'nav.home', Icon: IconHome, systemOnly: false },
  { href: '/members', labelKey: 'nav.members', Icon: IconMembers, systemOnly: true },
  { href: '/notes', labelKey: 'nav.notes', Icon: IconNotes, systemOnly: false },
  { href: '/chat', labelKey: 'nav.chat', Icon: IconChat, systemOnly: true },
] as const;

const menuItemsBase = [
  { href: '/partners', labelKey: 'nav.partners', Icon: IconPartners, systemOnly: false },
  { href: '/journal', labelKey: 'nav.journal', Icon: IconJournal, systemOnly: true },
  { href: '/friends', labelKey: 'nav.friends', Icon: IconFriends, systemOnly: false },
  { href: '/front/history', labelKey: 'nav.frontHistory', Icon: IconCalendar, systemOnly: true },
  { href: '/notifications', labelKey: 'nav.notifications', Icon: IconBell, systemOnly: false },
  { href: '/settings', labelKey: 'nav.settings', Icon: IconSettings, systemOnly: false },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export function MobileNav({ accountType = 'system' }: { accountType?: 'system' | 'singlet' }) {
  const pathname = usePathname();
  const activePathname = stripLanguageFromPathname(pathname);
  const { language, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navItems = navItemsBase.filter((item) => accountType === 'system' || !item.systemOnly);
  const menuItems = menuItemsBase.filter((item) => accountType === 'system' || !item.systemOnly);
  const menuIsActive = menuItems.some((item) => isActive(activePathname, item.href));

  function closeMenu() {
    setIsMenuClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setIsMenuClosing(false);
    }, 140);
  }

  useEffect(() => {
    if (menuOpen) closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) closeMenu();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu();
    }
    if (menuOpen) {
      document.addEventListener('pointerdown', closeOnOutsideClick);
      document.addEventListener('keydown', closeOnEscape);
    }
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const colCount = navItems.length + 1;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-20 border-t-2 border-border-strong"
      style={{
        paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))',
        background: 'var(--theme-surface)',
        backgroundImage: SCANLINE_BG,
        boxShadow: '0 -2px 0 rgb(var(--theme-primary-rgb) / 0.2)',
      }}
      aria-label={t('nav.mobilePrimary')}
    >
      <div ref={menuRef} className="relative">
        {/* Popup menu */}
        {(menuOpen || isMenuClosing) && (
          <div
            className={`absolute bottom-full left-0 right-0 border-t-2 border-border-strong ${isMenuClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
            role="menu"
            aria-label={t('nav.moreMenu')}
            style={{
              background: 'var(--theme-surface-raised)',
              backgroundImage: SCANLINE_BG,
            }}
          >
            {menuItems.map((item) => {
              const current = isActive(activePathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={localizePathname(item.href, language)}
                  prefetch={true}
                  role="menuitem"
                  aria-current={current ? 'page' : undefined}
                  onClick={closeMenu}
                  className={`flex min-h-[52px] items-center gap-4 px-6 text-sm font-bold transition-colors border-l-2 ${
                    current
                      ? 'border-l-primary bg-primary/10 text-primary'
                      : 'border-l-transparent text-muted hover:bg-surface-alt hover:text-text'
                  }`}
                >
                  <item.Icon size={18} />
                  {current && (
                    <span className="text-primary mr-1" aria-hidden="true">
                      ◆
                    </span>
                  )}
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        )}

        {/* Flat tab bar */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
        >
          {navItems.map((item) => {
            const current = isActive(activePathname, item.href);
            return (
              <Link
                key={item.href}
                href={localizePathname(item.href, language)}
                prefetch={true}
                aria-label={t(item.labelKey)}
                aria-current={current ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className={`relative flex flex-col items-center justify-center gap-1 min-h-[64px] py-2 text-[9px] font-black uppercase tracking-widest transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70 ${
                  current
                    ? 'bg-primary text-bg'
                    : 'text-muted hover:text-text hover:bg-surface-alt'
                }`}
                style={current ? {
                  filter: 'drop-shadow(0 0 6px rgb(var(--theme-primary-rgb) / 0.5))',
                } : undefined}
              >
                {current && (
                  <span
                    className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-primary rounded-full"
                    style={{ boxShadow: '0 0 8px rgb(var(--theme-primary-rgb) / 0.75)' }}
                    aria-hidden="true"
                  />
                )}
                <item.Icon size={20} />
                <span className="leading-none">{t(item.labelKey)}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => menuOpen ? closeMenu() : setMenuOpen(true)}
            aria-label={t('nav.moreOptions')}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={`relative flex flex-col items-center justify-center gap-1 min-h-[64px] py-2 text-[9px] font-black uppercase tracking-widest transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70 ${
              menuIsActive || menuOpen
                ? 'bg-primary text-bg'
                : 'text-muted hover:text-text hover:bg-surface-alt'
            }`}
            style={(menuIsActive || menuOpen) ? {
              filter: 'drop-shadow(0 0 6px rgb(var(--theme-primary-rgb) / 0.5))',
            } : undefined}
          >
            {(menuIsActive || menuOpen) && (
              <span
                className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-primary rounded-full"
                style={{ boxShadow: '0 0 8px rgb(var(--theme-primary-rgb) / 0.75)' }}
                aria-hidden="true"
              />
            )}
            <IconMenu size={20} />
            <span className="leading-none">{t('nav.more')}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
