'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode, type CSSProperties } from 'react';

type RevealVariant = 'fade-up' | 'clip' | 'snap';

interface RevealProps {
  children: ReactNode;
  /** Delay in ms before animation begins after entering view. */
  delay?: number;
  /** Visual style. `fade-up` is the default — subtle and broadly safe.
   *  `clip` is a ZZZ-style horizontal clip-path reveal. `snap` lands with a tiny overshoot. */
  variant?: RevealVariant;
  /** Render-as element. Defaults to `div`. */
  as?: ElementType;
  /** Pass-through className. */
  className?: string;
  /** IntersectionObserver threshold. Defaults to 0.12 — fires when ~12% visible. */
  threshold?: number;
  /** rootMargin — defaults to a small negative bottom so reveal triggers slightly before edge. */
  rootMargin?: string;
  style?: CSSProperties;
}

/**
 * Reveal — one-shot scroll-triggered entrance, IntersectionObserver-based.
 *
 * Design intent: curated reveals only. Wrap *section-level* or *list-level*
 * elements, not every leaf. Once revealed, never animates again.
 *
 * Respects `prefers-reduced-motion` automatically via global CSS rule.
 */
export function Reveal({
  children,
  delay = 0,
  variant = 'fade-up',
  as,
  className = '',
  threshold = 0.12,
  rootMargin = '0px 0px -8% 0px',
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If IntersectionObserver missing or element already in view at mount, just reveal.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const Tag = (as ?? 'div') as ElementType;
  const animationClass = visible
    ? variant === 'clip'
      ? 'animate-clip-reveal'
      : variant === 'snap'
        ? 'animate-snap-in'
        : 'animate-slide-up'
    : '';

  const mergedStyle: CSSProperties = {
    ...style,
    // Reserve final state so layout doesn't shift; we just hide via opacity until observed.
    opacity: visible ? undefined : 0,
    animationDelay: visible && delay ? `${delay}ms` : undefined,
    willChange: visible ? 'transform, opacity' : undefined,
  };

  return (
    <Tag ref={ref} className={`${animationClass} ${className}`.trim()} style={mergedStyle}>
      {children}
    </Tag>
  );
}

export default Reveal;
