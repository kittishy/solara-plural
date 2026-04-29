'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { apiFetcher, swrKeys } from '@/lib/swr';

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

function mergeMembersWithFront(
  members: Omit<MemberItem, 'isFronting'>[],
  front: FrontEntryShape | null
): MemberItem[] {
  const frontingIds = new Set(front?.memberIds ?? []);
  return members.map((m) => ({ ...m, isFronting: frontingIds.has(m.id) }));
}

export default function MembersClient({
  initialMembers,
  initialFront,
}: {
  initialMembers: Omit<MemberItem, 'isFronting'>[];
  initialFront: FrontEntryShape | null;
}) {
  const [query, setQuery] = useState('');

  const { data: membersData = initialMembers } = useSWR<Omit<MemberItem, 'isFronting'>[]>(
    swrKeys.members,
    apiFetcher,
    { fallbackData: initialMembers }
  );

  const { data: frontData = initialFront } = useSWR<FrontEntryShape | null>(
    swrKeys.front,
    apiFetcher,
    { fallbackData: initialFront }
  );

  const parsed = mergeMembersWithFront(membersData, frontData);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parsed;
    return parsed.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      (m.pronouns ?? '').toLowerCase().includes(q) ||
      (m.role ?? '').toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [parsed, query]);

  const isFiltering = query.trim().length > 0;

  const subtitle = isFiltering
    ? `${filtered.length} of ${parsed.length} member${parsed.length !== 1 ? 's' : ''}`
    : `${parsed.length} member${parsed.length !== 1 ? 's' : ''} in your system`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Members</h1>
          <p className="text-muted text-sm mt-0.5">{subtitle}</p>
        </div>
        <Link href="/members/new" className="btn-primary gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
          </svg>
          Add member
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative w-full">
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none select-none"
          aria-hidden="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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

      {parsed.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="stagger-children flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 shadow-glow mb-4" aria-hidden="true">
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
        <div className="grid gap-3 md:grid-cols-2 min-w-0">
          {filtered.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className={`card card-interactive p-4 flex items-start gap-4 transition-all duration-150 group
                ${member.isFronting
                  ? 'border-front/50 shadow-front-glow hover:shadow-front-glow'
                  : 'hover:shadow-glow hover:-translate-y-0.5'
                }`}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-bg flex-shrink-0 overflow-hidden"
                style={!member.avatarUrl ? {
                  backgroundColor: member.color ?? '#a78bfa',
                  boxShadow: `0 0 0 2px ${member.color ?? '#a78bfa'}40`
                } : undefined}
                aria-hidden="true"
              >
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  member.name[0].toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text">{member.name}</p>
                {member.pronouns && (
                  <p className="text-muted text-sm">{member.pronouns}</p>
                )}
                {member.role && (
                  <p className="text-subtle text-xs mt-0.5">{member.role}</p>
                )}
                {member.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {member.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                    {member.tags.length > 3 && (
                      <span className="text-xs text-subtle">+{member.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {member.isFronting && (
                  <div className="badge-front mt-2" aria-label="Currently fronting">
                    <span className="relative inline-flex h-2 w-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-front opacity-60 animate-pulse-ring" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-front shadow-[0_0_6px_rgba(249,168,212,0.7)]" />
                    </span>
                    IN FRONT
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
