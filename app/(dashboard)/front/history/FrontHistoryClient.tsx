'use client';

import { useMemo, useState, useTransition } from 'react';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
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

function relativeDate(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function MemberAvatar({ m, size }: { m: HistoryMember; size: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  if (m.avatarUrl) {
    return (
      <DynamicAvatarImage
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(makeDraft());

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

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
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Front History</h1>
          <p className="text-muted text-sm mt-0.5">
            {history.length} {history.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary min-h-[44px] px-5 text-sm font-medium"
        >
          Add retroactive entry
        </button>
      </div>

      {/* Editor card */}
      {(creating || activeEntry) && (
        <div className="card p-5 md:p-6 space-y-6 border-primary/20 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-primary/10 border-l-4 border-l-primary/50">
          <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-text tracking-tight">
                {creating ? 'New retroactive entry' : 'Edit entry'}
              </h2>
              <p className="text-muted text-sm mt-1">
                Adjust times, members, or the note for this session.
              </p>
            </div>
            <button
              type="button"
              aria-label="Cancel editor"
              onClick={cancelEditor}
              className="btn-ghost border border-border/60 hover:bg-surface-alt px-4 py-2 min-h-[44px] text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="startedAt" className="label text-sm font-medium">
                Started at
              </label>
              <input
                id="startedAt"
                type="datetime-local"
                className="input min-h-[44px] px-4 text-base bg-surface-alt/50 border-border/60 focus:bg-surface transition-colors"
                value={draft.startedAt}
                onChange={(e) => setDraft((prev) => ({ ...prev, startedAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endedAt" className="label text-sm font-medium">
                Ended at
              </label>
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
                    className={`relative flex items-center gap-3 rounded-xl p-2 min-h-[52px] border-2 text-left text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg outline-none ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-text shadow-sm ring-2 ring-primary/40'
                        : 'border-transparent bg-surface-alt text-muted hover:bg-surface-alt/80 hover:text-text'
                    }`}
                  >
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1 right-1.5 text-primary text-[10px] font-bold leading-none"
                      >
                        ✓
                      </span>
                    )}
                    <MemberAvatar m={member} size="sm" />
                    <span className="font-medium truncate leading-tight">{member.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="note" className="label text-sm font-medium block">
              Note (optional)
            </label>
            <input
              id="note"
              className="input min-h-[44px] px-4 py-2.5 text-base bg-surface-alt/50 border-border/60 focus:bg-surface transition-colors"
              placeholder="Add context for this front session..."
              value={draft.note}
              onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={submitDraft}
              disabled={isPending}
              className="btn-primary min-h-[48px] px-6 text-base font-semibold shadow-md transition-transform active:scale-[0.98]"
            >
              {creating ? 'Save retroactive entry' : 'Save changes'}
            </button>
            {status && (
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${
                  status.type === 'success'
                    ? 'text-success bg-success/10'
                    : status.type === 'error'
                      ? 'text-error bg-error/10'
                      : 'text-muted bg-surface-alt'
                }`}
                role={status.type === 'error' ? 'alert' : 'status'}
              >
                {status.type === 'success' && (
                  <span aria-hidden="true" className="font-bold">✓</span>
                )}
                {status.type === 'error' && (
                  <span aria-hidden="true" className="font-bold">!</span>
                )}
                {status.type === 'info' && (
                  <span aria-hidden="true" className="font-bold">…</span>
                )}
                {status.message}
              </span>
            )}
          </div>
        </div>
      )}

      {/* History list */}
      {history.length === 0 ? (
        <div className="card p-10 text-center border-dashed border-border/60 bg-surface/50">
          <div className="flex justify-center mb-4" aria-hidden="true">
            <svg
              width="56"
              height="56"
              viewBox="0 0 56 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-40"
            >
              <circle cx="28" cy="28" r="26" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 3" />
              <circle cx="28" cy="28" r="18" fill="#a78bfa" fillOpacity="0.08" />
              <path d="M28 18v10l6 4" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="28" cy="28" r="2" fill="#f9a8d4" />
            </svg>
          </div>
          <p className="text-text font-semibold text-lg tracking-tight">Nothing here yet</p>
          <p className="text-muted text-base mt-2 leading-relaxed">
            Your front history will live here —{' '}
            <span className="text-primary/80">cozy and organized.</span>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const entryMembers = entry.memberIds.map((id) => memberMap[id]).filter(Boolean);
            const accentColor = entryMembers[0]?.color ?? '#a78bfa';
            const isExpanded = expandedId === entry.id;
            const startDate = new Date(entry.startedAt);
            const endDate = new Date(entry.endedAt ?? entry.startedAt);

            return (
              <div
                key={entry.id}
                className={`card border-l-[3px] transition-all duration-200 shadow-sm ${isExpanded ? 'border-border/80 shadow-md' : 'hover:border-border/80 hover:shadow-md hover:-translate-y-[1px]'}`}
                style={{ borderLeftColor: accentColor }}
              >
                {/* Clickable summary row */}
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`entry-details-${entry.id}`}
                  onClick={() => toggleExpand(entry.id)}
                  className="w-full text-left p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-xl"
                >
                  <div className="flex items-center gap-4 justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Avatar stack */}
                      <div className="flex -space-x-3 flex-shrink-0 pt-0.5">
                        {entryMembers.slice(0, 3).map((m) =>
                          m.avatarUrl ? (
                            <DynamicAvatarImage
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
                        )}
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
                        <p className="text-xs text-muted mt-0.5">{relativeDate(startDate)}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-sm text-muted">{formatFrontEntryRange(entry)}</span>
                          <span
                            className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold"
                            aria-label={`Duration: ${formatDuration(startDate, endDate)}`}
                          >
                            {formatDuration(startDate, endDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Chevron indicator */}
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`flex-shrink-0 text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </button>

                {/* Expanded details panel */}
                {isExpanded && (
                  <div
                    id={`entry-details-${entry.id}`}
                    className="px-4 pb-4 pt-0 border-t border-border/40 mt-0 space-y-4"
                  >
                    {/* Members with colors */}
                    <div className="pt-4 space-y-2">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Members</p>
                      <div className="flex flex-wrap gap-2">
                        {entryMembers.length > 0 ? entryMembers.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-surface-alt border border-border/50"
                          >
                            <MemberAvatar m={m} size="sm" />
                            <span className="text-text">{m.name}</span>
                          </span>
                        )) : (
                          <span className="text-sm text-muted italic">No members recorded</span>
                        )}
                      </div>
                    </div>

                    {/* Time details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-alt/60 rounded-xl p-3 border border-border/30">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Started</p>
                        <p className="text-sm font-medium text-text">
                          {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="bg-surface-alt/60 rounded-xl p-3 border border-border/30">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Ended</p>
                        <p className="text-sm font-medium text-text">
                          {entry.endedAt
                            ? endDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                            : <span className="text-primary">Still fronting</span>}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {entry.endedAt
                            ? endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Note */}
                    {entry.note ? (
                      <div className="bg-surface-alt/40 rounded-xl p-3 border border-border/30">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Note</p>
                        <p className="text-sm text-text/90 leading-relaxed italic">&ldquo;{entry.note}&rdquo;</p>
                      </div>
                    ) : (
                      <p className="text-xs text-subtle italic">No note for this session.</p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        aria-label={`Edit entry from ${formatFrontEntryRange(entry)}`}
                        className="btn-ghost border border-border/60 hover:bg-surface-alt px-4 py-2 min-h-[40px] text-sm font-medium transition-colors"
                        onClick={() => openEdit(entry)}
                      >
                        Edit this entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
