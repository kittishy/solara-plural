import type { FrontEntry } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Front tiers (primary / co-front / co-conscious)
// ---------------------------------------------------------------------------
export const FRONT_TIERS = ['primary', 'cofront', 'coconscious'] as const;
export type FrontTier = (typeof FRONT_TIERS)[number];

export const TIER_CONFIG: Record<FrontTier, { label: string; labelPt: string; color: string; shortLabel: string }> = {
  primary:      { label: 'Primary',    labelPt: 'Primário',      color: '#007AFF', shortLabel: 'P' },
  cofront:      { label: 'Co-front',   labelPt: 'Co-front',      color: '#34C759', shortLabel: 'CF' },
  coconscious:  { label: 'Co-conscious', labelPt: 'Co-consciente', color: '#8E8E93', shortLabel: 'CC' },
};

export function isFrontTier(value: string): value is FrontTier {
  return FRONT_TIERS.includes(value as FrontTier);
}

/** Auto-assign tiers: first member → primary, rest → cofront. */
export function autoAssignTiers(memberIds: string[]): Record<string, FrontTier> {
  if (memberIds.length === 0) return {};
  const tiers: Record<string, FrontTier> = {};
  memberIds.forEach((id, i) => {
    tiers[id] = i === 0 ? 'primary' : 'cofront';
  });
  return tiers;
}

export function parseMemberTiers(value: string | null | undefined): Record<string, FrontTier> {
  if (!value) return {};
  const parsed = JSON.parse(value);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid member tiers');
  }
  for (const [key, val] of Object.entries(parsed)) {
    if (typeof key !== 'string' || typeof val !== 'string' || !isFrontTier(val)) {
      throw new Error(`Invalid member tier entry: ${key}=${String(val)}`);
    }
  }
  return parsed as Record<string, FrontTier>;
}

export function safeParseMemberTiers(value: string | null | undefined): Record<string, FrontTier> {
  try {
    return parseMemberTiers(value);
  } catch {
    return {};
  }
}

export function serializeMemberTiers(tiers: Record<string, FrontTier>): string {
  return JSON.stringify(tiers);
}

// ---------------------------------------------------------------------------
// Member IDs helpers (existing)
// ---------------------------------------------------------------------------
export type FrontEntryWithMemberIds = Omit<FrontEntry, 'memberIds' | 'memberTiers'> & {
  memberIds: string[];
  memberTiers: Record<string, FrontTier>;
};

export function parseMemberIds(value: string): string[] {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error('Invalid member IDs');
  }
  return parsed;
}

export function safeParseMemberIds(value: string): string[] {
  try {
    return parseMemberIds(value);
  } catch {
    return [];
  }
}

export function serializeMemberIds(memberIds: string[]): string {
  return JSON.stringify(memberIds);
}

/** Combine memberIds and memberTiers into a validated entry shape for API responses. */
export function formatFrontEntry(entry: FrontEntry): FrontEntryWithMemberIds {
  const memberIds = parseMemberIds(entry.memberIds);
  return {
    ...entry,
    memberIds,
    memberTiers: safeParseMemberTiers(entry.memberTiers),
  };
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
