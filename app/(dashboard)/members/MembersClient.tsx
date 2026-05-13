'use client';

import Link from 'next/link';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
        className={`fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-surface border-t border-border shadow-2xl
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
                className="flex w-full items-center gap-4 px-6 min-h-[56px] text-error/90 transition-colors
                  hover:bg-surface-alt disabled:opacity-50"
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

// ─── MemberRow ────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  onOpenSheet,
}: {
  member: MemberItem;
  onOpenSheet: (member: MemberItem) => void;
}) {
  const accentColor = member.color ?? '#b48efa';
  const frontColor = '#f472b6';
  const borderColor = member.isFronting ? frontColor : accentColor;

  return (
    <li
      role="listitem"
      className={`relative flex items-center border-b border-border/40 transition-colors duration-150
        ${member.isFronting ? 'bg-front/[0.06]' : 'bg-surface hover:bg-surface-alt/70'}`}
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <Link
        href={`/members/${member.id}`}
        className="flex flex-1 items-center gap-3 px-3.5 py-3 pr-14 min-w-0 focus:outline-none
          focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset"
      >
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center
            text-base font-bold text-bg"
          style={!member.avatarUrl ? {
            backgroundColor: accentColor,
            boxShadow: `0 0 0 2px color-mix(in srgb, ${member.isFronting ? frontColor : accentColor} 35%, transparent)`,
          } : {
            boxShadow: `0 0 0 2px color-mix(in srgb, ${member.isFronting ? frontColor : accentColor} 35%, transparent)`,
          }}
          aria-hidden="true"
        >
          {member.avatarUrl ? (
            <DynamicAvatarImage
              src={member.avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            member.name[0]?.toUpperCase() ?? '?'
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-bold text-text text-sm leading-snug truncate">
              {member.name}
            </p>
            {member.isFronting && (
              <span className="relative inline-flex h-2 w-2 flex-shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-front opacity-60 animate-pulse" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-front" />
              </span>
            )}
          </div>
          {member.pronouns && (
            <p className="text-muted text-xs leading-snug truncate mt-0.5">
              {member.pronouns}
            </p>
          )}
          {member.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5" aria-label="Tags">
              {member.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none
                    bg-primary/10 border border-primary/25 text-primary-glow"
                >
                  {tag}
                </span>
              ))}
              {member.tags.length > 3 && (
                <span className="text-[11px] text-subtle">+{member.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* action button */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <button
          type="button"
          aria-label={`Actions for ${member.name}`}
          aria-haspopup="dialog"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenSheet(member);
          }}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] w-9 h-9 rounded-lg
            border border-border/60 bg-surface-alt text-muted
            hover:border-primary/40 hover:text-primary-glow
            active:scale-95 transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <svg
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
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{
        background: 'rgb(var(--theme-front-soft-rgb) / 0.18)',
        border: '1px solid rgb(var(--theme-front-rgb) / 0.35)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative inline-flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-front opacity-50 animate-pulse" />
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-front" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-front shadow-[0_0_8px_rgba(244,114,182,0.8)]" />
        </span>
        <span className="text-sm font-bold text-front tracking-wide">
          {count === 1 ? '1 IN FRONT' : `${count} IN FRONT`}
        </span>
        <span className="text-subtle text-xs" aria-hidden="true">·</span>
        <span className="text-front/60 text-xs truncate">
          {formatTimeSince(front.startedAt)}
        </span>
      </div>
      <button
        type="button"
        aria-label="End current front session"
        onClick={endFront}
        disabled={ending}
        className="flex-shrink-0 rounded-lg border border-front/30 px-3 py-1 text-xs font-semibold text-front/80
          transition-colors hover:border-front/60 hover:text-front disabled:opacity-50"
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
        <div className="rounded-xl overflow-hidden border border-border/40">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[72px] animate-pulse bg-surface-alt/60 border-b border-border/40 last:border-0"
            />
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
            <h1 className="text-2xl font-bold text-text">Members</h1>
            <p className="text-muted text-sm mt-0.5">{subtitle}</p>
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
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-2.5
              text-text placeholder:text-subtle text-sm
              focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30
              transition-all duration-150"
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
                <span className="text-3xl">💜</span>
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
              {' '}— try a different name 💜
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {!isFiltering && frontingCount > 0 && (
              <p className="section-header px-1">
                In front · {frontingCount}
              </p>
            )}
            <ul
              role="list"
              className="rounded-xl overflow-hidden border border-border/50 shadow-card"
            >
              {visibleMembers.map((member, idx) => {
                const prevMember = visibleMembers[idx - 1];
                const showDivider =
                  !isFiltering &&
                  frontingCount > 0 &&
                  idx > 0 &&
                  !member.isFronting &&
                  prevMember?.isFronting;
                return (
                  <Fragment key={member.id}>
                    {showDivider && (
                      <li role="presentation" className="px-4 py-2 border-b border-border/40 bg-surface-alt/40">
                        <p className="section-header text-[10px]">
                          All members · {orderedMembers.filter(m => !m.isFronting).length}
                        </p>
                      </li>
                    )}
                    <MemberRow
                      member={member}
                      onOpenSheet={setSheetMember}
                    />
                  </Fragment>
                );
              })}
            </ul>

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
