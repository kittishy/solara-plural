'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MemberPickerItem = {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
};

type EditableEntry = {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  frontingMemberIds: string[];
  isPrivate: boolean;
  updatedAt: string;
};

interface Props {
  entry: EditableEntry | null;
  members: MemberPickerItem[];
}

type SaveStatus = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

const MOODS = [
  { emoji: '😊', label: 'peaceful' },
  { emoji: '😴', label: 'tired' },
  { emoji: '😰', label: 'anxious' },
  { emoji: '🥰', label: 'warm' },
  { emoji: '😐', label: 'neutral' },
  { emoji: '😵‍💫', label: 'overwhelmed' },
] as const;

function MemberAvatar({ member, selected, onToggle }: {
  member: MemberPickerItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const initials = member.name.slice(0, 2).toUpperCase();
  const bg = member.color ?? 'var(--theme-primary)';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${selected ? 'Remove' : 'Add'} ${member.name}`}
      title={member.name}
      className={`relative h-9 w-9 rounded-full text-xs font-black transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
        selected
          ? 'ring-2 ring-offset-1 ring-primary ring-offset-surface scale-110'
          : 'opacity-50 hover:opacity-80'
      }`}
      style={{ background: bg }}
    >
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="text-white leading-none">{initials}</span>
      )}
      {selected && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-black text-bg"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
    </button>
  );
}

export default function JournalEditor({ entry, members }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const draftKey = useMemo(() => `solara.journal.draft.${entry?.id ?? 'new'}`, [entry?.id]);

  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [mood, setMood] = useState<string | null>(entry?.mood ?? null);
  const [frontingMemberIds, setFrontingMemberIds] = useState<string[]>(entry?.frontingMemberIds ?? []);
  const [isPrivate, setIsPrivate] = useState(entry?.isPrivate ?? false);
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState<SaveStatus>(null);

  const hasUnsavedContent =
    title.trim() !== (entry?.title ?? '').trim() ||
    content !== (entry?.content ?? '') ||
    mood !== (entry?.mood ?? null) ||
    JSON.stringify(frontingMemberIds.slice().sort()) !== JSON.stringify((entry?.frontingMemberIds ?? []).slice().sort()) ||
    isPrivate !== (entry?.isPrivate ?? false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { title?: unknown; content?: unknown; mood?: unknown; frontingMemberIds?: unknown };
      if (typeof draft.title === 'string') setTitle(draft.title);
      if (typeof draft.content === 'string') setContent(draft.content);
      if (typeof draft.mood === 'string' || draft.mood === null) setMood(draft.mood as string | null);
      if (Array.isArray(draft.frontingMemberIds) && draft.frontingMemberIds.every((v: unknown) => typeof v === 'string')) {
        setFrontingMemberIds(draft.frontingMemberIds as string[]);
      }
      setStatus({ type: 'info', message: 'Restored a local draft.' });
    } catch {
      // Draft restore is helpful, not critical.
    }
  }, [draftKey]);

  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ title, content, mood, frontingMemberIds }));
    } catch {
      // Ignore storage failures so writing never gets blocked.
    }
  }, [content, draftKey, frontingMemberIds, mood, title]);

  useEffect(() => {
    function warnBeforeLeave(event: BeforeUnloadEvent) {
      if (!hasUnsavedContent) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, [hasUnsavedContent]);

  function toggleMember(id: string) {
    setFrontingMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function save() {
    if (!content.trim()) return;

    setStatus({ type: 'info', message: 'Saving entry...' });
    const url = entry ? `/api/ruby/journal/${entry.id}` : '/api/ruby/journal';
    const method = entry ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim() || null,
        content,
        mood,
        frontingMemberIds,
        isPrivate,
      }),
    });

    if (!res.ok) {
      setStatus({ type: 'error', message: 'Could not save. Your text is still here.' });
      return;
    }

    const data = await res.json() as { data: { entry: { id: string } } };
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore storage cleanup failures.
    }

    setStatus({ type: 'success', message: 'Entry saved.' });

    if (!entry) {
      startTransition(() => router.replace(`/journal/${data.data.entry.id}`));
    } else {
      startTransition(() => router.refresh());
    }
  }

  async function deleteEntry() {
    if (!entry) return;
    if (!confirm(`Delete "${entry.title ?? 'this entry'}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/ruby/journal/${entry.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setStatus({ type: 'error', message: 'Could not delete this entry. Try again?' });
      return;
    }

    startTransition(() => router.push('/journal'));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-fade-in">
      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <Link href="/journal" className="btn-ghost min-h-[44px] border border-border/60 px-3">
          <span aria-hidden="true">←</span>
          Journal
        </Link>
        <div className="flex-1" />
        {entry && (
          <button type="button" onClick={deleteEntry} className="btn-danger min-h-[44px] text-sm">
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={isPending || !content.trim()}
          className="btn-primary min-h-[44px] px-5"
        >
          {isPending ? 'Saving...' : 'Save entry'}
        </button>
      </div>

      {/* Title + Content card */}
      <section className="card overflow-hidden">
        <div className="border-b border-border/60 bg-surface-alt/45 px-5 py-4">
          <label htmlFor="journal-title" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            Title, if you have one
          </label>
          <input
            id="journal-title"
            className="w-full border-none bg-transparent text-2xl font-bold text-text outline-none placeholder:text-subtle"
            placeholder="Untitled entry"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Preview / Write toggle */}
        <div className="flex items-center gap-2 border-b border-border/40 bg-surface-alt/20 px-5 py-2">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 transition-all ${
              !showPreview ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 transition-all ${
              showPreview ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'
            }`}
          >
            Preview
          </button>
        </div>

        <div className="px-5 py-4">
          {showPreview ? (
            <div className="prose prose-invert prose-sm min-h-[360px] max-w-none text-text leading-relaxed
              prose-headings:text-text prose-p:text-text prose-strong:text-text prose-em:text-muted
              prose-code:text-primary prose-code:bg-surface-alt prose-code:rounded prose-code:px-1
              prose-a:text-primary prose-blockquote:border-l-primary prose-blockquote:text-muted">
              {content.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <p className="text-subtle italic">Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <>
              <label htmlFor="journal-content" className="mb-3 block text-sm font-medium text-muted">
                Entry body <span className="text-subtle">(supports markdown)</span>
              </label>
              <textarea
                id="journal-content"
                className="min-h-[360px] w-full resize-none border-none bg-transparent text-base leading-relaxed text-text outline-none placeholder:text-subtle"
                placeholder="Write freely. No one else can read this unless you choose to share..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus={!entry}
              />
            </>
          )}
        </div>
      </section>

      {/* Mood selector */}
      <section className="rounded-xl border border-border/50 bg-surface/60 px-4 py-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          How does this moment feel?
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mood selector">
          {MOODS.map(({ emoji, label }) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setMood((prev) => (prev === emoji ? null : emoji))}
              aria-pressed={mood === emoji}
              aria-label={label}
              title={label}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                mood === emoji
                  ? 'border-primary bg-primary/15 text-text scale-105'
                  : 'border-border/50 bg-surface-alt/40 text-muted hover:border-border hover:text-text'
              }`}
            >
              <span className="text-base">{emoji}</span>
              <span className="text-[11px]">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Fronting member picker */}
      {members.length > 0 && (
        <section className="rounded-xl border border-border/50 bg-surface/60 px-4 py-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Who was fronting?
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Fronting members">
            {members.map((member) => (
              <MemberAvatar
                key={member.id}
                member={member}
                selected={frontingMemberIds.includes(member.id)}
                onToggle={() => toggleMember(member.id)}
              />
            ))}
          </div>
          {frontingMemberIds.length > 0 && (
            <p className="mt-2 text-[11px] text-subtle">
              {frontingMemberIds
                .map((id) => members.find((m) => m.id === id)?.name)
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </section>
      )}

      {/* Privacy toggle */}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/50 bg-surface/60 px-4 py-3 text-sm">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-primary"
        />
        <span className="flex-1">
          <span className="font-medium text-text">Mark as private</span>
          <span className="block text-xs text-muted">
            Private entries are never shared with friends or partners.
          </span>
        </span>
      </label>

      {/* Status message */}
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

      {/* Last saved timestamp */}
      {entry && (
        <p className="text-center text-xs text-subtle">
          Last updated{' '}
          {new Date(entry.updatedAt).toLocaleDateString('en-US', {
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
