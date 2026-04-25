import { db } from '@/lib/db';
import { frontEntries, members } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import { parseDatetimeLocalValue, serializeMemberIds } from '@/lib/front';
import { revalidatePath } from 'next/cache';

type RouteContext = {
  params: { id: string };
};

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = params;
  const existing = await db.query.frontEntries.findFirst({
    where: and(eq(frontEntries.id, id), eq(frontEntries.systemId, auth.systemId)),
  });

  if (!existing) return err('Front entry not found', 404);

  const body = await request.json().catch(() => null);
  if (!body) return err('Invalid JSON body');

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

  const updated = await db.update(frontEntries)
    .set({
      memberIds: serializeMemberIds(memberIds),
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

  return ok({ ...updated[0], memberIds });
}
