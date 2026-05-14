'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { apiFetcher, swrKeys } from '@/lib/swr';
import { formatDate } from '@/lib/client/format';

const INITIAL_VISIBLE_NOTES = 60;
const VISIBLE_NOTES_INCREMENT = 60;

type NoteListItem = {
  id: string;
  title: string | null;
  content: string;
  category: string | null;
  updatedAt: Date | string;
};

type FilterValue = 'all' | 'note' | 'memory' | 'reminder' | 'important';

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'note', label: '📝 Note' },
  { value: 'memory', label: '🌸 Memory' },
  { value: 'reminder', label: '⏰ Reminder' },
  { value: 'important', label: '⚡ Important' },
];

const CATEGORY_COLORS: Record<string, string> = {
  note: 'bg-primary',
  memory: 'bg-front',
  reminder: 'bg-warning',
  important: 'bg-error',
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


export default function NotesClient({ initialNotes }: { initialNotes: NoteListItem[] }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_NOTES);
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const { data: notes = initialNotes } = useSWR<NoteListItem[]>(
    swrKeys.notes,
    apiFetcher,
    { fallbackData: initialNotes, revalidateOnMount: false }
  );

  const filteredNotes = activeFilter === 'all'
    ? notes
    : notes.filter((n) => n.category === activeFilter);

  const visibleNotes = filteredNotes.slice(0, visibleCount);
  const hasMoreNotes = visibleCount < filteredNotes.length;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mt-1">
            {notes.length} note{notes.length !== 1 ? 's' : ''} in system
          </p>
        </div>
        <Link href="/notes/new" className="btn-primary gap-1.5">
          <IconEdit />
          New note
        </Link>
      </div>

      {notes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setActiveFilter(value); setVisibleCount(INITIAL_VISIBLE_NOTES); }}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 ${
                activeFilter === value
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'border-border/60 text-muted hover:text-text hover:border-border-strong/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

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
      ) : filteredNotes.length === 0 ? (
        <div className="card p-10 text-center animate-fade-in">
          <p className="text-text font-semibold">No {activeFilter} notes yet</p>
          <p className="text-muted text-sm mt-1">Notes tagged as {activeFilter} will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ul role="list" className="space-y-2">
            {visibleNotes.map((note) => (
              <li key={note.id} role="listitem">
                <Link
                  href={`/notes/${note.id}`}
                  className="group flex gap-0 rounded-xl overflow-hidden border border-border/70 transition-all duration-150
                    hover:border-primary/40 hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]
                    active:scale-[0.99] active:translate-y-0 active:shadow-none
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  style={{
                    background: 'linear-gradient(160deg, rgb(var(--theme-surface-alt-rgb) / 0.4) 0%, var(--theme-surface) 60%)',
                  }}
                >
                  <div className="w-1 shrink-0 bg-primary/60 group-hover:bg-primary transition-colors" />
                  <div className="flex flex-1 items-center gap-3 px-4 py-3.5 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {note.category && (
                          <span
                            className={`inline-block h-2 w-2 shrink-0 rounded-full ${CATEGORY_COLORS[note.category] ?? 'bg-muted'}`}
                            title={note.category}
                            aria-label={note.category}
                          />
                        )}
                        <p className="font-black text-text text-sm leading-snug truncate">
                          {note.title ?? 'Untitled note'}
                        </p>
                      </div>
                      {note.content && (
                        <p className="text-muted text-xs mt-0.5 line-clamp-1 leading-snug">
                          {note.content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wide text-subtle">
                        {formatDate(note.updatedAt)}
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

          {hasMoreNotes && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + VISIBLE_NOTES_INCREMENT)}
              className="btn-ghost min-h-[48px] w-full justify-center border border-border/60"
            >
              Show more notes ({filteredNotes.length - visibleNotes.length} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
