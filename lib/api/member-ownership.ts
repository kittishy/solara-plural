import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';

type MemberIdResult =
  | { ok: true; memberId: string | null }
  | { ok: false; error: string };

type MemberIdsResult =
  | { ok: true; memberIds: string[] }
  | { ok: false; error: string };

function normalizeStringId(value: unknown, fieldName: string): MemberIdResult {
  if (value === null || value === undefined || value === '') {
    return { ok: true, memberId: null };
  }

  if (typeof value !== 'string') {
    return { ok: false, error: `${fieldName} must be a string or null` };
  }

  const memberId = value.trim();
  return { ok: true, memberId: memberId || null };
}

export async function resolveOptionalOwnedMemberId(
  systemId: string,
  value: unknown,
  fieldName = 'memberId',
): Promise<MemberIdResult> {
  const normalized = normalizeStringId(value, fieldName);
  if (!normalized.ok || !normalized.memberId) return normalized;

  const rows = await db.query.members.findMany({
    columns: { id: true },
    where: and(
      eq(members.systemId, systemId),
      inArray(members.id, [normalized.memberId]),
    ),
    limit: 1,
  });

  if (rows.length !== 1) {
    return { ok: false, error: `${fieldName} does not belong to this system` };
  }

  return normalized;
}

export async function resolveOwnedMemberIds(
  systemId: string,
  value: unknown,
  fieldName = 'memberIds',
): Promise<MemberIdsResult> {
  if (value === null || value === undefined) return { ok: true, memberIds: [] };

  if (!Array.isArray(value)) {
    return { ok: false, error: `${fieldName} must be an array` };
  }

  const memberIds: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) {
      return { ok: false, error: `${fieldName} must only include member IDs` };
    }
    const memberId = item.trim();
    if (!memberIds.includes(memberId)) memberIds.push(memberId);
  }

  if (memberIds.length === 0) return { ok: true, memberIds };

  const rows = await db.query.members.findMany({
    columns: { id: true },
    where: and(
      eq(members.systemId, systemId),
      inArray(members.id, memberIds),
    ),
  });

  if (rows.length !== memberIds.length) {
    return { ok: false, error: `${fieldName} includes a member outside this system` };
  }

  return { ok: true, memberIds };
}
