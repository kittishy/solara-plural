'use client';

import Link from 'next/link';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { apiFetcher, revalidateMembersAndFront, swrKeys } from '@/lib/swr';
import { formatTimeSince } from '@/lib/client/format';

const INITIAL_VISIBLE_MEMBERS = 60;
const VISIBLE_MEMBERS_INCREMENT = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberItem = {
  id: string;
  name: string;
  pronouns: string | null;
  role: string | null;
  tags: string[];
  color: string | null;
  avatarUrl: string | null;
  isFronting: boolean;
};

type FrontEntryShape = {
  id: string;
  memberIds: string[];
  startedAt: Date | string;
  endedAt: Date | string | null;
};

type FrontAction = 'add' | 'set' | 'remove';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mergeMembersWithFront(
  members: Omit<MemberItem, 'isFronting'>[],
  front: FrontEntryShape | null
): MemberItem[] {
  const frontingIds = new Set(front?.memberIds ?? []);
  return members.map((m) => ({ ...m, isFronting: frontingIds.has(m.id) }));
}

// ─── BottomSheet ──────────────────────────────────────────────────────────────

function BottomSheet({
  member,
  frontData,
  onClose,
  onAction,
}: {
  member: MemberItem | null;
  frontData: FrontEntryShape | null;
  onClose: () => void;
  onAction: (member: MemberItem, action: FrontAction) => void;
}) {
  const [busy, setBusy] = useState(false);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = member !== null;

  // Focus first button when sheet opens
  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => firstButtonRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function handleAction(action: FrontAction) {
    if (!member || busy) return;
    setBusy(true);
    onAction(member, action);
    onClose();
    setBusy(false);
  }

  const isFronting = member?.isFronting ?? false;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm transition-opacity duration-300 md:hidden
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Front actions"
        aria-modal="true"
        style={{ background: 'var(--theme-surface)' }}
        className={`fixed bottom-0 inset-x-0 z-50 rounded-t-2xl border-t border-border shadow-2xl
          pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 mb-1" aria-hidden="true" />

        {/* Member name */}
        {member && (
          <p className="text-sm font-semibold text-text text-center px-4 py-3 border-b border-border/40">
            {member.name}
          </p>
        )}

        {/* Action buttons */}
        <div role="group" aria-label="Front options">
          {isFronting ? (
            <>
              <button
                ref={firstButtonRef}
                type="button"
                aria-label={`Remove ${member?.name ?? ''} from front`}
                disabled={busy}
                onClick={() => void handleAction('remove')}
                className="flex w-full items-center gap-4 px-6 min-h-[56px] transition-colors
                  hover:bg-surface-alt disabled:opacity-50"
                style={{ color: 'var(--zz-red)' }}
              >
                {/* Minus icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                <span className="text-sm font-medium">Remove from front</span>
              </button>

              <button
                type="button"
                aria-label={`Set ${member?.name ?? ''} as only front`}
                disabled={busy}
                onClick={() => void handleAction('set')}
                className="flex w-full items-center gap-4 px-6 min-h-[56px] text-text transition-colors
                  border-t border-border/40 hover:bg-surface-alt disabled:opacity-50"
              >
                {/* Sun icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
                <span className="text-sm font-medium">Set as only front</span>
              </button>
            </>
          ) : (
            <>
              <button
                ref={firstButtonRef}
                type="button"
                aria-label={`Add ${member?.name ?? ''} to front`}
                disabled={busy}
                onClick={() => void handleAction('add')}
                className="flex w-full items-center gap-4 px-6 min-h-[56px] text-text transition-colors
                  hover:bg-surface-alt disabled:opacity-50"
              >
                {/* Plus icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                <span className="text-sm font-medium">Add to front</span>
              </button>

              <button
                type="button"
                aria-label={`Set ${member?.name ?? ''} as front`}
                disabled={busy}
                onClick={() => void handleAction('set')}
                className="flex w-full items-center gap-4 px-6 min-h-[56px] text-text transition-colors
                  border-t border-border/40 hover:bg-surface-alt disabled:opacity-50"
              >
                {/* Sun icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
                <span className="text-sm font-medium">Set as front</span>
              </button>
            </>
          )}

          {/* No action — always last */}
          <button
            type="button"
            aria-label="Dismiss without action"
            onClick={onClose}
            className="flex w-full items-center gap-4 px-6 min-h-[56px] text-muted transition-colors
              border-t border-border/40 hover:bg-surface-alt"
          >
            {/* X icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span className="text-sm font-medium">No action</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({
  member,
  onOpenSheet,
}: {
  member: MemberItem;
  onOpenSheet: (member: MemberItem) => void;
}) {
  const isF = member.isFronting;
  const borderLeft = isF
    ? '4px solid var(--theme-primary)'
    : `3px solid ${member.color ?? 'var(--theme-border)'}`;

  return (
    <li role="listitem"
      style={{
        filter: isF
          ? `drop-shadow(0 0 8px rgb(var(--theme-primary-rgb) / 0.45)) drop-shadow(0 4px 16px rgba(0,0,0,0.7))`
          : `drop-shadow(0 0 3px ${member.color ?? 'var(--theme-border)'}) drop-shadow(0 4px 16px rgba(0,0,0,0.6))`,
        transition: 'filter 200ms ease, transform 200ms ease',
      }}
    >
      <div
        className="card-cut overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
      >
        {/* Portrait zone */}
        <Link
          href={`/members/${member.id}`}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
          aria-label={`View ${member.name}'s profile`}
        >
          <div
            className="relative flex items-center justify-center py-8"
            style={{
              background: `linear-gradient(180deg, ${member.color ?? '#2E3036'} 0%, color-mix(in srgb, ${member.color ?? '#2E3036'} 18%, #100c1e) 100%)`,
            }}
          >
            {/* Fronting badge */}
            {isF && (
              <span
                className="absolute top-2 left-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                style={{ backgroundColor: 'var(--theme-primary)', color: '#09070f' }}
              >
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#09070f' }} />
                  <span className="relative h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#09070f' }} />
                </span>
                Front
              </span>
            )}

            {/* Avatar */}
            {member.avatarUrl ? (
              <DynamicAvatarImage
                src={member.avatarUrl}
                alt={member.name}
                className="w-[76px] h-[76px] rounded-xl object-cover shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
              />
            ) : (
              <span
                className="flex w-[76px] h-[76px] items-center justify-center rounded-xl text-3xl font-black shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
                style={{ backgroundColor: member.color ?? '#2E3036', color: 'var(--theme-surface)' }}
                aria-hidden="true"
              >
                {member.name[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>

          {/* Info area */}
          <div style={{ background: 'var(--theme-surface)', borderTop: borderLeft }}
            className="px-3 pt-2.5 pb-2"
          >
            <p className="font-black text-text text-sm leading-tight truncate">{member.name}</p>
            {member.pronouns && (
              <p className="text-[11px] text-muted truncate mt-0.5">{member.pronouns}</p>
            )}
            {member.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {member.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
                {member.tags.length > 2 && (
                  <span className="text-[10px] text-subtle">+{member.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </Link>

        {/* Front action strip */}
        <button
          type="button"
          aria-label={`Front actions for ${member.name}`}
          aria-haspopup="dialog"
          onClick={() => onOpenSheet(member)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
          style={{
            background: isF
              ? 'rgb(var(--theme-primary-rgb) / 0.1)'
              : `color-mix(in srgb, ${member.color ?? 'var(--theme-border)'} 10%, var(--theme-surface))`,
            borderTop: isF
              ? '1px solid rgb(var(--theme-primary-rgb) / 0.3)'
              : `1px solid color-mix(in srgb, ${member.color ?? 'var(--theme-border)'} 25%, transparent)`,
            color: isF ? 'var(--theme-primary)' : (member.color ?? 'var(--theme-muted)'),
          }}
        >
          {isF ? (
            <>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              In Front
            </>
          ) : '+ Front'}
        </button>
      </div>
    </li>
  );
}

// ─── FrontStatusBar ───────────────────────────────────────────────────────────

function FrontStatusBar({
  front,
  count,
}: {
  front: FrontEntryShape;
  count: number;
}) {
  const [ending, setEnding] = useState(false);

  async function endFront(e: React.MouseEvent) {
    e.preventDefault();
    if (ending) return;
    setEnding(true);
    try {
      const res = await fetch('/api/front', { method: 'DELETE' });
      if (res.ok) revalidateMembersAndFront();
    } finally {
      setEnding(false);
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-3 border border-primary/30 rounded-xl px-4 py-2.5"
      style={{ background: 'rgb(var(--theme-primary-rgb) / 0.05)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative inline-flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-50 animate-pulse" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <span className="text-sm font-bold text-primary tracking-wide">
          {count === 1 ? '1 IN FRONT' : `${count} IN FRONT`}
        </span>
        <span className="text-subtle text-xs" aria-hidden="true">·</span>
        <span className="text-muted text-xs truncate">
          {formatTimeSince(front.startedAt)}
        </span>
      </div>
      <button
        type="button"
        aria-label="End current front session"
        onClick={endFront}
        disabled={ending}
        className="btn-ghost flex-shrink-0 text-xs px-3 py-1 min-h-[32px] disabled:opacity-50"
      >
        {ending ? 'Ending…' : 'End front'}
      </button>
    </div>
  );
}

// ─── MembersClient ────────────────────────────────────────────────────────────

export default function MembersClient({
  initialMembers,
  initialFront,
}: {
  initialMembers: Omit<MemberItem, 'isFronting'>[];
  initialFront: FrontEntryShape | null;
}) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MEMBERS);
  const [sheetMember, setSheetMember] = useState<MemberItem | null>(null);

  const { data: membersData = initialMembers } = useSWR<Omit<MemberItem, 'isFronting'>[]>(
    swrKeys.members,
    apiFetcher,
    { fallbackData: initialMembers, revalidateOnMount: false }
  );

  const { data: frontData = initialFront } = useSWR<FrontEntryShape | null>(
    swrKeys.front,
    apiFetcher,
    { fallbackData: initialFront, revalidateOnMount: false }
  );

  const isLoading = !membersData && !initialMembers;

  const parsed = useMemo(
    () => mergeMembersWithFront(membersData, frontData),
    [membersData, frontData]
  );

  const isFiltering = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parsed;
    return parsed.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.pronouns ?? '').toLowerCase().includes(q) ||
        (m.role ?? '').toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [parsed, query]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_MEMBERS);
  }, [query]);

  const hasFront = (frontData?.memberIds?.length ?? 0) > 0;

  const orderedMembers = useMemo(() => {
    if (isFiltering) return filtered;
    return [
      ...filtered.filter((m) => m.isFronting),
      ...filtered.filter((m) => !m.isFronting),
    ];
  }, [filtered, isFiltering]);

  const frontingCount = useMemo(
    () => parsed.filter((m) => m.isFronting).length,
    [parsed]
  );

  const visibleMembers = orderedMembers.slice(0, visibleCount);
  const hasMore = visibleCount < orderedMembers.length;

  const subtitle = isFiltering
    ? `${filtered.length} of ${parsed.length} member${parsed.length !== 1 ? 's' : ''}`
    : `${parsed.length} member${parsed.length !== 1 ? 's' : ''} in your system`;

  async function executeAction(member: MemberItem, action: FrontAction) {
    try {
      if (action === 'remove') {
        const remaining = (frontData?.memberIds ?? []).filter((id) => id !== member.id);
        if (remaining.length === 0) {
          const res = await fetch('/api/front', { method: 'DELETE' });
          if (!res.ok) throw new Error();
        } else {
          const res = await fetch('/api/front', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberIds: remaining }),
          });
          if (!res.ok) throw new Error();
        }
      } else {
        const currentIds: string[] = frontData?.memberIds ?? [];
        const memberIds =
          action === 'add'
            ? Array.from(new Set([...currentIds, member.id]))
            : [member.id];
        const res = await fetch('/api/front', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberIds }),
        });
        if (!res.ok) throw new Error();
      }
      revalidateMembersAndFront();
    } catch {
      // Silently fail — optimistic UI updates will revert on next revalidation
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-32 animate-pulse rounded-lg bg-surface-alt" />
            <div className="h-4 w-24 animate-pulse rounded-lg bg-surface-alt" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="card overflow-hidden"
            >
              <div className="h-[108px] animate-pulse bg-surface-alt/60" />
              <div className="bg-surface p-3 space-y-2">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-alt" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-alt" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-black text-text"
              style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Members
            </h1>
            <p className="text-muted text-xs font-bold uppercase tracking-widest mt-1">{subtitle}</p>
          </div>
          <Link href="/members/new" className="btn-primary gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            Add member
          </Link>
        </div>

        {/* Slim front status bar */}
        {hasFront && frontData && !isFiltering && (
          <FrontStatusBar front={frontData} count={frontingCount} />
        )}

        {/* Search */}
        <div className="relative w-full">
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none select-none"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members..."
            aria-label="Search members by name, pronouns, role, or tags"
            className="input pl-10 pr-10"
          />
          {isFiltering && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-0 top-1/2 -translate-y-1/2 text-muted hover:text-text
                transition-colors duration-150 w-11 h-11 flex items-center justify-center
                sm:w-8 sm:h-8 sm:right-2"
            >
              ×
            </button>
          )}
        </div>

        {/* Member list */}
        {parsed.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in">
            <div className="stagger-children flex flex-col items-center">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 shadow-glow mb-4"
                aria-hidden="true"
              >
                <span className="text-3xl">+</span>
              </div>
              <p className="text-text font-semibold">No members yet</p>
              <p className="text-muted text-sm mt-2 mb-6">
                Your system members will appear here. Add your first one to get started.
              </p>
              <Link href="/members/new" className="btn-primary">
                Add your first member
              </Link>
            </div>
          </div>
        ) : isFiltering && filtered.length === 0 ? (
          <div className="card p-10 text-center animate-fade-in">
            <p className="text-muted text-sm">
              No members found for{' '}
              <span className="text-text font-medium">&quot;{query.trim()}&quot;</span>
              {' '}— try a different name
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {!isFiltering && frontingCount > 0 && (
              <div>
                <p className="section-header px-1 mb-3">In front · {frontingCount}</p>
                <ul role="list" className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {visibleMembers
                    .filter((m) => m.isFronting)
                    .map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        onOpenSheet={setSheetMember}
                      />
                    ))}
                </ul>
              </div>
            )}

            <div>
              {!isFiltering && frontingCount > 0 && (
                <p className="section-header px-1 mb-3">
                  All members · {orderedMembers.filter((m) => !m.isFronting).length}
                </p>
              )}
              <ul role="list" className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {visibleMembers
                  .filter((m) => isFiltering || !m.isFronting)
                  .map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      onOpenSheet={setSheetMember}
                    />
                  ))}
              </ul>
            </div>

            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + VISIBLE_MEMBERS_INCREMENT)}
                className="btn-ghost min-h-[48px] w-full justify-center border border-border/60"
              >
                Show more members ({orderedMembers.length - visibleMembers.length} remaining)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom sheet — rendered outside the main flow, fixed to viewport */}
      <BottomSheet
        member={sheetMember}
        frontData={frontData}
        onClose={() => setSheetMember(null)}
        onAction={(member, action) => void executeAction(member, action)}
      />
    </>
  );
}
