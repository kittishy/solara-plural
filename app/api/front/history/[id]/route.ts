import { db } from '@/lib/db';
import { frontEntries, members } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { parseDatetimeLocalValue, serializeFrontMembers, getMemberIds, type FrontMember, type FrontTier } from '@/lib/front';
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

  const startedAt = typeof body.startedAt === 'string' ? parseDatetimeLocalValue(body.startedAt) : null;
  const endedAt = typeof body.endedAt === 'string' ? parseDatetimeLocalValue(body.endedAt) : null;
  const note = typeof body.note === 'string' ? body.note.trim() : '';

  if (!startedAt || !endedAt) return err('startedAt and endedAt are required');
  if (endedAt < startedAt) return err('endedAt must be after startedAt');

  // Accept both new format (members[]) and legacy format (memberIds[]).
  let incomingMembers: FrontMember[];
  if (Array.isArray(body.members) && body.members.length > 0) {
    incomingMembers = (body.members as Array<Record<string, unknown>>).map((m) => {
      const t = m.tier;
      const tier: FrontTier = t === 'co-front' || t === 'co-conscious' ? t : 'primary';
      return { memberId: String(m.memberId), tier };
    });
  } else if (Array.isArray(body.memberIds) && body.memberIds.length > 0) {
    incomingMembers = (body.memberIds as string[]).map((id) => ({ memberId: id, tier: 'primary' as FrontTier }));
  } else {
    return err('members must be a non-empty array');
  }

  const memberIds = getMemberIds(incomingMembers);

  const availableMembers = await db.query.members.findMany({
    where: and(eq(members.systemId, auth.systemId), inArray(members.id, memberIds)),
  });

  if (availableMembers.length !== memberIds.length) {
    return err('One or more memberIds are invalid');
  }

  const updated = await db.update(frontEntries)
    .set({
      memberIds: serializeFrontMembers(incomingMembers),
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

  return ok({ ...updated[0], members: incomingMembers, memberIds });
}
