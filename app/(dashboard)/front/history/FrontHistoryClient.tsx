'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDuration, formatFrontEntryRange, toDatetimeLocalValue } from '@/lib/front';
import { revalidateFrontHistory, revalidateMembersAndFront } from '@/lib/swr';

type Entry = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  note: string | null;
  memberIds: string[];
};

type HistoryMember = {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
};

type Draft = {
  memberIds: string[];
  startedAt: string;
  endedAt: string;
  note: string;
};

const makeDraft = (entry?: Entry): Draft => ({
  memberIds: entry?.memberIds ?? [],
  startedAt: toDatetimeLocalValue(entry ? new Date(entry.startedAt) : new Date(Date.now() - 60 * 60 * 1000)),
  endedAt: toDatetimeLocalValue(entry ? new Date(entry.endedAt ?? entry.startedAt) : new Date()),
  note: entry?.note ?? '',
});

function MemberAvatar({ m, size }: { m: HistoryMember; size: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  if (m.avatarUrl) {
    return (
      <img
        src={m.avatarUrl}
        alt={m.name}
        className={`${cls} rounded-full object-cover flex-shrink-0 ring-1 ring-border/50`}
      />
    );
  }
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-bold text-bg flex-shrink-0 ring-1 ring-border/50`}
      style={{ backgroundColor: m.color ?? '#a78bfa' }}
    >
      {m.name[0].toUpperCase()}
    </div>
  );
}

export default function FrontHistoryClient({
  history,
  members,
}: {
  history: Entry[];
  members: HistoryMember[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(makeDraft());

  const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const activeEntry = editingId ? history.find((entry) => entry.id === editingId) : null;

  function openCreate() {
    setCreating(true);
    setEditingId(null);
    setDraft(makeDraft());
    setStatus(null);
  }

  function openEdit(entry: Entry) {
    setCreating(false);
    setEditingId(entry.id);
    setDraft(makeDraft(entry));
    setStatus(null);
  }

  function cancelEditor() {
    setCreating(false);
    setEditingId(null);
    setStatus(null);
  }

  async function submitDraft() {
    if (draft.memberIds.length === 0) {
      setStatus({ type: 'error', message: 'Select at least one member.' });
      return;
    }

    const payload = {
      memberIds: draft.memberIds,
      startedAt: draft.startedAt,
      endedAt: draft.endedAt,
      note: draft.note.trim() || undefined,
    };

    setStatus({ type: 'info', message: creating ? 'Saving retroactive entry...' : 'Saving changes...' });

    const res = await fetch(
      creating ? '/api/front/history' : `/api/front/history/${editingId}`,
      {
        method: creating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      setStatus({
        type: 'error',
        message: body?.error ?? 'Save failed. Please try again.',
      });
      return;
    }

    setStatus({
      type: 'success',
      message: creating ? 'Retroactive entry saved.' : 'Front history entry updated.',
    });
    revalidateFrontHistory();
    revalidateMembersAndFront();
    cancelEditor();
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/front"
            aria-label="Back to current front"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border/60 bg-surface/70 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-primary/40 hover:bg-surface-alt hover:text-text"
          >
            <span aria-hidden="true">?</span>
            Current front
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text tracking-tight">Front History</h1>
            <p className="text-sm text-muted mt-0.5">{history.length} entries recorded</p>
          </div>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary min-h-[44px] px-5 text-sm font-medium shadow-sm transition-transform active:scale-[0.98]">
          Add retroactive entry
        </button>
      </div>

      {/* Editor card */}
      {(creating || activeEntry) && (
        <div className="card p-5 md:p-6 space-y-6 border-primary/20 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-primary/10">
          <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-text tracking-tight">
                {creating ? 'New retroactive entry' : 'Edit entry'}
              </h2>
              <p className="text-muted text-sm mt-1">Adjust times, members, or the note for this session.</p>
            </div>
            <button type="button" aria-label="Cancel editor" onClick={cancelEditor} className="btn-ghost border border-border/60 hover:bg-surface-alt px-4 py-2 min-h-[44px] text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="startedAt" className="label text-sm font-medium">Started at</label>
              <input
                id="startedAt"
                type="datetime-local"
                className="input min-h-[44px] px-4 text-base bg-surface-alt/50 border-border/60 focus:bg-surface transition-colors"
                value={draft.startedAt}
                onChange={(e) => setDraft((prev) => ({ ...prev, startedAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endedAt" className="label text-sm font-medium">Ended at</label>
              <input
                id="endedAt"
                type="datetime-local"
                className="input min-h-[44px] px-4 text-base bg-surface-alt/50 border-border/60 focus:bg-surface transition-colors"
                value={draft.endedAt}
                onChange={(e) => setDraft((prev) => ({ ...prev, endedAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <span className="label text-sm font-medium block">Members</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {members.map((member) => {
                const isSelected = draft.memberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        memberIds: isSelected
                          ? prev.memberIds.filter((id) => id !== member.id)
                          : [...prev.memberIds, member.id],
                      }))
                    }
                    aria-pressed={isSelected}
                    aria-label={`Toggle member ${member.name}`}
                    className={`flex items-center gap-3 rounded-xl p-2 min-h-[52px] border-2 text-left text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg outline-none ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-text shadow-sm'
                        : 'border-transparent bg-surface-alt text-muted hover:bg-surface-alt/80 hover:text-text'
                    }`}
                  >
                    <MemberAvatar m={member} size="sm" />
                    <span className="font-medium truncate leading-tight">{member.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="note" className="label text-sm font-medium block">Note (optional)</label>
            <input
              id="note"
              className="input min-h-[44px] px-4 py-2.5 text-base bg-surface-alt/50 border-border/60 focus:bg-surface transition-colors"
              placeholder="Add context for this front session..."
              value={draft.note}
              onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button type="button" onClick={submitDraft} disabled={isPending} className="btn-primary min-h-[48px] px-6 text-base font-semibold shadow-md transition-transform active:scale-[0.98]">
              {creating ? 'Save retroactive entry' : 'Save changes'}
            </button>
            {status && (
              <p
                className={`text-sm font-medium px-3 py-1.5 rounded-md ${
                  status.type === 'success'
                    ? 'text-success bg-success/10'
                    : status.type === 'error'
                      ? 'text-error bg-error/10'
                      : 'text-muted bg-surface-alt'
                }`}
                role={status.type === 'error' ? 'alert' : 'status'}
              >
                {status.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* History list */}
      {history.length === 0 ? (
        <div className="card p-10 text-center border-dashed border-border/60 bg-surface/50">
          <p className="text-3xl mb-4">✨</p>
          <p className="text-text font-semibold text-lg tracking-tight">No history yet</p>
          <p className="text-muted text-base mt-2">Front history will appear here as you track.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const entryMembers = entry.memberIds.map((id) => memberMap[id]).filter(Boolean);
            return (
              <div key={entry.id} className="card p-4 hover:border-border/80 transition-colors shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    {/* Avatar stack */}
                    <div className="flex -space-x-3 flex-shrink-0 pt-0.5">
                      {entryMembers.slice(0, 3).map((m) => (
                        m.avatarUrl ? (
                          <img
                            key={m.id}
                            src={m.avatarUrl}
                            alt={m.name}
                            title={m.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-surface ring-1 ring-border/20"
                          />
                        ) : (
                          <div
                            key={m.id}
                            title={m.name}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-bg border-2 border-surface ring-1 ring-border/20"
                            style={{ backgroundColor: m.color ?? '#a78bfa' }}
                          >
                            {m.name[0].toUpperCase()}
                          </div>
                        )
                      ))}
                      {entryMembers.length > 3 && (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-surface-alt text-muted border-2 border-surface ring-1 ring-border/20">
                          +{entryMembers.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 py-0.5">
                      <p className="text-base font-semibold text-text leading-tight">
                        {entryMembers.map((m) => m.name).join(', ') || 'Unknown members'}
                      </p>
                      <p className="text-sm text-muted mt-1.5">
                        {formatFrontEntryRange(entry)}
                        <span className="inline-block mx-2 text-border">•</span>
                        <span className="font-medium text-text/80">{formatDuration(new Date(entry.startedAt), new Date(entry.endedAt ?? entry.startedAt))}</span>
                      </p>
                      {entry.note && (
                        <p className="text-sm text-subtle italic mt-2 bg-surface-alt/50 px-3 py-1.5 rounded-md border border-border/30 inline-block">&ldquo;{entry.note}&rdquo;</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={`Edit entry from ${formatFrontEntryRange(entry)}`}
                    className="btn-ghost border border-border/60 hover:bg-surface-alt px-4 py-2 min-h-[44px] text-sm font-medium transition-colors sm:self-start w-full sm:w-auto"
                    onClick={() => openEdit(entry)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

