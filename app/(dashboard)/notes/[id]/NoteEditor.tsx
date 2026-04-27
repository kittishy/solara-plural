'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { revalidateNotes } from '@/lib/swr';

type EditableNote = {
  id: string;
  title: string | null;
  content: string;
  updatedAt: Date;
};

interface Props {
  note: EditableNote | null;
}

type SaveStatus = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

export default function NoteEditor({ note }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const draftKey = useMemo(() => `solara.notes.draft.${note?.id ?? 'new'}`, [note?.id]);
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [status, setStatus] = useState<SaveStatus>(null);
  const hasUnsavedContent = title.trim() !== (note?.title ?? '').trim() || content !== (note?.content ?? '');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;

      const draft = JSON.parse(raw) as { title?: unknown; content?: unknown };
      if (typeof draft.title === 'string') setTitle(draft.title);
      if (typeof draft.content === 'string') setContent(draft.content);
      setStatus({ type: 'info', message: 'Restored a local draft.' });
    } catch {
      // Draft restore is helpful, not critical.
    }
  }, [draftKey]);

  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ title, content }));
    } catch {
      // Ignore storage failures so writing never gets blocked.
    }
  }, [content, draftKey, title]);

  useEffect(() => {
    function warnBeforeLeave(event: BeforeUnloadEvent) {
      if (!hasUnsavedContent) return;
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, [hasUnsavedContent]);

  async function save() {
    if (!content.trim()) return;

    setStatus({ type: 'info', message: 'Saving note...' });
    const url = note ? `/api/notes/${note.id}` : '/api/notes';
    const method = note ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() || null, content }),
    });

    if (!res.ok) {
      setStatus({ type: 'error', message: 'Could not save. Your text is still here.' });
      return;
    }

    const data = await res.json();
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore storage cleanup failures.
    }

    revalidateNotes();
    setStatus({ type: 'success', message: 'Note saved.' });

    if (!note) {
      startTransition(() => router.replace(`/notes/${data.data.id}`));
    } else {
      startTransition(() => router.refresh());
    }
  }

  async function deleteNote() {
    if (!note) return;
    if (!confirm(`Delete "${note.title ?? 'this note'}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setStatus({ type: 'error', message: 'Could not delete this note. Try again?' });
      return;
    }

    revalidateNotes();
    startTransition(() => router.push('/notes'));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/notes" className="btn-ghost min-h-[44px] border border-border/60 px-3">
          <span aria-hidden="true">←</span>
          Notes
        </Link>
        <div className="flex-1" />
        {note && (
          <button type="button" onClick={deleteNote} className="btn-danger min-h-[44px] text-sm">
            Delete
          </button>
        )}
        <button type="button" onClick={save} disabled={isPending || !content.trim()} className="btn-primary min-h-[44px] px-5">
          {isPending ? 'Saving...' : 'Save note'}
        </button>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-border/60 bg-surface-alt/45 px-5 py-4">
          <label htmlFor="note-title" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            Title, if it helps
          </label>
          <input
            id="note-title"
            className="w-full border-none bg-transparent text-2xl font-bold text-text outline-none placeholder:text-subtle"
            placeholder="Untitled note"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="px-5 py-4">
          <label htmlFor="note-content" className="mb-3 block text-sm font-medium text-muted">
            Note body
          </label>
          <textarea
            id="note-content"
            className="min-h-[360px] w-full resize-none border-none bg-transparent text-base leading-relaxed text-text outline-none placeholder:text-subtle"
            placeholder="Write what you want to remember..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
            autoFocus={!note}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border/50 bg-surface/60 px-4 py-3 text-sm text-muted">
        <p className="font-medium text-text">Gentle prompts</p>
        <p className="mt-1">What happened? Who was around? Is there anything the next fronter should know?</p>
      </section>

      {status && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : status.type === 'error'
                ? 'border-error/30 bg-error/10 text-error'
                : 'border-border/60 bg-surface-alt/60 text-muted'
          }`}
          role={status.type === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      )}

      {note && (
        <p className="text-center text-xs text-subtle">
          Last updated {new Date(note.updatedAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}
