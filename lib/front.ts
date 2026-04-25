import type { FrontEntry } from '@/lib/db/schema';

export type FrontEntryWithMemberIds = Omit<FrontEntry, 'memberIds'> & {
  memberIds: string[];
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
