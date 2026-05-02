import { db } from '@/lib/db';
import { frontEntries, members } from '@/lib/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { parseMemberIds, serializeMemberIds } from '@/lib/front';
import { revalidatePath } from 'next/cache';

// GET /api/front — get current active front entry
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const current = await db.query.frontEntries.findFirst({
    where: and(
      eq(frontEntries.systemId, auth.systemId),
      isNull(frontEntries.endedAt)
    ),
  });

  if (!current) return ok(null);
  return ok(
    { ...current, memberIds: parseMemberIds(current.memberIds) },
    200,
    {
      headers: {
        'Cache-Control': 'private, max-age=0, s-maxage=15, stale-while-revalidate=30',
      },
    }
  );
}

// POST /api/front — start a new front entry (ends any current one first)
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { memberIds, note } = body;

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return err('memberIds must be a non-empty array');
  }

  if (!memberIds.every((memberId) => typeof memberId === 'string' && memberId.trim())) {
    return err('memberIds must only include member IDs');
  }

  const uniqueMemberIds = Array.from(new Set(memberIds.map((memberId) => memberId.trim())));
  const availableMembers = await db.query.members.findMany({
    where: and(eq(members.systemId, auth.systemId), inArray(members.id, uniqueMemberIds)),
  });

  if (availableMembers.length !== uniqueMemberIds.length) {
    return err('One or more memberIds are invalid');
  }

  const now = new Date();

  // End any currently active front entry
  await db.update(frontEntries)
    .set({ endedAt: now })
    .where(and(
      eq(frontEntries.systemId, auth.systemId),
      isNull(frontEntries.endedAt)
    ));

  // Create new front entry
  const newEntry = await db.insert(frontEntries).values({
    id:        createId(),
    systemId:  auth.systemId,
    memberIds: serializeMemberIds(uniqueMemberIds),
    startedAt: now,
    endedAt:   null,
    note:      note ?? null,
    createdAt: now,
  }).returning();

  revalidatePath('/');
  revalidatePath('/front');
  revalidatePath('/members');
  revalidatePath('/front/history');

  return ok({ ...newEntry[0], memberIds: uniqueMemberIds }, 201);
}

// DELETE /api/front — end the current front entry
export async function DELETE() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const updated = await db.update(frontEntries)
    .set({ endedAt: new Date() })
    .where(and(
      eq(frontEntries.systemId, auth.systemId),
      isNull(frontEntries.endedAt)
    ))
    .returning();

  if (!updated.length) return err('No active front entry', 404);
  revalidatePath('/');
  revalidatePath('/front');
  revalidatePath('/members');
  revalidatePath('/front/history');
  return ok({ ended: true, entry: updated[0] });
}
