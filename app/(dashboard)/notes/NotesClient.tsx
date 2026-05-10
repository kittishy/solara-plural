'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { apiFetcher, swrKeys } from '@/lib/swr';

const INITIAL_VISIBLE_NOTES = 60;
const VISIBLE_NOTES_INCREMENT = 60;

type NoteListItem = {
  id: string;
  title: string | null;
  content: string;
  updatedAt: Date | string;
};

function IconEdit() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NotesClient({ initialNotes }: { initialNotes: NoteListItem[] }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_NOTES);
  const { data: notes = initialNotes } = useSWR<NoteListItem[]>(
    swrKeys.notes,
    apiFetcher,
    { fallbackData: initialNotes, revalidateOnMount: false }
  );
  const visibleNotes = notes.slice(0, visibleCount);
  const hasMoreNotes = visibleCount < notes.length;

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Notes</h1>
          <p className="text-muted text-sm mt-0.5">
            {notes.length} note{notes.length !== 1 ? 's' : ''} in your system
          </p>
        </div>
        <Link href="/notes/new" className="btn-primary gap-1.5">
          <IconEdit />
          New note
        </Link>
      </div>

      {notes.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="stagger-children flex flex-col items-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 shadow-glow mb-4"
              aria-hidden="true"
            >
              <span className="text-3xl">📝</span>
            </div>
            <p className="text-text font-semibold">Your thoughts live here</p>
            <p className="text-muted text-sm mt-2 mb-6">
              Notes you write will appear here. Start with anything — no pressure.
            </p>
            <Link href="/notes/new" className="btn-primary gap-1.5">
              <IconEdit />
              Write your first note
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ul role="list" className="rounded-xl overflow-hidden border border-border/40">
            {visibleNotes.map((note) => (
              <li
                key={note.id}
                role="listitem"
                className="relative border-b border-border/40 last:border-b-0 bg-surface hover:bg-surface-alt/60 transition-colors duration-150"
                style={{ borderLeft: '3px solid #a78bfa' }}
              >
                <Link
                  href={`/notes/${note.id}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 focus:outline-none
                    focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text text-sm leading-snug truncate">
                      {note.title ?? 'Untitled note'}
                    </p>
                    {note.content && (
                      <p className="text-muted text-xs mt-0.5 line-clamp-2 leading-snug">
                        {note.content}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-subtle text-xs hidden sm:block">
                      {formatDate(note.updatedAt)}
                    </span>
                    <span className="text-subtle">
                      <IconChevronRight />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {hasMoreNotes && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + VISIBLE_NOTES_INCREMENT)}
              className="btn-ghost min-h-[48px] w-full justify-center border border-border/60"
            >
              Show more notes ({notes.length - visibleNotes.length} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
