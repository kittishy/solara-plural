'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const navItems = [
  { href: '/',               label: 'Home',         icon: '🏠' },
  { href: '/members',        label: 'Members',      icon: '👥' },
  { href: '/front',          label: 'Front',        icon: '✨' },
  { href: '/front/history',  label: 'Front history', icon: '📅' },
  { href: '/notes',          label: 'Notes',        icon: '📝' },
  { href: '/settings',       label: 'Settings',     icon: '⚙️' },
];

interface SidebarProps {
  systemName?: string;
}

export function Sidebar({ systemName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-dvh bg-surface border-r border-border fixed top-0 left-0 z-10">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">☀️</span>
          <div>
            <p className="font-bold text-primary text-sm">Solara Plural</p>
            {systemName && (
              <p className="text-muted text-xs truncate max-w-[140px]">{systemName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || (item.href !== '/front' && pathname.startsWith(item.href))
              || (item.href === '/front' && pathname === '/front');

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-100
                ${isActive
                  ? 'bg-primary/15 text-primary-glow'
                  : 'text-muted hover:bg-surface-alt hover:text-text'
                }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-muted hover:bg-surface-alt hover:text-text transition-colors duration-100"
          aria-label="Sign out"
        >
          <span className="text-base">🚪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
