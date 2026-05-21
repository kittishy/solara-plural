// Server-renderable skeleton primitives.
// These match the silhouette of the real components so the layout
// does not jump when data arrives — critical for "instantaneous" feel
// on slow networks and PWA cold-starts.

import type { ReactNode } from 'react';

export function SkeletonLine({
  width = '100%',
  className = '',
}: {
  width?: string | number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-line ${className}`}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
    />
  );
}

export function SkeletonCard({
  children,
  withCorner = true,
  className = '',
}: {
  children?: ReactNode;
  withCorner?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-card ${withCorner ? 'skeleton-card-corner' : ''} ${className}`}
      style={{ padding: '0.85rem 1rem' }}
    >
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}

/** Member list row skeleton — mirrors a card with avatar + name + meta + tags. */
export function SkeletonMemberRow() {
  return (
    <SkeletonCard>
      <div className="flex items-center gap-3">
        <span className="skeleton-avatar" aria-hidden="true" />
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonLine width="55%" />
          <SkeletonLine width="35%" className="!h-2" />
        </div>
      </div>
    </SkeletonCard>
  );
}

/** Front badge skeleton — taller, hot-pink accent. */
export function SkeletonFrontBadge() {
  return (
    <div
      aria-hidden="true"
      className="skeleton-card skeleton-card-corner"
      style={{
        padding: '1rem 1.25rem',
        borderLeftColor: 'rgb(var(--theme-front-rgb) / 0.6)',
        minHeight: 112,
      }}
    >
      <div className="relative z-[2] space-y-3">
        <SkeletonLine width="32%" className="!h-2" />
        <div className="flex items-center gap-3">
          <span className="skeleton-avatar" style={{ width: 40, height: 40 }} aria-hidden="true" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="42%" />
            <SkeletonLine width="22%" className="!h-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Note-card row skeleton. */
export function SkeletonNoteRow() {
  return (
    <SkeletonCard>
      <div className="space-y-2">
        <SkeletonLine width="48%" />
        <SkeletonLine width="92%" className="!h-2" />
        <SkeletonLine width="74%" className="!h-2" />
      </div>
    </SkeletonCard>
  );
}

/** Generic page-title skeleton (matches .page-title height). */
export function SkeletonPageTitle() {
  return (
    <div className="space-y-3">
      <SkeletonLine width="22%" className="!h-2" />
      <SkeletonLine width="58%" className="!h-7" />
    </div>
  );
}

/** Convenience: a stack of N skeleton rows with stagger entrance. */
export function SkeletonStack({
  count = 4,
  Item = SkeletonMemberRow,
}: {
  count?: number;
  Item?: () => JSX.Element;
}) {
  return (
    <div className="stagger-children space-y-2.5" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}
