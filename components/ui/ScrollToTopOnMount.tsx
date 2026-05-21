'use client';

import { useEffect } from 'react';

// Forces the window to scroll to the top on mount.
//
// Use on detail pages where Next.js's default scroll restoration or browser
// scroll-anchor behavior may land the viewport mid-page (e.g. when the
// previous route was a long scrollable list and the new page outgrows it
// after hydration / async image loading).
//
// `behavior: 'instant'` (not 'smooth') so it doesn't visibly animate.
export function ScrollToTopOnMount() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return null;
}
