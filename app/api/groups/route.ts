import { db } from '@/lib/db';
import { memberGroups, memberGroupMembers } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';

// GET /api/groups — list all member groups for this system
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const groups = await db.query.memberGroups.findMany({
    where: eq(memberGroups.systemId, auth.systemId),
    orderBy: (g, { asc }) => [asc(g.name)],
  });

  // Count members per group
  const counts = await db
    .select({ groupId: memberGroupMembers.groupId, value: count() })
    .from(memberGroupMembers)
    .groupBy(memberGroupMembers.groupId);

  const countMap = new Map(counts.map((c) => [c.groupId, c.value]));

  const data = groups.map((g) => ({ ...g, memberCount: countMap.get(g.id) ?? 0 }));
  return ok(data);
}

// POST /api/groups — create a group
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return err('name is required');

  const created = await db.insert(memberGroups).values({
    id:          createId(),
    systemId:    auth.systemId,
    name,
    color:       typeof body.color === 'string' ? body.color.trim() || null : null,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    createdAt:   new Date(),
  }).returning();

  revalidatePath('/members');
  revalidatePath('/settings/groups');
  return ok(created[0], 201);
}
