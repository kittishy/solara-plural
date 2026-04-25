'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const CRITICAL_ROUTES = ['/', '/front', '/members', '/notes', '/settings'] as const;

export function DashboardPrefetch() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    for (const route of CRITICAL_ROUTES) {
      if (route !== pathname) {
        router.prefetch(route);
      }
    }
  }, [router, pathname]);

  return null;
}
