'use client';

import Link from 'next/link';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { useEffect, useMemo, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mergeMembersWithFront(
  members: Omit<MemberItem, 'isFronting'>[],
  front: FrontEntryShape | null
): MemberItem[] {
  const frontingIds = new Set(front?.memberIds ?? []);
  return members.map((m) => ({ ...m, isFronting: frontingIds.has(m.id) }));
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({
  member,
  onToggle,
}: {
  member: MemberItem;
  onToggle: (member: MemberItem) => void;
}) {
  const accent = member.color ?? '#c084fc';
  const frontColor = 'rgb(var(--theme-front-rgb))';
  const isF = member.isFronting;
  const borderColor = isF ? 'rgb(var(--theme-front-rgb))' : accent;

  return (
    <li role="listitem"
      style={{
        aspectRatio: '3/5',
        filter: isF
          ? `drop-shadow(0 0 10px rgb(var(--theme-front-rgb) / 0.6)) drop-shadow(0 6px 20px rgba(0,0,0,0.8))`
          : `drop-shadow(0 0 4px ${accent}55) drop-shadow(0 6px 20px rgba(0,0,0,0.7))`,
        transition: 'filter 200ms ease, transform 200ms ease',
      }}
    >
      <div
        className="card-cut overflow-hidden h-full flex flex-col transition-transform duration-200 hover:-translate-y-1 active:scale-[0.97]"
        style={{ background: 'var(--theme-surface)' }}
      >
        {/* Polaroid photo + caption */}
        <Link
          href={`/members/${member.id}`}
          className="flex-1 min-h-0 flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
          aria-label={`View ${member.name}'s profile`}
        >
          {/* Photo — fills remaining space, inset creates the polaroid frame */}
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0 overflow-hidden">
              {/* Fronting badge */}
              {isF && (
                <span
                  className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                  style={{ backgroundColor: 'rgb(var(--theme-front-rgb))', color: '#09070f' }}
                >
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#09070f' }} />
                    <span className="relative h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#09070f' }} />
                  </span>
                  Front
                </span>
              )}

              {member.avatarUrl ? (
                <DynamicAvatarImage
                  src={member.avatarUrl}
                  alt={member.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center text-5xl font-black"
                  style={{
                    background: `linear-gradient(160deg, ${accent} 0%, color-mix(in srgb, ${accent} 25%, #100c1e) 100%)`,
                    color: 'rgba(255,255,255,0.9)',
                  }}
                  aria-hidden="true"
                >
                  {member.name[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
          </div>

          {/* Polaroid caption — fixed height regardless of content */}
          <div
            className="flex-none px-3 pt-2 pb-2"
            style={{ borderTop: `2px solid ${borderColor}`, marginTop: '6px' }}
          >
            <p className="font-black text-text text-sm leading-tight truncate">{member.name}</p>
            <p className="text-[11px] text-muted truncate mt-0.5 min-h-[14px]">
              {member.pronouns ?? ''}
            </p>
            <div className="flex flex-wrap gap-1 mt-1 min-h-[18px]">
              {member.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
              {member.tags.length > 2 && (
                <span className="text-[10px] text-subtle">+{member.tags.length - 2}</span>
              )}
            </div>
          </div>
        </Link>

        {/* Front toggle */}
        <button
          type="button"
          aria-label={isF ? `Remove ${member.name} from front` : `Add ${member.name} to front`}
          aria-pressed={isF}
          onClick={() => onToggle(member)}
          className="flex-none w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
          style={{
            background: `color-mix(in srgb, ${borderColor} 12%, var(--theme-surface))`,
            borderTop: `1px solid color-mix(in srgb, ${borderColor} 30%, transparent)`,
            color: borderColor,
          }}
        >
          {isF ? (
            <>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute h-full w-full rounded-full opacity-75" style={{ backgroundColor: frontColor }} />
                <span className="relative h-1.5 w-1.5 rounded-full" style={{ backgroundColor: frontColor }} />
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
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-front shadow-front-glow" />
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

  async function toggleFront(member: MemberItem) {
    const currentIds: string[] = frontData?.memberIds ?? [];
    const isCurrentlyFronting = currentIds.includes(member.id);
    const nextIds = isCurrentlyFronting
      ? currentIds.filter((id) => id !== member.id)
      : [...currentIds, member.id];

    // Optimistic update — UI flips instantly, before the network round-trip
    const optimisticFront: FrontEntryShape | null =
      nextIds.length === 0
        ? null
        : {
            id: frontData?.id ?? 'optimistic',
            memberIds: nextIds,
            startedAt: frontData?.startedAt ?? new Date().toISOString(),
            endedAt: null,
          };

    void globalMutate(swrKeys.front, optimisticFront, { revalidate: false });

    try {
      const init: RequestInit =
        nextIds.length === 0
          ? { method: 'DELETE' }
          : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ memberIds: nextIds }),
            };
      const res = await fetch('/api/front', init);
      if (!res.ok) throw new Error();
      revalidateMembersAndFront();
    } catch {
      // Revert by revalidating from the server
      void globalMutate(swrKeys.front);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-8 w-36" />
            <div className="skeleton h-3.5 w-24" />
          </div>
          <div className="skeleton h-10 w-28" style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="overflow-hidden border border-border/40"
              style={{ borderRadius: '10px' }}
            >
              <div className="skeleton h-[108px] rounded-none" />
              <div className="bg-surface p-3 space-y-2">
                <div className="skeleton h-3.5 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
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
            <h1 className="page-title">Members</h1>
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
              <div>
                <p className="section-header px-1 mb-3">In front · {frontingCount}</p>
                <ul role="list" className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {visibleMembers
                    .filter((m) => m.isFronting)
                    .map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        onToggle={toggleFront}
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
                      onToggle={toggleFront}
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
    </>
  );
}
