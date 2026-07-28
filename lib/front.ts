import type { FrontEntry } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Front tiers / roles (primary / co-front / co-conscious / background / guest)
//
// Tiers are OPTIONAL: a fronting member may have no role at all. When a member
// has no role, they simply have no entry in the memberTiers map — there is no
// default role assigned automatically.
// ---------------------------------------------------------------------------
export const FRONT_TIERS = ['primary', 'cofront', 'coconscious', 'background', 'guest'] as const;
export type FrontTier = (typeof FRONT_TIERS)[number];

/**
 * Presentation config for each role. Human-readable labels live in i18n
 * (`labelKey` / `descKey`); `label` is only an English fallback for non-React
 * contexts. `color` and `shortLabel` drive the badge styling.
 */
export const TIER_CONFIG: Record<
  FrontTier,
  { label: string; labelKey: string; descKey: string; color: string; shortLabel: string }
> = {
  primary:      { label: 'Primary',      labelKey: 'front.tierPrimary',      descKey: 'front.tierPrimaryDesc',      color: '#8B5CF6', shortLabel: 'P' },
  cofront:      { label: 'Co-front',     labelKey: 'front.tierCofront',      descKey: 'front.tierCofrontDesc',      color: '#34C759', shortLabel: 'CF' },
  coconscious:  { label: 'Co-conscious', labelKey: 'front.tierCoconscious',  descKey: 'front.tierCoconsciousDesc',  color: '#5AC8FA', shortLabel: 'CC' },
  background:   { label: 'Background',   labelKey: 'front.tierBackground',   descKey: 'front.tierBackgroundDesc',   color: '#8E8E93', shortLabel: 'BG' },
  guest:        { label: 'Guest',        labelKey: 'front.tierGuest',        descKey: 'front.tierGuestDesc',        color: '#FF9F0A', shortLabel: 'G' },
};

/** Order in which roles are presented in pickers. */
export const TIER_ORDER: FrontTier[] = ['primary', 'cofront', 'coconscious', 'background', 'guest'];

export function isFrontTier(value: string): value is FrontTier {
  return FRONT_TIERS.includes(value as FrontTier);
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

export function createFrontSnapshotSignature(front: {
  id: string;
  memberIds: string[];
  memberTiers?: Record<string, FrontTier> | null;
  note?: string | null;
  startedAt: string | number | Date;
}): string {
  const canonical = JSON.stringify([
    front.id,
    front.memberIds,
    Object.entries(front.memberTiers ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    front.note?.trim() || null,
    new Date(front.startedAt).toISOString(),
  ]);
  // Fixed-size compare-and-swap token. This is not an authentication secret;
  // four independently seeded FNV-1a lanes keep the request header compact
  // even for hundreds of members while making accidental collisions negligible.
  const lanes = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  for (let index = 0; index < canonical.length; index += 1) {
    const code = canonical.charCodeAt(index);
    for (let lane = 0; lane < lanes.length; lane += 1) {
      lanes[lane] = Math.imul(lanes[lane] ^ code, 0x01000193);
    }
  }
  return `v1-${lanes
    .map((value) => (value >>> 0).toString(16).padStart(8, '0'))
    .join('')}`;
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
