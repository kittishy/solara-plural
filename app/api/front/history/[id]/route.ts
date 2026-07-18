import { db } from '@/lib/db';
import { frontEntries, members } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { parseDatetimeLocalValue, safeParseMemberTiers, serializeMemberIds, serializeMemberTiers, isFrontTier, FRONT_TIERS } from '@/lib/front';
import type { FrontTier } from '@/lib/front';
import { revalidatePath } from 'next/cache';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const existing = await db.query.frontEntries.findFirst({
    where: and(eq(frontEntries.id, id), eq(frontEntries.systemId, auth.systemId)),
  });

  if (!existing) return err('Front entry not found', 404);

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const memberIds = Array.isArray(body.memberIds) ? body.memberIds : null;
  const startedAt = typeof body.startedAt === 'string' ? parseDatetimeLocalValue(body.startedAt) : null;
  const endedAt = typeof body.endedAt === 'string' ? parseDatetimeLocalValue(body.endedAt) : null;
  const note = typeof body.note === 'string' ? body.note.trim() : '';

  if (!memberIds || memberIds.length === 0) return err('memberIds must be a non-empty array');
  if (!startedAt || !endedAt) return err('startedAt and endedAt are required');
  if (endedAt < startedAt) return err('endedAt must be after startedAt');

  const availableMembers = await db.query.members.findMany({
    where: and(eq(members.systemId, auth.systemId), inArray(members.id, memberIds)),
  });

  if (availableMembers.length !== memberIds.length) {
    return err('One or more memberIds are invalid');
  }

  // Validate optional memberTiers. Roles are optional per-member.
  let memberTiers: Record<string, FrontTier> | null = null;
  if (body.memberTiers !== undefined && body.memberTiers !== null) {
    if (typeof body.memberTiers !== 'object' || Array.isArray(body.memberTiers)) {
      return err('memberTiers must be an object mapping member IDs to tier values');
    }
    const tiers = body.memberTiers as Record<string, string>;
    for (const [memberId, tier] of Object.entries(tiers)) {
      if (!memberIds.includes(memberId)) {
        return err(`memberTiers references member "${memberId}" not in memberIds`);
      }
      if (!isFrontTier(tier)) {
        return err(`Invalid tier "${tier}" for member "${memberId}". Must be one of: ${FRONT_TIERS.join(', ')}`);
      }
    }
    memberTiers = tiers as Record<string, FrontTier>;
  }

  const resolvedTiers = memberTiers ?? {};

  const updated = await db.update(frontEntries)
    .set({
      memberIds: serializeMemberIds(memberIds),
      memberTiers: serializeMemberTiers(resolvedTiers),
      startedAt,
      endedAt,
      note: note || null,
    })
    .where(and(eq(frontEntries.id, id), eq(frontEntries.systemId, auth.systemId)))
    .returning();

  revalidatePath('/');
  revalidatePath('/front');
  revalidatePath('/members');
  revalidatePath('/front/history');

  return ok({ ...updated[0], memberIds, memberTiers: resolvedTiers });
}
