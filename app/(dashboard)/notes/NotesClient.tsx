'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { apiFetcher, swrKeys } from '@/lib/swr';

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

export default function NotesClient({ initialNotes }: { initialNotes: NoteListItem[] }) {
  const { data: notes = initialNotes } = useSWR<NoteListItem[]>(
    swrKeys.notes,
    apiFetcher,
    { fallbackData: initialNotes }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Notes</h1>
          <p className="text-muted text-sm mt-0.5">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/notes/new" className="btn-primary gap-1.5">
          <IconEdit />
          New note
        </Link>
      </div>

      {notes.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 shadow-glow mb-4" aria-hidden="true">
            <span className="text-3xl">📝</span>
          </div>
          <p className="text-text font-semibold">Your thoughts live here 💜</p>
          <p className="text-muted text-sm mt-2 mb-6">
            Notes you write will appear here. Start with anything — no pressure.
          </p>
          <Link href="/notes/new" className="btn-primary gap-1.5">
            <IconEdit />
            Write your first note
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {notes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="card card-interactive p-5 block group border-l-2 border-l-transparent
                min-w-0 overflow-hidden
                hover:shadow-glow hover:border-l-primary/50 hover:shadow-sm
                transition-all duration-150"
            >
              <p className="font-semibold text-text line-clamp-1">
                {note.title ?? 'Untitled note'}
              </p>
              <p className="text-muted text-sm mt-1 line-clamp-3">{note.content}</p>
              <p className="text-subtle text-xs mt-3">
                {new Date(note.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
