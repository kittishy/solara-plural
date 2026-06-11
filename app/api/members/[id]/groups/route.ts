import { db } from '@/lib/db';
import { members, memberGroups, memberGroupMembers } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

// PUT /api/members/[id]/groups — replace this member's group memberships
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const member = await db.query.members.findFirst({
    columns: { id: true },
    where: and(eq(members.id, id), eq(members.systemId, auth.systemId)),
  });
  if (!member) return err('Member not found', 404);

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  if (!Array.isArray(body.groupIds)) return err('groupIds must be an array');

  const groupIds: string[] = (body.groupIds as unknown[])
    .filter((v): v is string => typeof v === 'string' && Boolean(v.trim()))
    .map((v) => v.trim());

  // Validate that all group IDs belong to this system
  if (groupIds.length > 0) {
    const owned = await db.query.memberGroups.findMany({
      columns: { id: true },
      where: and(eq(memberGroups.systemId, auth.systemId), inArray(memberGroups.id, groupIds)),
    });
    if (owned.length !== groupIds.length) return err('One or more groupIds are invalid');
  }

  // Replace: delete all current memberships for this member, then insert new ones
  await db.delete(memberGroupMembers).where(eq(memberGroupMembers.memberId, id));

  if (groupIds.length > 0) {
    await db.insert(memberGroupMembers).values(
      groupIds.map((groupId) => ({ groupId, memberId: id }))
    );
  }

  revalidatePath('/members');
  revalidatePath(`/members/${id}`);
  return ok({ memberId: id, groupIds });
}
