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
          <p className="text-muted text-sm mt-0.5">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/notes/new" className="btn-primary">+ New note</Link>
      </div>

      {notes.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">📝</p>
          <p className="text-text font-semibold">No notes yet</p>
          <p className="text-muted text-sm mt-2 mb-6">
            Notes you write will live here. Start writing something.
          </p>
          <Link href="/notes/new" className="btn-primary">Write your first note</Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {notes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="card p-5 block hover:shadow-glow transition-shadow duration-100"
            >
              <p className="font-semibold text-text">{note.title ?? 'Untitled note'}</p>
              <p className="text-muted text-sm mt-1 line-clamp-3">{note.content}</p>
              <p className="text-subtle text-xs mt-3">
                {new Date(note.updatedAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
