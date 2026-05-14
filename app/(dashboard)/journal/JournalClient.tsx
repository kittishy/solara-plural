'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { apiFetcher, swrKeys } from '@/lib/swr';
import { formatDate } from '@/lib/client/format';

type JournalListItem = {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  createdAt: string;
};

function IconPen() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function JournalClient({ initialEntries }: { initialEntries: JournalListItem[] }) {
  const { data: entries = initialEntries } = useSWR<JournalListItem[]>(
    swrKeys.journal,
    apiFetcher,
    { fallbackData: initialEntries, revalidateOnMount: false },
  );

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Journal</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mt-1">
            {entries.length} {entries.length !== 1 ? 'entries' : 'entry'} written
          </p>
        </div>
        <Link href="/journal/new" className="btn-primary gap-1.5">
          <IconPen />
          New entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="stagger-children flex flex-col items-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 shadow-glow mb-4"
              aria-hidden="true"
            >
              <span className="text-3xl">📖</span>
            </div>
            <p className="text-text font-semibold">Your journal is empty</p>
            <p className="text-muted text-sm mt-2 mb-6">
              Write freely — for yourself, for the system, for whoever needs to read it later.
            </p>
            <Link href="/journal/new" className="btn-primary gap-1.5">
              <IconPen />
              Write first entry
            </Link>
          </div>
        </div>
      ) : (
        <ul role="list" className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} role="listitem">
              <Link
                href={`/journal/${entry.id}`}
                className="group flex gap-0 rounded-xl overflow-hidden border border-border/70 transition-all duration-150
                  hover:border-primary/40 hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                style={{
                  background: 'linear-gradient(160deg, rgb(var(--theme-surface-alt-rgb) / 0.4) 0%, var(--theme-surface) 60%)',
                }}
              >
                <div className="w-1 shrink-0 bg-primary/60 group-hover:bg-primary transition-colors" />
                <div className="flex flex-1 items-center gap-3 px-4 py-3.5 min-w-0">
                  {entry.mood && (
                    <span className="text-xl shrink-0" aria-label={`Mood: ${entry.mood}`}>
                      {entry.mood}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-text text-sm leading-snug truncate">
                      {entry.title ?? formatDate(entry.createdAt)}
                    </p>
                    {entry.content && (
                      <p className="text-muted text-xs mt-0.5 line-clamp-1 leading-snug">
                        {entry.content}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wide text-subtle">
                      {formatDate(entry.createdAt)}
                    </span>
                    <span className="text-muted group-hover:text-primary transition-colors">
                      <IconChevronRight />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
