'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/',         label: 'Home',     icon: '🏠' },
  { href: '/members',  label: 'Members',  icon: '👥' },
  { href: '/front',    label: 'Front',    icon: '✨' },
  { href: '/notes',    label: 'Notes',    icon: '📝' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-10">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : item.href === '/front'
              ? pathname === '/front' || pathname.startsWith('/front/')
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl
                          text-xs font-medium transition-colors duration-100 min-w-[44px] min-h-[44px] justify-center
                ${isActive ? 'text-primary-glow' : 'text-muted'}`}
              aria-label={item.label}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
