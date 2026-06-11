import { db } from '@/lib/db';
import { memberGroups, memberGroupMembers, members } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/[id]/members — list member IDs in this group
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const group = await db.query.memberGroups.findFirst({
    where: and(eq(memberGroups.id, id), eq(memberGroups.systemId, auth.systemId)),
  });
  if (!group) return err('Group not found', 404);

  const rows = await db.query.memberGroupMembers.findMany({
    where: eq(memberGroupMembers.groupId, id),
  });

  return ok(rows.map((r) => r.memberId));
}

// PUT /api/groups/[id]/members — replace the full member list for a group
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const group = await db.query.memberGroups.findFirst({
    where: and(eq(memberGroups.id, id), eq(memberGroups.systemId, auth.systemId)),
  });
  if (!group) return err('Group not found', 404);

  const body = parsed.data;
  if (!Array.isArray(body.memberIds)) return err('memberIds must be an array');

  const memberIds: string[] = (body.memberIds as unknown[])
    .filter((v): v is string => typeof v === 'string' && Boolean(v.trim()))
    .map((v) => v.trim());

  // Validate that all member IDs belong to this system
  if (memberIds.length > 0) {
    const owned = await db.query.members.findMany({
      columns: { id: true },
      where: and(eq(members.systemId, auth.systemId), inArray(members.id, memberIds)),
    });
    if (owned.length !== memberIds.length) return err('One or more memberIds are invalid');
  }

  // Replace membership: delete all then insert new
  await db.delete(memberGroupMembers).where(eq(memberGroupMembers.groupId, id));

  if (memberIds.length > 0) {
    await db.insert(memberGroupMembers).values(
      memberIds.map((memberId) => ({ groupId: id, memberId }))
    );
  }

  revalidatePath('/members');
  return ok({ groupId: id, memberIds });
}
