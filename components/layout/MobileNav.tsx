'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

function IconMenu({ size = 18 }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
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

const navItems = [
  { href: '/', label: 'Home', mobileLabel: 'Home', Icon: IconHome },
  { href: '/members', label: 'Members', mobileLabel: 'Members', Icon: IconMembers },
  { href: '/front', label: 'Front', mobileLabel: 'Front', Icon: IconFront },
  { href: '/notes', label: 'Notes', mobileLabel: 'Notes', Icon: IconNotes },
];

const menuItems = [
  { href: '/friends', label: 'Friends', Icon: IconFriends },
  { href: '/front/history', label: 'Front history', Icon: IconCalendar },
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/front') return pathname === '/front';
  return pathname.startsWith(href);
}

export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuIsActive = menuItems.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
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

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-20 px-2 pt-1"
      style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))' }}
      aria-label="Primary mobile navigation"
    >
      <div ref={menuRef} className="relative flex items-end gap-2">
        {menuOpen && (
          <div
            className="absolute bottom-[calc(100%+0.5rem)] right-0 w-48 rounded-xl border border-border bg-surface/95 p-2 shadow-card backdrop-blur-xl animate-slide-up"
            role="menu"
            aria-label="More mobile navigation"
          >
            {menuItems.map((item) => {
              const current = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  role="menuitem"
                  aria-current={current ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                    current ? 'bg-primary/15 text-text' : 'text-muted hover:bg-surface-alt hover:text-text'
                  }`}
                >
                  <span className={current ? 'text-primary' : undefined}>
                    <item.Icon />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-surface/85 backdrop-blur-xl shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
          <div className="grid grid-cols-4 gap-1 px-1 py-1.5">
          {navItems.map((item) => {
            const current = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-label={item.label}
                aria-current={current ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className={`relative flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-medium leading-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                  current
                    ? 'border border-primary/35 bg-primary/15 text-text'
                    : 'border border-transparent text-muted hover:border-border/60 hover:text-text'
                }`}
              >
                <span className={`leading-none transition-transform duration-200 ${current ? 'scale-105 text-primary' : ''}`}>
                  <item.Icon />
                </span>
                <span className="max-w-full truncate leading-none">{item.mobileLabel}</span>
                {current && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" aria-hidden="true" />
                )}
              </Link>
            );
          })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Open more navigation options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={`flex min-h-[66px] w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-semibold leading-none backdrop-blur-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
            menuIsActive || menuOpen
              ? 'border-primary/40 bg-primary/15 text-text shadow-[0_0_14px_rgba(167,139,250,0.16)]'
              : 'border-white/10 bg-surface/85 text-muted hover:border-border/70 hover:text-text'
          }`}
        >
          <span className={menuIsActive || menuOpen ? 'text-primary' : undefined}>
            <IconMenu size={20} />
          </span>
          Menu
        </button>
      </div>
    </nav>
  );
}
