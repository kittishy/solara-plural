// Streams immediately on dashboard route enter — Next 14 App Router shows
// this while the server component fetches in parallel. The key is that the
// silhouette matches the real dashboard so there's no visible reflow.

import {
  SkeletonPageTitle,
  SkeletonFrontBadge,
  SkeletonNoteRow,
} from '@/components/ui/Skeletons';

export default function DashboardLoading() {
  return (
    <div className="stagger-children space-y-5 md:space-y-6" aria-busy="true" aria-live="polite">
      <section className="-mx-4 px-4 pt-4 pb-2 md:mx-0 md:px-0 md:pt-0">
        <SkeletonPageTitle />
      </section>

      <SkeletonFrontBadge />

      <section className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-primary text-[10px] font-black" aria-hidden="true">◆</span>
          <span className="skeleton-line" style={{ width: '8rem' }} aria-hidden="true" />
        </div>
        <SkeletonNoteRow />
        <SkeletonNoteRow />
        <SkeletonNoteRow />
      </section>
    </div>
  );
}
