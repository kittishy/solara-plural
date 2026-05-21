import { SkeletonNoteRow, SkeletonPageTitle } from '@/components/ui/Skeletons';

export default function NotesLoading() {
  return (
    <div className="stagger-children space-y-5" aria-busy="true" aria-live="polite">
      <section className="-mx-4 px-4 pt-4 pb-2 md:mx-0 md:px-0 md:pt-0">
        <SkeletonPageTitle />
      </section>

      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonNoteRow key={i} />
        ))}
      </div>
    </div>
  );
}
