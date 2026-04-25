'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { FrontEntry } from '@/lib/db/schema';
import { revalidateFrontHistory, revalidateMembersAndFront } from '@/lib/swr';

type FrontMember = {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
};

interface Props {
  members: FrontMember[];
  activeFront: (Omit<FrontEntry, 'memberIds'> & { memberIds: string[] }) | null;
}

function MemberAvatar({ m, size }: { m: FrontMember; size: 'sm' | 'md' }) {
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

export default function FrontTracker({ members, activeFront }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(activeFront?.memberIds ?? []);
  const [note, setNote] = useState('');

  function toggleMember(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  async function startFront() {
    if (selected.length === 0) return;
    const res = await fetch('/api/front', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: selected, note: note.trim() || undefined }),
    });
    if (!res.ok) return;
    revalidateMembersAndFront();
    revalidateFrontHistory();
    startTransition(() => router.refresh());
  }

  async function endFront() {
    const res = await fetch('/api/front', { method: 'DELETE' });
    if (!res.ok) return;
    setSelected([]);
    revalidateMembersAndFront();
    revalidateFrontHistory();
    startTransition(() => router.refresh());
  }

  const frontingMembers = activeFront
    ? members.filter((m) => activeFront.memberIds.includes(m.id))
    : [];

  return (
    <div className="space-y-4">
      {/* Active front display */}
      {activeFront ? (
        <div className="card p-5 border-front/30 shadow-front-glow">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex rounded-full h-3 w-3 bg-front animate-pulse shadow-[0_0_8px_rgba(var(--color-front),0.5)]" aria-hidden="true" />
            <span className="sr-only">Active</span>
            <h2 className="text-lg font-semibold text-text tracking-tight">Currently Fronting</h2>
          </div>

          <div className="flex flex-wrap gap-3 mb-5">
            {frontingMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 bg-surface-alt/80 border border-border/50 rounded-full pr-4 pl-1.5 py-1.5 shadow-sm transition-all hover:bg-surface-alt">
                <MemberAvatar m={m} size="md" />
                <span className="text-base font-medium text-text">{m.name}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-4">
            <p className="text-sm font-medium text-muted">
              Since{' '}
              {new Date(activeFront.startedAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
            <button
              onClick={endFront}
              disabled={isPending}
              aria-label="End current front"
              className="btn-ghost border border-border/60 hover:border-border text-sm px-5 py-2.5 min-h-[44px] font-medium shadow-sm transition-all"
            >
              End front
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-5 border-dashed border-border/60 bg-surface/50">
          <h2 className="text-lg font-semibold text-text mb-1 tracking-tight">No one fronting</h2>
          <p className="text-muted text-base">Select members below to start tracking.</p>
        </div>
      )}

      {/* Member selector */}
      <div className="card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          {activeFront ? 'Switch front to:' : 'Start front with:'}
        </h2>

        {members.length === 0 ? (
          <p className="text-muted text-base bg-surface-alt p-4 rounded-xl border border-border/50">
            No members yet —{' '}
            <Link href="/members/new" className="text-primary font-medium hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded-sm outline-none">
              add one first
            </Link>
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {members.map((m) => {
                const isSelected = selected.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    aria-pressed={isSelected}
                    aria-label={`Toggle member ${m.name}`}
                    className={`flex items-center gap-3 rounded-xl p-2 min-h-[52px] border-2 transition-all duration-200 text-left text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg outline-none
                      ${isSelected
                        ? 'border-primary bg-primary/10 text-text shadow-sm'
                        : 'border-transparent bg-surface-alt text-muted hover:bg-surface-alt/80 hover:text-text'
                      }`}
                  >
                    <MemberAvatar m={m} size="sm" />
                    <span className="font-medium truncate leading-tight">{m.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-5 space-y-2">
              <label htmlFor="front-note" className="label text-sm font-medium">Note (optional)</label>
              <input
                id="front-note"
                className="input min-h-[44px] text-base px-4 py-2.5 bg-surface-alt/50 border-border/60 focus:bg-surface transition-colors"
                placeholder="Add context for this front session..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button
              onClick={startFront}
              disabled={selected.length === 0 || isPending}
              aria-label={activeFront ? 'Switch front' : 'Start front'}
              className="btn-primary w-full min-h-[48px] text-base font-semibold shadow-md transition-transform active:scale-[0.98]"
            >
              {activeFront ? 'Switch front' : 'Start front'}
              {selected.length > 0 && ` (${selected.length})`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
