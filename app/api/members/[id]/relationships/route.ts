import { db } from '@/lib/db';
import { memberRelationships, members } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

// GET /api/members/[id]/relationships — all relationships where this member is from or to
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const member = await db.query.members.findFirst({
    columns: { id: true },
    where: and(eq(members.id, id), eq(members.systemId, auth.systemId)),
  });
  if (!member) return err('Member not found', 404);

  const rows = await db.query.memberRelationships.findMany({
    where: and(
      eq(memberRelationships.systemId, auth.systemId),
      or(eq(memberRelationships.fromMemberId, id), eq(memberRelationships.toMemberId, id))
    ),
    orderBy: (r, { asc }) => [asc(r.createdAt)],
  });

  return ok(rows);
}

// POST /api/members/[id]/relationships — create a relationship from this member
export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const fromMember = await db.query.members.findFirst({
    columns: { id: true },
    where: and(eq(members.id, id), eq(members.systemId, auth.systemId)),
  });
  if (!fromMember) return err('Member not found', 404);

  const toMemberId = typeof body.toMemberId === 'string' ? body.toMemberId.trim() : '';
  const relationshipType = typeof body.relationshipType === 'string' ? body.relationshipType.trim() : '';

  if (!toMemberId) return err('toMemberId is required');
  if (!relationshipType) return err('relationshipType is required');
  if (toMemberId === id) return err('A member cannot have a relationship with themselves');

  const toMember = await db.query.members.findFirst({
    columns: { id: true },
    where: and(eq(members.id, toMemberId), eq(members.systemId, auth.systemId)),
  });
  if (!toMember) return err('Target member not found', 404);

  const created = await db.insert(memberRelationships).values({
    id:               createId(),
    systemId:         auth.systemId,
    fromMemberId:     id,
    toMemberId,
    relationshipType,
    notes:            typeof body.notes === 'string' ? body.notes.trim() || null : null,
    createdAt:        new Date(),
  }).returning();

  revalidatePath(`/members/${id}`);
  revalidatePath(`/members/${toMemberId}`);
  return ok(created[0], 201);
}
