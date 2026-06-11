import type { FrontEntry } from '@/lib/db/schema';

export type FrontTier = 'primary' | 'co-front' | 'co-conscious';

export interface FrontMember {
  memberId: string;
  tier: FrontTier;
}

export type FrontEntryWithMemberIds = Omit<FrontEntry, 'memberIds'> & {
  memberIds: string[];
  members: FrontMember[];
};

// Parse the stored JSON into FrontMember[]. Backward-compatible: bare strings
// from old entries are treated as tier "primary".
export function parseFrontMembers(value: string): FrontMember[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item): FrontMember => {
    if (typeof item === 'string') return { memberId: item, tier: 'primary' };
    if (
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).memberId === 'string'
    ) {
      const raw = (item as Record<string, unknown>).tier;
      const tier: FrontTier =
        raw === 'co-front' || raw === 'co-conscious' ? raw : 'primary';
      return { memberId: (item as Record<string, unknown>).memberId as string, tier };
    }
    return { memberId: String(item), tier: 'primary' };
  });
}

export function serializeFrontMembers(members: FrontMember[]): string {
  return JSON.stringify(members);
}

// Extract bare IDs from a FrontMember[] (used by PluralKit sync, notifications).
export function getMemberIds(members: FrontMember[]): string[] {
  return members.map((m) => m.memberId);
}

// Legacy helpers kept as thin aliases so callers that aren't updated yet still compile.
export function parseMemberIds(value: string): string[] {
  return getMemberIds(parseFrontMembers(value));
}

export function safeParseMemberIds(value: string): string[] {
  return getMemberIds(parseFrontMembers(value));
}

export function serializeMemberIds(memberIds: string[]): string {
  return serializeFrontMembers(memberIds.map((id) => ({ memberId: id, tier: 'primary' as FrontTier })));
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDuration(start: Date, end: Date): string {
  const mins = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

export function formatFrontEntryRange(entry: Pick<FrontEntry, 'startedAt' | 'endedAt'>): string {
  const start = new Date(entry.startedAt);
  const end = entry.endedAt ? new Date(entry.endedAt) : null;
  const dateLabel = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const startLabel = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return end
    ? `${dateLabel} · ${startLabel} to ${end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : `${dateLabel} · ${startLabel}`;
}
