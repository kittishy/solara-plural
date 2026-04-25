'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { revalidateNotes } from '@/lib/swr';

type EditableNote = {
  id: string;
  title: string | null;
  content: string;
  updatedAt: Date;
};

interface Props { note: EditableNote | null; }

export default function NoteEditor({ note }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [saved, setSaved] = useState(false);

  async function save() {
    const url = note ? `/api/notes/${note.id}` : '/api/notes';
    const method = note ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() || null, content }),
    });
    if (res.ok) {
      const data = await res.json();
      revalidateNotes();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (!note) {
        startTransition(() => router.replace(`/notes/${data.data.id}`));
      } else {
        startTransition(() => router.refresh());
      }
    }
  }

  async function deleteNote() {
    if (!note) return;
    if (!confirm(`Delete "${note.title ?? 'this note'}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
    if (!res.ok) return;
    revalidateNotes();
    startTransition(() => router.push('/notes'));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/notes" className="btn-ghost">← Notes</Link>
        <div className="flex-1" />
        {note && (
          <button onClick={deleteNote} className="btn-danger text-sm">Delete</button>
        )}
        <button onClick={save} disabled={isPending || !content.trim()} className="btn-primary">
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <input
          className="w-full bg-transparent text-text text-2xl font-bold placeholder:text-subtle outline-none border-none"
          placeholder="Note title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full bg-transparent text-text text-base placeholder:text-subtle outline-none border-none resize-none min-h-[300px] leading-relaxed"
          placeholder="Write something..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus={!note}
        />
      </div>

      {note && (
        <p className="text-subtle text-xs text-center">
          Last updated {new Date(note.updatedAt).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
          })}
        </p>
      )}
    </div>
  );
}
